# Visual Product Matcher

## Overview

Visual Product Matcher is a simple web application that helps users find visually similar products by uploading an image or providing an image URL. The backend uses image tagging (via the Imagga API) and a lightweight similarity scoring to match the uploaded image against a local database of products, returning suggestions based on visual tags. The frontend gives users a modern and minimalist interface to upload images, set similarity thresholds, view previews, and see matched products.

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

## Dataset Creation

To create or update the product database file, a folder named `DB_creation_data` is provided in this repository.
- Inside it, find the Python code in `DB_creation_data/vis-suggestion/DB_creation.ipynb` for generating `products_with_cloudinary.json` using product images and Imagga's tagging API.
- This code requires API keys for both Imagga and Cloudinary.

> [Imagga](https://imagga.com/): First 100 requests are free
> [Cloudinary](https://cloudinary.com/): Free for storing limited images

- **Before running the script/notebook:**
  - Set your Imagga API key/secret and Cloudinary credentials in the code or relevant `.env` file.
- Product images for the database are also included in this folder, so you can recreate or expand the dataset as needed.

## How to Run the Project

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

## Summary

This project demonstrates visual similarity search using image auto-tagging and confidence matching, starting from a simple local JSON product DB, but is easily scalable to Firestore for production-scale catalogs.
