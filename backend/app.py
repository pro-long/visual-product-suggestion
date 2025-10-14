import io
import os
import json
import mimetypes
import requests
from urllib.parse import urlparse
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Load JSON database
DB_PATH = os.getenv("JSON_DB_PATH", "products_with_cloudinary.json")
with open(DB_PATH, "r", encoding="utf-8") as f:
    db = json.load(f)
PRODUCTS = db.get("products", [])

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", os.getenv("FRONTEND_URL","https://*.onrender.com")])

# Imagga service
class ImaggaService:
    def __init__(self, api_key, api_secret):
        self.endpoint = "https://api.imagga.com/v2/tags"
        self.auth = (api_key, api_secret)

    def get_tags(self, image_file):
        if hasattr(image_file, "stream"):
            file_obj = image_file.stream
            filename = image_file.filename
            content_type = image_file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        else:
            file_obj = image_file
            filename = getattr(image_file, "name", "upload.jpg")
            content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        file_obj.seek(0)
        files = {"image": (filename, file_obj, content_type)}
        resp = requests.post(self.endpoint, auth=self.auth, files=files)
        resp.raise_for_status()
        tags = resp.json().get("result", {}).get("tags", [])
        remaining = resp.headers.get("Monthly-Limit-Remaining")
        # remaining = int(remaining) if remaining and remaining.isdigit() else None
        if remaining and remaining.isdigit():
            remaining = int(remaining)
        else:
            remaining = None

        top_tags = []
        for tag in tags[:5]:
            tag_name = tag["tag"]["en"]
            confidence = round(tag["confidence"], 2)
            top_tags.append({
                "tag": tag_name,
                "confidence": confidence
            })
        
        return top_tags, remaining

imagga = ImaggaService(
    api_key=os.getenv("IMAGGA_API_KEY"),
    api_secret=os.getenv("IMAGGA_API_SECRET")
)

def compute_similarity(user_tags, product_tags):
    # Map product tag -> confidence
    prod_conf = {}
    for tag in product_tags:
        tag_name = tag["tag"]
        confidence = tag["confidence"]
        prod_conf[tag_name] = confidence
    #----------------

    total = 0
    for ut in user_tags:
        total += prod_conf.get(ut["tag"], 0)
    # Normalize by 5 (top 5 tags)
    return round(total / 5, 2)

@app.route("/api/match", methods=["GET", "POST"])
def match():
    file = request.files.get("image")
    image_url = request.values.get("image_url")

    if file and image_url:
        return jsonify({"error": "Provide only one input: file OR image_url"}), 400
    if not file and not image_url:
        return jsonify({"error": "No image provided"}), 400

    # Prepare input_file for tagging
    if image_url:
        try:
            parsed_url = urlparse(image_url)
            path = parsed_url.path
            if not path.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                return jsonify({"error": "URL must end with .jpg, .jpeg, .png, or .webp"}), 400
            
            r = requests.get(image_url, timeout=6)
            r.raise_for_status()
            buf = io.BytesIO(r.content)
            buf.name = os.path.basename(image_url)
            input_file = buf
        except Exception as e:
            return jsonify({"error": f"Failed to fetch URL image: {e}"}), 400
    else:
        input_file = file

    try:
        tags, rate_limit_remaining = imagga.get_tags(input_file)
    except Exception as e:
        return jsonify({"error": f"Tagging failed: {e}"}), 500
    
    # Compute similarity across all products
    threshold = float(request.args.get("threshold", 30))
    scored = []
    for prod in PRODUCTS:
        prod_tags = prod.get("imagga_tags", [])
        score = compute_similarity(tags, prod_tags)
        if score >= threshold:
            entry = prod.copy()
            entry["similarity_score"] = score
            scored.append(entry)

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    limit = int(request.args.get("limit", 20))
    return jsonify({"tags": tags, "matches": scored[:limit], "rate_limit_remaining": rate_limit_remaining,})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)