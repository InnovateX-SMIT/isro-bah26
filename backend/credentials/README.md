# Google Earth Engine Credentials Setup

This directory is configured to hold the authentication keys required to connect to Google Earth Engine.

You can authenticate the backend using **Option A (Service Account)** or **Option B (Reusing your local Owner/User Credentials)**.

---

## Option A: Using a GEE Service Account (Recommended for Production)

1. Download your Service Account private key JSON file from the GCP Console.
2. Place the file in this directory and name it:
   ```
   gee-service-account.json
   ```
3. Set the environment variable inside your backend `.env`:
   ```ini
   GEE_SERVICE_ACCOUNT_KEY=backend/credentials/gee-service-account.json
   ```

*Note: Ensure your Service Account email has been granted the **Service Usage Consumer** and **Earth Engine Resource Viewer** (`roles/earthengine.viewer`) roles inside the Google Cloud Project.*

---

## Option B: Reusing your Owner/User Credentials (easiest for private VPS / testing)

If you have already run `earthengine authenticate` on your local laptop, you can copy your authenticated session token directly to the backend:

1. Locate the Earth Engine credentials file on your local machine:
   - **Windows**: `C:\Users\<YourUsername>\.config\earthengine\credentials`
   - **macOS/Linux**: `~/.config/earthengine/credentials`
2. Copy this file (without any file extension) directly into this directory:
   ```
   backend/credentials/credentials
   ```
3. Make sure the container mounts this directory to `/root/.config/earthengine` (this is configured by default in the production docker compose).
4. Remove or leave the `GEE_SERVICE_ACCOUNT_KEY` environment variable empty. The backend will automatically discover the credentials file and run GEE calls under your owner account!

---

## Security Warning

**DO NOT COMMIT THIS FILE OR ANY OTHER PRIVATE KEYS TO GIT.**
The `.gitignore` rules in this project ignore the contents of this folder to prevent leaks.
