import ee
import json
import math
import requests
import rasterio
import numpy as np

try:
    ee.Initialize(project='isro-bah26')
    print("EE Initialized successfully")
except Exception as e:
    print(f"Error initializing EE: {e}")
    exit(1)

# Center and bbox of the demo dataset
center_lat = 28.830673879727648
center_lon = 76.85065881865302
bbox = [[76.38112045470254, 28.43762184834463], [77.32360365273405, 29.22230740420696]]

def expand_bbox_by_km(bbox_coords, buffer_km=50.0):
    min_lon, min_lat = bbox_coords[0]
    max_lon, max_lat = bbox_coords[1]
    center_y = (min_lat + max_lat) / 2.0
    
    deg_lat_per_km = 1.0 / 111.32
    cos_lat = math.cos(math.radians(center_y))
    deg_lon_per_km = 1.0 / (111.32 * cos_lat) if cos_lat > 0.001 else 1.0 / 111.32
    
    lat_buf = buffer_km * deg_lat_per_km
    lon_buf = buffer_km * deg_lon_per_km
    
    return [
        [min_lon - lon_buf, min_lat - lat_buf],
        [max_lon + lon_buf, max_lat + lat_buf]
    ]

expanded_bbox = expand_bbox_by_km(bbox, 50.0)

# Create ee geometry
geom = ee.Geometry.Rectangle(
    expanded_bbox[0][0], expanded_bbox[0][1],
    expanded_bbox[1][0], expanded_bbox[1][1]
)

# Function to mask clouds in Sentinel-2
def mask_s2_clouds(image):
    qa = image.select('QA60')
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(
           qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    return image.updateMask(mask)

# Search Sentinel-2 Surface Reflectance and create median composite
print("Creating S2 median composite...")
s2_coll = (
    ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geom)
    .filterDate('2025-05-01', '2025-09-30')
    .map(mask_s2_clouds)
)

img_median = s2_coll.median()
img_rgb = img_median.select(['B4', 'B3', 'B2'])

scale = 100
url = img_rgb.getDownloadURL({
    'scale': scale,
    'crs': 'EPSG:4326',
    'region': geom,
    'format': 'GEO_TIFF'
})
print(f"Download URL: {url}")

print("Downloading package...")
res = requests.get(url)
print(f"Status: {res.status_code}")

if res.status_code == 200:
    filepath = "test_download_s2_median.tif"
    with open(filepath, "wb") as f:
        f.write(res.content)
    print("Saved to test_download_s2_median.tif")
    
    # Open with rasterio
    with rasterio.open(filepath) as src:
        print(f"Opened file metadata - shape: {src.shape}, crs: {src.crs}, count: {src.count}")
        for i in range(1, src.count + 1):
            band = src.read(i)
            # Mask nan values (unpopulated pixels in composite show as nan/0 depending on crs/dtype)
            nan_count = np.isnan(band).sum()
            zero_count = (band == 0).sum()
            invalid_count = nan_count + zero_count
            print(f"Band {i} stats - min: {np.nanmin(band)}, max: {np.nanmax(band)}, mean: {np.nanmean(band):.2f}")
            invalid_percentage = invalid_count / band.size * 100.0
            print(f"Band {i} - percentage of invalid/zero/nan pixels: {invalid_percentage:.2f}%")
else:
    print(f"Download failed: {res.text}")
