import os
import shutil
import json
import numpy as np
import cv2
import rasterio
from PIL import Image
from skimage.measure import label, regionprops
from fastapi import HTTPException

from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.cloud_shadow import CloudShadowResponse, CloudShadowStatus

class CloudShadowService:
    """
    Service layer responsible for executing cloud shadow detection based on solar geometry
    (directional ray projection - Path A) and raw band spectral/spatial heuristics.
    """
    def __init__(
        self,
        repository: CloudShadowRepository,
        classification_repository: CloudClassificationRepository,
        dataset_repository: DatasetRepository
    ):
        self.repository = repository
        self.classification_repository = classification_repository
        self.dataset_repository = dataset_repository

    def get_cloud_shadow(self, dataset_id: str) -> CloudShadowResponse:
        """
        Retrieves the cloud shadow record for a dataset.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud shadow record found for dataset {dataset_id}."
            )
        return CloudShadowResponse.model_validate(record)

    def run_cloud_shadow(self, dataset_id: str) -> CloudShadowResponse:
        """
        Runs the cloud shadow detection pipeline:
        1. Checks cache for completed shadow detection.
        2. Validates that a completed CloudClassification record exists.
        3. Scans for raw band files (BAND2, BAND3, BAND4) and BAND_META.txt.
        4. Parses SunAziumthAtCenter and SunElevationAtCenter from BAND_META.txt.
        5. Loads decimated bands matching the classification shape.
        6. Computes normalized brightness, NDVI, and NDWI to build a candidate shadow mask.
        7. Projects rays opposite the sun azimuth to find shadow pixels cast by each cloud region.
        8. Labels and links shadow regions to casting cloud regions, calculating distances.
        9. Saves georeferenced shadow raster TIFF and purple preview PNG.
        10. Persists summary stats and region JSON details to database.
        """
        # 1. Cache hit check
        existing = self.repository.get_by_dataset(dataset_id)
        if existing and existing.shadow_detection_status == CloudShadowStatus.COMPLETED.value:
            return CloudShadowResponse.model_validate(existing)

        # 2. Guard: Verify completed classification exists
        classification = self.classification_repository.get_by_dataset(dataset_id)
        if not classification or classification.classification_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Run cloud classification before shadow detection. Completed cloud classification record not found."
            )

        # Retrieve dataset profile
        dataset = self.dataset_repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset {dataset_id} not found."
            )

        # Resolve paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        dataset_dir = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))

        if not os.path.exists(dataset_dir):
            raise HTTPException(
                status_code=400,
                detail=f"Dataset path does not exist on disk: {dataset.dataset_path}"
            )

        # 3. Discover and verify raw band files
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
                detail="Dataset directory lacks necessary LISS-IV bands (BAND2.tif, BAND3.tif, BAND4.tif)."
            )

        # 4. Read and parse BAND_META.txt for solar angles
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

        sun_az_str = meta.get("sunaziumthatcenter")
        sun_el_str = meta.get("sunelevationatcenter")

        if not sun_az_str or not sun_el_str:
            raise HTTPException(
                status_code=400,
                detail="Could not find SunAziumthAtCenter or SunElevationAtCenter in BAND_META.txt."
            )

        try:
            sun_azimuth = float(sun_az_str)
            sun_elevation = float(sun_el_str)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid sun geometry values in BAND_META.txt: sun_az={sun_az_str}, sun_el={sun_el_str}"
            )

        # Initialize/fetch record in PENDING
        record = existing
        if not record:
            record = self.repository.create_shadow_record(
                dataset_id=dataset_id,
                cloud_classification_id=classification.classification_id,
                status=CloudShadowStatus.PENDING.value
            )
        else:
            self.repository.update_shadow_record(record.shadow_id, {
                "shadow_detection_status": CloudShadowStatus.PENDING.value
            })

        try:
            # Load classification map to establish dimensions and georeferencing
            class_map_abs_path = os.path.abspath(os.path.join(workspace_root, classification.classification_map_path))
            if not os.path.exists(class_map_abs_path):
                raise HTTPException(
                    status_code=404,
                    detail=f"Classification map file not found on disk: {classification.classification_map_path}"
                )

            with rasterio.open(class_map_abs_path) as src:
                class_raster = src.read(1)
                profile = src.profile.copy()
                transform = src.transform
                target_height, target_width = class_raster.shape

            # 5. Load decimated bands matching the classification shape
            with rasterio.open(band2_path) as src:
                b2_green = src.read(1, out_shape=(target_height, target_width), resampling=rasterio.enums.Resampling.bilinear).astype(np.float32)
            with rasterio.open(band3_path) as src:
                b3_red = src.read(1, out_shape=(target_height, target_width), resampling=rasterio.enums.Resampling.bilinear).astype(np.float32)
            with rasterio.open(band4_path) as src:
                b4_nir = src.read(1, out_shape=(target_height, target_width), resampling=rasterio.enums.Resampling.bilinear).astype(np.float32)

            # Normalize bands dynamically to [0, 1]
            def normalize(band):
                b_min = float(band.min())
                b_max = float(band.max())
                if b_max > b_min:
                    return (band - b_min) / (b_max - b_min)
                return np.zeros_like(band)

            g_norm = normalize(b2_green)
            r_norm = normalize(b3_red)
            n_norm = normalize(b4_nir)

            # 6. Compute indexes and candidate mask
            brightness = (g_norm + r_norm + n_norm) / 3.0
            ndvi = (n_norm - r_norm) / (n_norm + r_norm + 1e-6)
            ndwi = (g_norm - n_norm) / (g_norm + n_norm + 1e-6)

            # Exclude cloud pixels (classification > 0)
            candidate_mask = (brightness < 0.28) & (class_raster == 0) & (ndvi <= 0.22) & (ndwi <= 0.20)

            # 7. Spatial Directional Ray Search (Path A)
            # Direction: opposite sun azimuth (azimuth + 180 degrees)
            az_rad = np.radians(sun_azimuth)
            dx = -np.sin(az_rad)
            dy = np.cos(az_rad)

            el_rad = np.radians(sun_elevation)
            tan_el = np.tan(el_rad)

            pixel_size = abs(transform[0])

            # Height proxy range: [500, 5000] meters
            t_min = 500.0 / tan_el / pixel_size
            t_max = 5000.0 / tan_el / pixel_size
            t_steps = np.arange(t_min, t_max + 1.0, 1.0)
            if len(t_steps) == 0:
                t_steps = np.array([t_min])

            # Label cloud components to link casting clouds
            labeled_clouds, num_clouds = label(class_raster > 0, return_num=True)
            cloud_regions = regionprops(labeled_clouds)
            valid_cloud_regions = [r for r in cloud_regions if r.area >= 16]
            cloud_area_dict = {r.label: r.area for r in valid_cloud_regions}

            # Maps to track minimum t (distance) and casting cloud region labels
            min_t_map = np.full(class_raster.shape, np.inf, dtype=np.float32)
            casting_cloud_id = np.zeros(class_raster.shape, dtype=np.int32)
            shadow_pixels = np.zeros(class_raster.shape, dtype=bool)

            def shift_image(img: np.ndarray, shx: float, shy: float) -> np.ndarray:
                M = np.float32([[1, 0, shx], [0, 1, shy]])
                return cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_NEAREST)

            # Cast rays by shifting each cloud region mask along the shadow vector
            for r in valid_cloud_regions:
                region_mask = (labeled_clouds == r.label)
                for t in t_steps:
                    shifted = shift_image(region_mask.astype(np.uint8), t * dx, t * dy) > 0
                    hits = shifted & candidate_mask
                    if np.any(hits):
                        shadow_pixels[hits] = True
                        mask_to_update = hits & (t < min_t_map)
                        min_t_map[mask_to_update] = t
                        casting_cloud_id[mask_to_update] = r.label

            # 8. Connected component segment and linkage for shadow regions
            labeled_shadows, num_shadows = label(shadow_pixels, return_num=True)
            shadow_regions = regionprops(labeled_shadows)

            region_details = []
            linked_count = 0
            unlinked_count = 0
            shadow_area_sum = 0
            ratios = []

            for s in shadow_regions:
                shadow_reg_mask = (labeled_shadows == s.label)
                area_px = int(s.area)
                shadow_area_sum += area_px

                casting_labels = casting_cloud_id[shadow_reg_mask]
                casting_labels_valid = casting_labels[casting_labels > 0]

                if len(casting_labels_valid) > 0:
                    counts = np.bincount(casting_labels_valid)
                    linked_cloud_label = int(np.argmax(counts))

                    t_vals = min_t_map[shadow_reg_mask]
                    valid_t_vals = t_vals[np.isfinite(t_vals)]
                    if len(valid_t_vals) > 0:
                        mean_dist_px = float(np.mean(valid_t_vals))
                        mean_dist_meters = mean_dist_px * pixel_size
                    else:
                        mean_dist_meters = 0.0

                    linked_count += 1
                    cloud_area = cloud_area_dict.get(linked_cloud_label, 0)
                    if cloud_area > 0:
                        ratios.append(area_px / cloud_area)

                    region_details.append({
                        "id": int(s.label),
                        "area_px": area_px,
                        "linked_cloud_id": linked_cloud_label,
                        "distance": mean_dist_meters
                    })
                else:
                    unlinked_count += 1
                    region_details.append({
                        "id": int(s.label),
                        "area_px": area_px,
                        "linked_cloud_id": None,
                        "distance": 0.0
                    })

            total_shadow_area_percent = (shadow_area_sum / (target_height * target_width)) * 100.0
            mean_ratio = float(np.mean(ratios)) if len(ratios) > 0 else None

            # 9. Save georeferenced TIFF raster and colored PNG preview
            out_dir = os.path.join(workspace_root, "datasets", "cloud_shadows", dataset_id)
            os.makedirs(out_dir, exist_ok=True)

            tif_rel_path = f"datasets/cloud_shadows/{dataset_id}/shadow_mask.tif"
            png_rel_path = f"datasets/cloud_shadows/{dataset_id}/shadow_preview.png"

            tif_abs_path = os.path.join(workspace_root, tif_rel_path)
            png_abs_path = os.path.join(workspace_root, png_rel_path)

            profile.update(
                dtype=rasterio.uint8,
                count=1,
                compress='lzw'
            )
            shadow_raster = shadow_pixels.astype(np.uint8)
            with rasterio.open(tif_abs_path, "w", **profile) as dst:
                dst.write(shadow_raster, 1)

            rgb_image = np.zeros((target_height, target_width, 3), dtype=np.uint8)
            rgb_image[shadow_raster == 1] = [128, 0, 128] # Purple [128, 0, 128]

            png_img = Image.fromarray(rgb_image)
            png_img.save(png_abs_path, "PNG")

            # 10. Persist summary statistics and details to DB
            update_data = {
                "shadow_detection_status": CloudShadowStatus.COMPLETED.value,
                "solar_geometry_available": True,
                "shadow_region_count": len(shadow_regions),
                "total_shadow_area_percent": total_shadow_area_percent,
                "linked_shadow_region_count": linked_count,
                "unlinked_shadow_region_count": unlinked_count,
                "mean_shadow_to_cloud_area_ratio": mean_ratio,
                "shadow_mask_path": tif_rel_path,
                "shadow_preview_path": png_rel_path,
                "region_details_json": json.dumps(region_details),
                "detection_method": "solar_geometry_directional_v1"
            }

            db_record = self.repository.update_shadow_record(record.shadow_id, update_data)
            return CloudShadowResponse.model_validate(db_record)

        except Exception as err:
            self.repository.update_shadow_record(record.shadow_id, {
                "shadow_detection_status": CloudShadowStatus.FAILED.value
            })
            raise HTTPException(
                status_code=500,
                detail=f"Cloud shadow detection pipeline crashed: {err}"
            )

    def get_preview_image_path(self, dataset_id: str) -> str:
        """
        Resolves the absolute path of the generated preview PNG visualization on disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record or record.shadow_detection_status != CloudShadowStatus.COMPLETED.value:
            raise HTTPException(
                status_code=404,
                detail=f"Completed shadow assets not found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        abs_path = os.path.abspath(os.path.join(workspace_root, record.shadow_preview_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical shadow preview file not found on disk."
            )
        return abs_path

    def delete_shadow_assets(self, dataset_id: str) -> bool:
        """
        Deletes database record and clears generated shadow files from disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud shadow record found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        shadow_dir = os.path.join(workspace_root, "datasets", "cloud_shadows", dataset_id)

        if os.path.exists(shadow_dir):
            try:
                shutil.rmtree(shadow_dir)
            except Exception as err:
                print(f"Warning: Could not remove cloud shadow files at {shadow_dir}: {err}")

        return self.repository.delete_shadow_record(dataset_id)
