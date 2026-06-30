# Production Deployment Guide: Ubuntu VPS + Vercel

This guide provides step-by-step instructions for deploying the **AI-Powered Geospatial Cloud Removal and Reconstruction Platform** to production.

---

## 1. System Architecture

```text
  Internet (Client)
        │
        ▼
   [ Vercel ] (Next.js Frontend / Static Webpages)
        │
      HTTPS (Rest APIs)
        │
        ▼
   [ Nginx ] (Reverse Proxy + SSL Termination / Ubuntu VPS)
        │
     Loopback (Port 8000)
        │
        ▼
[ Docker Container ] (FastAPI Backend / Python 3.12)
   ├── SQLite Database (Persistent Volume)
   ├── datasets/ Storage Directory (Persistent Host Volume)
   └── Google Earth Engine SDK (Server Authenticated)
```

---

## 2. Part A: Backend Deployment (Ubuntu VPS)

### Step 1: Install System Dependencies
Update system packages and install Docker, Docker Compose, Nginx, and Certbot:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx
```

Ensure Docker runs on boot:
```bash
sudo systemctl enable --now docker
```

### Step 2: Set Up Directory Structure and Demo Data
1. Clone the project repository on the VPS:
   ```bash
   git clone https://github.com/your-username/isro-bah26.git /opt/isro-platform
   cd /opt/isro-platform
   ```

2. Copy or transfer the pre-seeded **4 GB demo datasets** to the persistent storage directory on the host VPS:
   ```bash
   # Ensure host datasets directory exists
   mkdir -p /opt/isro-platform/datasets/demo
   
   # Confirm that LISS-IV demo directories contain the band files, e.g.:
   # /opt/isro-platform/datasets/demo/scene1/band2.tif
   # /opt/isro-platform/datasets/demo/scene1/band_meta.txt
   ```

### Step 3: Google Earth Engine Service Account Setup
The GEE provider runs headless and authenticates using a Google Cloud Service Account.
1. Download your service account private key JSON file from Google Cloud Console.
2. Place this file securely on the VPS (e.g. at `/opt/isro-platform/backend/credentials.json`).
3. Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` inside your backend configuration file to point to this path inside the container:
   `/app/credentials.json`
4. Mount the key file inside the container by adding it to the backend volumes section in `docker-compose.prod.yml`:
   ```yaml
   volumes:
     - ./datasets:/datasets
     - ./backend/credentials.json:/app/credentials.json
     - backend_db:/app/data
   ```

### Step 4: Configure Environment Variables
Copy the env template and update production values:
```bash
cp /opt/isro-platform/backend/.env.example /opt/isro-platform/backend/.env
nano /opt/isro-platform/backend/.env
```

Set the following variables inside `/opt/isro-platform/backend/.env`:
```ini
# Persistent DB path inside the Docker named volume
SQLALCHEMY_DATABASE_URL=sqlite:////app/data/platform.db

# CORS configurations matching your target Vercel domain name
BACKEND_CORS_ORIGINS=["https://isro-platform.vercel.app"]

# Path to the mounted Earth Engine credentials JSON
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json

# Buffer settings (in KM) for Earth Engine catalog searches
GEE_BUFFER_KM=50.0
```

### Step 5: Start the Container Services
Deploy the containers in detached production mode:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Verify that the backend is up and running healthy:
```bash
docker ps
curl http://localhost:8000/health
```

### Step 6: Configure Nginx & SSL Certificate
1. Copy the Nginx server block configuration:
   ```bash
   sudo cp /opt/isro-platform/nginx.conf /etc/nginx/sites-available/isro-platform
   ```
2. Edit `/etc/nginx/sites-available/isro-platform` and replace `api.yourdomain.com` with your subdomain or server IP.
3. Link the site block to enable it and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/isro-platform /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```
4. Obtain a Let's Encrypt SSL certificate dynamically:
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

## 3. Part B: Frontend Deployment (Vercel)

### Step 1: Push Frontend to GitHub
Ensure the `frontend` folder is pushed to your GitHub/GitLab repository.

### Step 2: Configure Project on Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
2. Select your repository.
3. Configure the **Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Add **Environment Variables**:
   - Add `NEXT_PUBLIC_API_URL` and set its value to your secure VPS backend endpoint (e.g. `https://api.yourdomain.com`).
5. Click **Deploy**.

---

## 4. Verification & Testing

To confirm that the production deployment was fully successful, verify the following endpoints:

1. **Backend Health Check**:
   `GET https://api.yourdomain.com/health`
   - Expect a `200 OK` status.
   - Response payload should indicate `database`, `storage`, and `demo_datasets` checks are `"healthy"`.

2. **Temporal Intelligence & GEE**:
   - Connect to the frontend web application.
   - Register a demo scene.
   - Run the Earth Engine Discovery step.
   - Verify that Google Earth Engine responds immediately with metadata cards without requesting developer credentials.
