# Technology Stack Audit: ISRO BAH26 Datathon Project

This document provides a concise, verified audit of the technology stack actually implemented and used in the **AI-Powered Geospatial Reconstruction Platform** (Generative AI-Based Cloud Removal and Reconstruction for LISS-IV Satellite Imagery). 

*Audit Source of Truth: In-depth verification of `package.json`, `requirements.txt`, Dockerfiles, `docker-compose.yml`, frontend components, backend routers, services, repositories, and AI evaluation modules.*

---

## 1. Frontend

*   **Next.js (v16.2.9)**
    *   *Purpose:* React meta-framework providing App Router, dynamic server/client routing, and layout compilation.
*   **React (v19.2.4)**
    *   *Purpose:* Base JavaScript library for component rendering and interactive client-side state management.
*   **TypeScript (v5)**
    *   *Purpose:* Static typing system enforcing API response layouts, schema compliance, and module type safety.
*   **Tailwind CSS (v4)**
    *   *Purpose:* Utility-first styling framework used with post-css configurations to construct the Dark Space/ISRO Teal aesthetic.
*   **MapLibre GL (v5.24.0)**
    *   *Purpose:* WebGL-accelerated mapping engine used to render interactive overlays of satellite scene footprints and center coordinates.
*   **Lucide React (v1.21.0)**
    *   *Purpose:* Component-ready vector icon set used for navigation panels, dashboard statuses, and indicator icons.
*   **Styling Utilities (`clsx`, `tailwind-merge`, `class-variance-authority`)**
    *   *Purpose:* Handles dynamic class configurations, resolves Tailwind utility conflicts, and manages reusable component styling variants.

---

## 2. Backend

*   **Python (v3.12)**
    *   *Purpose:* Core programming language powering the service layers, image computations, and PyTorch execution pipelines.
*   **FastAPI (v0.137.2+)**
    *   *Purpose:* High-performance asynchronous REST API framework supplying automatic Pydantic request/response validations and OpenAPI endpoints.
*   **Uvicorn (v0.49.0+)**
    *   *Purpose:* Lightweight and lightning-fast ASGI server hosting the FastAPI web application.
*   **SQLAlchemy (v2.0.51+)**
    *   *Purpose:* SQL toolkit and Object-Relational Mapper (ORM) powering transaction operations and database models mapping.
*   **Pydantic (v2.13.4+) & Pydantic Settings**
    *   *Purpose:* Data formatting, response validation schemas, and environment configuration parser.
*   **HTTPX (v0.28.1+)**
    *   *Purpose:* Asynchronous HTTP client executing external API requests (e.g., Nominatim geocoding) without blocking workers.
*   **Python-dotenv (v1.2.2+)**
    *   *Purpose:* Decouples configuration parameters by parsing local environment files (`.env`) into active runtime configurations.
*   **FPDF2 (v2.8.2+)**
    *   *Purpose:* Programmatic generation of scientific layout PDF reports with metrics scorecards, headers, and footers.

---

## 3. AI / Machine Learning

*   **PyTorch (v2.2.0+)**
    *   *Where used:* `backend/app/services/reconstruction/model.py`
    *   *Purpose:* Defines the `LISS4ReconstructionNet` U-Net model architecture (7-channel input fusion: 3 masked bands + 1 binary mask + 3 temporal guidance bands; 3-channel output). Fine-tunes model weights dynamically on local clean patches using a Deep Image Prior (self-supervised) style for texture/edge alignment.
*   **ONNX Runtime (v1.17.0+)**
    *   *Where used:* `backend/app/services/reconstruction/model.py`
    *   *Purpose:* Compiles and exports PyTorch models into low-latency `.onnx` runtimes, loading them into active `InferenceSession`s for high-speed local inference.
*   **NumPy**
    *   *Where used:* Backend-wide image processing
    *   *Purpose:* Powers array matrix manipulations, band normalizations, statistical evaluations, and fast index groupings.
*   **OpenCV (`opencv-python-headless`)**
    *   *Where used:* Cloud segmentation and evaluation metrics
    *   *Purpose:* Runs morphological closing/opening, contour hole filling, and Sobel edge-gradient extraction for structural preservation scoring.
*   **Scikit-Image (`scikit-image`)**
    *   *Where used:* `cloud_segmentation_service.py` & `reliability_scorer.py`
    *   *Purpose:* Segment, label, and extract bounding box, centroid, and area metrics of cloud objects via `skimage.measure` (`label`, `regionprops`).
*   **Pillow (`pillow` / `PIL`)**
    *   *Where used:* Preview generators and datasets
    *   *Purpose:* Handles raw image band loading, downsampling, and color-mapped PNG preview outputs.

---

## 4. Geospatial Stack

*   **Rasterio (v1.5.0+)**
    *   *Purpose:* Satellite imagery engine that parses GeoTIFF formats, reads coordinate transforms, executes bilinear band resampling, and writes georeferenced bands.
*   **PyProj (v3.7.2+)**
    *   *Purpose:* Coordinate Reference System (CRS) translation library, transforming local projected UTM boundaries into global geographic WGS84 coordinates.
*   **Google Earth Engine API (`earthengine-api` / `ee`)**
    *   *Purpose:* Pluggable GEE Catalog provider (`gee_provider.py`) querying satellite image archives (Sentinel-2, Landsat-8) matching targeted geospatial bounding boxes and dates.

---

## 5. Database

*   **SQLite**
    *   *Purpose:* Local relational database engine storing all workspace settings, session transitions, and pipeline run histories in `platform.db`.
*   **SQLAlchemy ORM**
    *   *Purpose:* Object-Relational Mapper structuring SQL transactions, table constraints, and relationship cascades in Python.

---

## 6. External APIs / Services

*   **Google Earth Engine Catalog**
    *   *Purpose:* Query service used to find Sentinel-2 or Landsat-8 imagery matching targets for temporal guidance fusions.
*   **OpenStreetMap Nominatim**
    *   *Purpose:* Geocoding web service resolving dataset coordinates into state, district, and country boundaries.
*   **Offline Indian Location Resolver**
    *   *Purpose:* Local coordinate boundary mapping fallback that resolves coordinates to Indian districts (e.g. Bulandshahr, UP or Rohtak, Haryana) without internet connection.

---

## 7. Visualization

*   **MapLibre GL**
    *   *Purpose:* Renders dark-themed interactive map views and overlays dataset boundary polygons and centroid markers in the frontend.
*   **OpenCV & Pillow**
    *   *Purpose:* Generates multi-spectral band composites (RGB) and color-coded semantic segmentation maps (Thick/Thin Cloud, Shadow, Land, etc.).
*   **FPDF2 (Scientific PDF Builder)**
    *   *Purpose:* Renders custom visual reporting layouts containing metrics summaries and session results.

---

## 8. Development & DevOps

*   **Docker**
    *   *Purpose:* Standardizes local deployment and environment configurations via `python:3.12-slim` (backend) and `node:24-slim` (frontend) container builds.
*   **Docker Compose**
    *   *Purpose:* Automates multi-container runtime coordination (frontend client, backend API, shared network, and SQLite storage volumes) with built-in health monitors.
*   **Git**
    *   *Purpose:* Version control system managing codebase history.
*   **npm**
    *   *Purpose:* Frontend package installation and Next.js production build compiler.
*   **pip**
    *   *Purpose:* Package manager resolving and installing python packages from `requirements.txt`.

---

## 9. Architecture Summary

*   **Frontend:** Next.js 16 (React 19) + TypeScript + Tailwind CSS v4 + MapLibre GL
*   **Backend:** FastAPI + Python 3.12 + SQLAlchemy ORM + FPDF2
*   **AI:** PyTorch (U-Net DIP adaptation) + ONNX Runtime + NumPy + OpenCV + Scikit-image
*   **Geospatial:** Rasterio + PyProj + Google Earth Engine API
*   **Database:** SQLite (`platform.db`)
*   **Deployment:** Docker + Docker Compose + healthcheck pings

---

## 10. PPT Slide Version

## PPT Slide (Final)

### 🛰️ ISRO BAH26 Technology Stack

#### Frontend
*   **Next.js 16 & React 19** – App Router & Client-State Management
*   **TypeScript & Tailwind CSS v4** – Type-safety & Modern Dark Space UI styling
*   **MapLibre GL** – Geospatial footprint overlays & vector mapping

#### Backend & Database
*   **FastAPI & Python 3.12** – Async REST API framework with Pydantic typing
*   **SQLAlchemy ORM & SQLite** – Relational model mappings & local persistence
*   **FPDF2** – Automated scientific PDF report engine

#### AI & Image Processing
*   **PyTorch & ONNX Runtime** – Dynamic U-Net Deep Image Prior & low-latency execution
*   **OpenCV & NumPy** – Morphological mask filtering & matrix computation
*   **Scikit-Image** – Connected component labelling & cloud metric extractions

#### Geospatial Stack & External APIs
*   **Rasterio & PyProj** – GeoTIFF parsing, bilinear resampling, & UTM coordinate projections
*   **GEE Catalog API** – Landsat-8 and Sentinel-2 historical imagery discovery
*   **OSM Nominatim API** – Reverse-geocoding administrative locations (with offline fallback)

#### DevOps & Deployment
*   **Docker & Docker Compose** – Containerization & multi-service orchestration (Client/API)
