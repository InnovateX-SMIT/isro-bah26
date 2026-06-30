# Google Earth Engine Service Account Credentials

Place your Google Earth Engine Service Account private key JSON file in this directory.

## Requirements

1. **Filename**: The default configuration searches for:
   ```
   gee-service-account.json
   ```
2. **Setup**:
   - In production, set the environment variable:
     ```ini
     GEE_SERVICE_ACCOUNT_KEY=backend/credentials/gee-service-account.json
     ```
   - Ensure the JSON file contains the standard Service Account private key schema, including the `"client_email"` and `"private_key"` fields.

## Security Warning

**DO NOT COMMIT THIS FILE OR ANY OTHER PRIVATE KEYS TO GIT.**
The `.gitignore` rules in this project are configured to automatically ignore all `*.json` files placed in this directory to prevent accidental leaks.
