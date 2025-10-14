import React, { useState, useRef, useEffect } from "react";
import "./App.css"; // Import the stylesheet

function App() {
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewSrc, setPreviewSrc] = useState(null);
  const [matches, setMatches] = useState([]);
  const [rateLimitRemaining, setRateLimitRemaining] = useState("-");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(30);
  const fileInputRef = useRef();
  const previewUrlRef = useRef(null);
  const MAX_SIZE_MB = 5;
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (imageFile) {
      const newUrl = URL.createObjectURL(imageFile);
      previewUrlRef.current = newUrl;
      setPreviewSrc(newUrl);
    } else {
      setPreviewSrc(null);
    }
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [imageFile]);

  useEffect(() => {
    if (imageFile) return;
    const err = validateImageUrl(imageUrl);
    setPreviewSrc(err ? null : imageUrl);
  }, [imageUrl, imageFile]);

  function validateFile(file) {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return "Only JPG, JPEG, PNG, and WEBP images are allowed.";
    }
    if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
      return `File size must be less than ${MAX_SIZE_MB}MB.`;
    }
    return "";
  }

  function validateImageUrl(url) {
    try {
      const parsed = new URL(url);
      // By using parsed.pathname, we ignore query parameters
      return /\.(jpe?g|png|webp)$/i.test(parsed.pathname)
        ? ""
        : "URL must point to an image file (jpg, png, webp).";
    } catch {
      return "Invalid URL format.";
    }
  }


  const handleFileChange = (e) => {
    setErrorMsg("");
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      return;
    }
    const error = validateFile(file);
    if (error) {
      setErrorMsg(error);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImageFile(file);
  };

  const handleUrlChange = (e) => {
    setErrorMsg("");
    setImageUrl(e.target.value);
  };

  const clearFile = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreviewSrc(null);
  };

  const clearUrl = () => {
    setImageUrl("");
    setPreviewSrc(null);
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    setMatches([]);
    if (imageFile && imageUrl) {
      setErrorMsg(
        "Please remove either the uploaded file or the image URL before submitting."
      );
      return;
    }
    if (!imageFile && !imageUrl) {
      setErrorMsg("Please upload an image file or enter an image URL.");
      return;
    }
    if (imageUrl) {
      const err = validateImageUrl(imageUrl);
      if (err) {
        setErrorMsg(err);
        return;
      }
    }
    setLoading(true);
    try {
      let response;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        response = await fetch(
          `${API_BASE}/api/match?threshold=${similarityThreshold}`,
          {
            method: "POST",
            body: formData,
          }
        );
      } else {
        response = await fetch(
          `${API_BASE}/api/match?threshold=${similarityThreshold}&image_url=${encodeURIComponent(
            imageUrl
          )}`
        );
      }
      if (!response.ok) {
        let errorText = `API error: ${response.status} ${response.statusText}`;
        try {
          const responseText = await response.text();
          if (responseText.includes("{")) {
            errorText = JSON.parse(responseText).error || errorText;
          }
        } catch {}
        throw new Error(errorText);
      }
      const data = await response.json();
      setMatches(data.matches || []);
      setRateLimitRemaining(data.rate_limit_remaining);
    } catch (err) {
      setErrorMsg(
        err.message || "Unexpected error occurred. Backend may be down."
      );
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="header">Visual Product Matcher</h1>

      <div className="input-section">
        <div>
          <label className="label">Upload Image File (Max 5MB)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={!!imageUrl}
            className="input"
          />
          {imageFile && (
            <button onClick={clearFile} className="remove-button">
              Remove
            </button>
          )}
        </div>

        <div style={{ textAlign: "center", margin: "1rem 0", color: "#888" }}>
          OR
        </div>

        <div>
          <label className="label">Enter Image URL</label>
          <input
            type="text"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={handleUrlChange}
            className="input"
            disabled={!!imageFile}
          />
          {imageUrl && (
            <button onClick={clearUrl} className="remove-button">
              Remove
            </button>
          )}
        </div>
      </div>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {previewSrc && (
        <div className="preview-container">
          <img src={previewSrc} alt="Preview" className="preview-image" />
        </div>
      )}

      <div className="slider-container">
        <label className="label">
          Similarity Threshold: {similarityThreshold}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={similarityThreshold}
          onChange={(e) => setSimilarityThreshold(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || (imageFile && imageUrl)}
        className="button"
      >
        {loading ? "Matching..." : "Find Matches"}
      </button>

      {rateLimitRemaining !== null && (
        <div className="rate-limit">
          Imagga API Calls Left: {rateLimitRemaining}
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 className="header" style={{ fontSize: "1.5rem" }}>
            Matching Products
          </h2>
          <div className="results-grid">
            {matches.map((product) => (
              <div key={product.id} className="result-card">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="result-card-image"
                />
                <h4>{product.name}</h4>
                <p>Similarity: {product.similarity_score}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default App;