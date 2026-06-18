# AI-Powered Geospatial Reconstruction Platform

> ** Bharatiya Antariksh Hackathon 2026**
> **Problem Statement:** Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery
> **Phase 0 Deliverable:** Project Foundation

This platform is a local-first, modular, and explainable geospatial satellite imagery restoration system. It integrates satellite intelligence, historical temporal context, and generative AI models to reconstruct analysis-ready LISS-IV band feeds underneath dense cloud formations.

---

## 📁 Repository Structure

```text
isro-bah26/
├── frontend/             # Next.js (App Router, TS, TailwindCSS, shadcn/ui)
│   ├── src/
│   │   ├── app/          # Navigation routes (/, /analysis, /datasets, etc.)
│   │   ├── components/   # Shared UI components
│   │   └── lib/          # API layer and utilities
│   ├── .env.example      # Frontend environment template
│   └── Dockerfile        # Frontend container specification
│
├── backend/              # FastAPI (Python 3.12+, SQLite, SQLAlchemy)
│   ├── app/
│   │   ├── api/          # Versioned API routes (/api/v1)
│   │   ├── core/         # SQLite config, settings, and db engine
│   │   ├── models/       # Declarative SQL models (for future phases)
│   │   ├── schemas/      # Pydantic schemas (for future validation)
│   │   └── services/     # AI / GIS processing services (for future phases)
│   ├── .env.example      # Backend environment template
│   └── Dockerfile        # Backend container specification
│
├── datasets/             # Directory for local raster datasets
├── scripts/              # Helper utility scripts
├── Docs/                 # Project architecture and roadmaps
├── docker-compose.yml    # Root Docker multi-container orchestrator
└── README.md             # Project start guide (This file)
```

---

## ⚡ Quick Start

### Option A: Docker Compose (Recommended)
You can build and start the entire platform (Frontend, Backend, and local SQLite initialization) with a single command:

```bash
docker compose up --build
```

* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **FastAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Option B: Local Host Setup

#### 1. Start the FastAPI Backend
Ensure Python 3.12+ is installed:

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows

# Install packages
pip install -r requirements.txt

# Create local .env if not present
copy .env.example .env

# Run FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### 2. Start the Next.js Frontend
Ensure Node.js 20+ is installed:

```bash
# Navigate to frontend
cd ../frontend

# Install packages
npm install

# Create local .env if not present
copy .env.example .env

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The landing page status bar will display **Backend Connected** once it communicates with the FastAPI instance.

---

## 🛠️ Frozen Technology Stack

* **Frontend:** Next.js, React 19, TypeScript, TailwindCSS v4, Lucide Icons
* **Backend:** FastAPI, Python 3.12/3.14, Uvicorn Server
* **Database:** SQLite (local-first session cache and logs), SQLAlchemy 2.0+
* **Deployment:** Docker & Docker Compose
* **Future GIS Core (Phase 2+):** GDAL, Rasterio, PyProj
* **Future AI Core (Phase 5+):** PyTorch, OpenCV, NumPy