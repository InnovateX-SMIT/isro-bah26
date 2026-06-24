import os
import shutil
import time
import numpy as np
import cv2
import rasterio
from PIL import Image
from skimage.measure import label, regionprops
from fastapi import HTTPException

from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.cloud_detection import CloudDetectionResponse, CloudDetectionStatus

class CloudDetectionService:
    """
    Service layer responsible for running classical cloud detection on LISS-IV band images.
    Implements explainable thresholding based on normalized brightness index,
    NDVI suppression, and whiteness checks.
    """
    def __init__(
        self,
        repository: CloudDetectionRepository,
        dataset_repository: DatasetRepository
    ):
        self.repository = repository
        self.dataset_repository = dataset_repository

    def get_cloud_detection(self, dataset_id: str) -> CloudDetectionResponse:
        """
        Retrieves the cloud detection record for a dataset.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud detection record found for dataset {dataset_id}."
            )
        return CloudDetectionResponse.model_validate(record)

    def run_cloud_detection(self, dataset_id: str) -> CloudDetectionResponse:
        """
        Runs the cloud detection pipeline:
        1. Checks cache for completed detection.
        2. Resolves and validates input LISS-IV bands (B2, B3, B4).
        3. Parses BAND_META.txt to confirm band mappings.
        4. Initializes db status to processing.
        5. Computes probability map and extracts metrics.
        6. Persists data and saves maps on disk.
        """
        # 1. Cache hit check
        existing = self.repository.get_by_dataset(dataset_id)
        if existing and existing.detection_status == CloudDetectionStatus.COMPLETED.value:
            return CloudDetectionResponse.model_validate(existing)

        # Retrieve dataset profile
        dataset = self.dataset_repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset {dataset_id} not found."
            )

        # Resolve path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        dataset_dir = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))

        if not os.path.exists(dataset_dir):
            raise HTTPException(
                status_code=400,
                detail=f"Dataset path does not exist on disk: {dataset.dataset_path}"
            )

        # 2. Discover and verify band files
        band2_path = None
        band3_path = None
        band4_path = None

        for root, _, files in os.walk(dataset_dir):
            for file in files:
                file_lower = file.lower()
                full_path = os.path.join(root, file)
                if file_lower == "band2.tif":
                    band2_path = full_path
                elif file_lower == "band3.tif":
                    band3_path = full_path
                elif file_lower == "band4.tif":
                    band4_path = full_path

        if not (band2_path and band3_path and band4_path):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Dataset directory lacks necessary LISS-IV bands. "
                    f"Required: BAND2.tif, BAND3.tif, BAND4.tif. Found: "
                    f"B2={bool(band2_path)}, B3={bool(band3_path)}, B4={bool(band4_path)}"
                )
            )

        # 3. Read and verify BAND_META.txt
        meta_path = os.path.join(dataset_dir, "BAND_META.txt")
        if not os.path.exists(meta_path):
            raise HTTPException(
                status_code=400,
                detail=f"Missing BAND_META.txt in dataset directory: {dataset.dataset_path}"
            )

        meta = {}
        with open(meta_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if "=" in line:
                    k, v = line.split("=", 1)
                    meta[k.strip().lower()] = v.strip()

        # Confirm band counts and numbers
        noofbands = meta.get("noofbands")
        bandnumbers = meta.get("bandnumbers", "")
        if noofbands != "3" or not ("2" in bandnumbers and "3" in bandnumbers and "4" in bandnumbers):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"BAND_META.txt verification failed. "
                    f"Expected 3 bands containing 2, 3, and 4. Got: "
                    f"NoOfBands={noofbands}, BandNumbers={bandnumbers}"
                )
            )

        # Initialize/fetch record in PENDING
        record = existing
        if not record:
            record = self.repository.create_detection(dataset_id, CloudDetectionStatus.PENDING.value)
        else:
            self.repository.update_detection(record.detection_id, {
                "detection_status": CloudDetectionStatus.PENDING.value,
                "cloud_coverage_percent": None,
                "probability_map_path": None,
                "mean_cloud_probability": None,
                "candidate_region_count": None
            })

        # Transition status to processing
        self.repository.update_detection(record.detection_id, {
            "detection_status": CloudDetectionStatus.PROCESSING.value
        })

        try:
            # 4. Open reference to establish dimensions and prepare decimation (downsampling to target width of 2048)
            with rasterio.open(band2_path) as src:
                orig_width = src.width
                orig_height = src.height
                src_bounds = src.bounds

            target_width = min(2048, orig_width)
            target_height = int(orig_height * (target_width / orig_width))

            # Read decimated bands
            with rasterio.open(band2_path) as src:
                b2_green = src.read(1, out_shape=(target_height, target_width), resampling=rasterio.enums.Resampling.bilinear)
            with rasterio.open(band3_path) as src:
                b3_red = src.read(1, out_shape=(target_height, target_width), resampling=rasterio.enums.Resampling.bilinear)
            with rasterio.open(band4_path) as src:
                b4_nir = src.read(1, out_shape=(target_height, target_width), resampling=rasterio.enums.Resampling.bilinear)

            # Convert to float
            b2_green = b2_green.astype(np.float32)
            b3_red = b3_red.astype(np.float32)
            b4_nir = b4_nir.astype(np.float32)

            # 5. Normalize bands to [0.0, 1.0] dynamically
            def normalize(band):
                b_min = float(band.min())
                b_max = float(band.max())
                if b_max > b_min:
                    return (band - b_min) / (b_max - b_min)
                return np.zeros_like(band)

            g_norm = normalize(b2_green)
            r_norm = normalize(b3_red)
            n_norm = normalize(b4_nir)

            # A. Brightness Index
            bi = (g_norm + r_norm + n_norm) / 3.0
            p_bright = np.clip((bi - 0.35) / (0.75 - 0.35), 0.0, 1.0)

            # B. NDVI Suppression
            ndvi = (b4_nir - b3_red) / (b4_nir + b3_red + 1e-6)
            p_ndvi = np.clip(1.0 - (ndvi - 0.15) / (0.35 - 0.15), 0.0, 1.0)

            # C. Spectral Whiteness (standard deviation across channels)
            bands_stack = np.stack([g_norm, r_norm, n_norm], axis=0)
            std_dev = np.std(bands_stack, axis=0)
            p_white = np.clip(1.0 - (std_dev - 0.08) / (0.18 - 0.08), 0.0, 1.0)

            # D. Consolidated Probability Score
            p_cloud = p_bright * p_ndvi * p_white

            # E. Connected component statistical labeling
            binary_mask = (p_cloud > 0.5).astype(np.uint8)

            # Morphological noise cleanup (open followed by close)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
            cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_CLOSE, kernel)

            # Measure regions
            labeled_mask, num_features = label(cleaned_mask, return_num=True)
            regions = regionprops(labeled_mask)
            # Suppress single pixel/tiny artifacts (area must be >= 16 decimated pixels)
            candidate_regions = [r for r in regions if r.area >= 16]
            candidate_region_count = len(candidate_regions)

            # F. Statistical Summaries
            cloud_coverage_percent = float(np.sum(cleaned_mask) / cleaned_mask.size) * 100.0
            mean_cloud_probability = float(np.mean(p_cloud))

            # 6. Save probability map to disk
            out_dir = os.path.join(workspace_root, "datasets", "cloud_detections", dataset_id)
            os.makedirs(out_dir, exist_ok=True)

            tif_rel_path = f"datasets/cloud_detections/{dataset_id}/probability_map.tif"
            png_rel_path = f"datasets/cloud_detections/{dataset_id}/probability_map.png"

            tif_abs_path = os.path.join(workspace_root, tif_rel_path)
            png_abs_path = os.path.join(workspace_root, png_rel_path)

            # Scale raster transforms to match decimation bounds
            out_transform = rasterio.transform.from_bounds(*src_bounds, width=target_width, height=target_height)

            with rasterio.open(band2_path) as src:
                out_profile = src.profile.copy()

            out_profile.update(
                dtype=rasterio.float32,
                count=1,
                width=target_width,
                height=target_height,
                transform=out_transform,
                compress='lzw'
            )

            with rasterio.open(tif_abs_path, "w", **out_profile) as dst:
                dst.write(p_cloud.astype(np.float32), 1)

            # Save PNG quick-view image
            png_img = Image.fromarray((p_cloud * 255.0).astype(np.uint8))
            png_img.save(png_abs_path, "PNG")

            # 7. Update database record to COMPLETED
            update_data = {
                "detection_status": CloudDetectionStatus.COMPLETED.value,
                "cloud_coverage_percent": cloud_coverage_percent,
                "probability_map_path": tif_rel_path,
                "mean_cloud_probability": mean_cloud_probability,
                "candidate_region_count": candidate_region_count,
                "detection_method": "brightness_ndvi_threshold_v1"
            }

            db_record = self.repository.update_detection(record.detection_id, update_data)
            return CloudDetectionResponse.model_validate(db_record)

        except Exception as err:
            self.repository.update_detection(record.detection_id, {
                "detection_status": CloudDetectionStatus.FAILED.value
            })
            raise HTTPException(
                status_code=500,
                detail=f"Cloud detection pipeline crashed: {err}"
            )

    def get_probability_map_path(self, dataset_id: str) -> str:
        """
        Resolves the absolute path of the generated PNG probability map visualization on disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record or record.detection_status != CloudDetectionStatus.COMPLETED.value:
            raise HTTPException(
                status_code=404,
                detail=f"Completed cloud detection assets not found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        # Form PNG visualization path
        png_rel_path = f"datasets/cloud_detections/{dataset_id}/probability_map.png"
        abs_path = os.path.abspath(os.path.join(workspace_root, png_rel_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical probability map PNG file not found on disk."
            )
        return abs_path

    def delete_detection_assets(self, dataset_id: str) -> bool:
        """
        Deletes database record and clears generated detection files from disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud detection record found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        detection_dir = os.path.join(workspace_root, "datasets", "cloud_detections", dataset_id)

        if os.path.exists(detection_dir):
            try:
                shutil.rmtree(detection_dir)
            except Exception as err:
                print(f"Warning: Could not remove cloud detection files at {detection_dir}: {err}")

        return self.repository.delete_detection(dataset_id)
