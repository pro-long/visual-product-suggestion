# Visual Product Matcher

## Overview

Visual Product Matcher is a simple web application that helps users find visually similar products by uploading an image or providing an image URL. The backend uses image tagging (via the Imagga API) and a lightweight similarity scoring to match the uploaded image against a local database of products, returning suggestions based on visual tags. The frontend gives users a modern and minimalist interface to upload images, set similarity thresholds, view previews, and see matched products.


## Deployment

This project is deployed on **Render** using its free tier. The application consists of two separate services:

-   **Backend**: A Python Flask application deployed as a **Web Service**.
-   **Frontend**: A React application deployed as a **Static Site**.

You can access the live application here: [Visual Product Matcher](https://visual-product-suggestion-1.onrender.com/)

### Important Note on Free Tier Usage

This deployment uses Render's free plan, which has a specific behavior to be aware of:

-   **Server Sleeps on Inactivity**: If the backend service does not receive any requests for **15 minutes**, it will automatically "spin down" or go to sleep to conserve resources.

-   **Automatic Wake-Up and "Cold Start"**: When a new request is sent to the backend after it has gone to sleep, Render will automatically wake it up. This first request will take longer than usual (typically **30-90 seconds**) as the server needs to start up again. This is known as a "cold start".

-   **Normal Performance After Wake-Up**: Once the server is awake, all subsequent requests will be fast and perform as expected until the next 15-minute period of inactivity.

**In summary:** If you are the first user to access the app after a while, please be patient as the initial image match may take a minute to process.

To mitigate this, an external [**cron job**](https://cron-job.org/en/) is used. This service sends a `GET` request to the server every 15 minutes to keep it "warm" and responsive, significantly reducing the likelihood of a user experiencing a cold start.

If the application shows an error message like "Falied to fetch" or any error message related to API, (**Click here**)[https://visual-product-suggestion.onrender.com/health] to start the server the result should be ```{"status":"ok"}```. We are just sending a GET request manually which will wake the server up.    

## How it Works

1. **User Input:**
   - The user can upload an image (max 5MB) or enter a direct image URL. Only one input type can be used at a time.

2. **Image Processing:**
   - The backend receives the image or downloads the image from the provided URL. It then sends the image to the Imagga API for automatic tagging (top-5 tags).

3. **Similarity Scoring:**
   - The backend compares the user's tags with all product tags in the local database. For each matching tag, it adds the tag's confidence score. The sum is then divided by 5 (to normalize). Products exceeding the user-set "similarity threshold" are returned as results.

4. **Results Display:**
   - The frontend displays the product matches as cards in a responsive grid, ordered by similarity. Users also see a live preview of their input image and the remaining Imagga API call quota.

## Project Structure

- `App.js` & `App.css` -- React frontend for user interaction, image upload, preview, and result display.
- `app.py` -- Flask backend REST API for handling image upload/URL, calling Imagga, and calculating/tagging matches.
- `products_with_cloudinary.json` -- local database should be placed in `visual-product-suggestion/backend` (Check Dataset Creation for generating this file).

## Database Creation

To create or update the product database file, a folder named `DB_creation_data` is provided in this repository.
- Inside it, find the Python code in `DB_creation_data/DB_creation.ipynb` for generating `products_with_cloudinary.json` using product images and Imagga's tagging API.
- There are 61 products images available in `DB_creation_data/vis-suggestion/`, which were also used in this project.
- This code requires API keys for both Imagga and Cloudinary.

> [Imagga](https://imagga.com/): First 100 requests are free
>
> [Cloudinary](https://cloudinary.com/): Free for storing limited images

- **Before running the script/notebook:**
  - Set your Imagga API key/secret and Cloudinary credentials in the code or relevant `.env` file.
- Product images for the database are also included in this folder, so you can recreate or expand the dataset as needed.

### Database Skeleton Structure

This is the general structure of the `products_with_cloudinary.json` file, showing the expected keys and data types for each section.

```
{
  "database_info": {
    "total_products": 0,
    "categories": 0,
    "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff",
    "description": "A description of the database.",
    "last_processed": "YYYY-MM-DDTHH:MM:SS.ffffff",
    "processed_count": 0
  },
  "category_mapping": {
    "main_category_name": [
      "sub_category_1",
      "sub_category_2"
    ]
  },
  "products": [
    {
      "id": 1,
      "name": "Product Name",
      "category": "sub_category_1",
      "main_category": "main_category_name",
      "image_path": "/path/to/local/image.jpg",
      "description": "A description of the product.",
      "price": 0.00,
      "brand": "Product Brand",
      "imagga_tags": [
        {
          "tag": "tag_name",
          "confidence": 100.00
        }
      ],
      "confidence_scores": "100.00,99.99,...",
      "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff",
      "primary_tags": "tag_name,another_tag,...",
      "image_url": "https://url.to/live/image.jpg"
    }
  ]
}
```

## How to Run the Project (locally)

1. **Backend:**
   - Ensure Python, Flask, Flask-CORS, and requests are installed.
   - Set up Imagga API keys in your environment or `.env` file.
   - Place the products JSON dataset in the backend directory.
   - Run:
     ```
     python app.py
     ```

2. **Frontend:**
   - Ensure Node.js and npm are installed.
   - Place `App.js` and `App.css` in your React app's `src/` directory.
   - Install React requirements:
     ```
     npm install
     ```
   - Start the server:
     ```
     npm start
     ```

## What if the Database Was in Firestore?

If the product database was moved from `products_with_cloudinary.json` to [Google Firestore](https://firebase.google.com/docs/firestore):

- **Backend:**
  - You would integrate the Firebase Admin SDK in `app.py`.
  - Product lookup and filtering would be performed using Firestore queries instead of reading the JSON file into memory.
  - Tag data for each product would be stored in Firestore as fields/documents within a "products" collection.
  - You could enable real-time updates, larger datasets, and easier management of product/catalog data.

- **Benefits:**
  - Scale to many more products.
  - Update product entries without redeploying or editing files.
  - Share the same dataset across multiple frontends or collaborators.

- **Frontend:**
  - No major changes needed; all Firestore interaction is handled in the backend API.

- **Considerations:**
  - Read performance would depend on Firestore index/query design.
  - Costs and access security would be managed by Firestore/Firebase settings.
