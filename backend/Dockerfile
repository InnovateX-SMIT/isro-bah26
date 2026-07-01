FROM python:3.12-slim

WORKDIR /app

# System runtime libraries required by rasterio, GDAL, and OpenCV.
# rasterio's manylinux wheel does NOT bundle these — they must exist on the host.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libexpat1 \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]