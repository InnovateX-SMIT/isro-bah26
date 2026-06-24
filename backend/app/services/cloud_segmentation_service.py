import os
import shutil
import json
import numpy as np
import cv2
import rasterio
from PIL import Image
from skimage.measure import label, regionprops
from fastapi import HTTPException

from app.repositories.cloud_segmentation_repository import CloudSegmentationRepository
from app.repositories.cloud_shadow_repository import CloudShadowRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.schemas.cloud_segmentation import CloudSegmentationResponse, CloudSegmentationStatus

class CloudSegmentationService:
    """
    Service layer responsible for generating consolidated cloud and shadow segmentation profiles,
    applying morphological cleanup, calculating per-object shape/class heuristics, prioritizing
    reconstruction regions, and exporting GIS-aligned raster masks.
    """
    def __init__(
        self,
        repository: CloudSegmentationRepository,
        shadow_repository: CloudShadowRepository,
        classification_repository: CloudClassificationRepository,
        detection_repository: CloudDetectionRepository
    ):
        self.repository = repository
        self.shadow_repository = shadow_repository
        self.classification_repository = classification_repository
        self.detection_repository = detection_repository

    def get_cloud_segmentation(self, dataset_id: str) -> CloudSegmentationResponse:
        """
        Retrieves the cloud segmentation record for a dataset.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud segmentation record found for dataset {dataset_id}."
            )
        return CloudSegmentationResponse.model_validate(record)

    def run_cloud_segmentation(self, dataset_id: str) -> CloudSegmentationResponse:
        """
        Runs the cloud segmentation pipeline:
        1. Checks cache for completed segmentation.
        2. Guard clauses: verifies 6A (detection), 6B (classification), and 6C (shadow) are completed.
        3. Loads classification_map.tif and shadow_mask.tif.
        4. Combines them into a binary mask and executes:
           - Morphological Closing (5x5 ellipse) to fill small gaps.
           - Morphological Opening (3x3 ellipse) to remove tiny fragments.
           - Contour-based Hole Filling to seal interior holes.
           - Small Object Removal (<16 pixels).
        5. Assigns multi-class segmentation codes (Thick=1, Thin=2, Cirrus=3, Uncertain=4, Shadow=5, Filled=4).
        6. Extracts cloud objects and calculates metrics (pixel count, bounding box, centroid, shadow overlap, priority).
        7. Saves georeferenced segmentation_mask.tif, reconstruction_mask.tif, and colored preview PNG.
        8. Persists stats and region details JSON array.
        """
        # 1. Cache hit check
        existing = self.repository.get_by_dataset(dataset_id)
        if existing and existing.segmentation_status == CloudSegmentationStatus.COMPLETED.value:
            return CloudSegmentationResponse.model_validate(existing)

        # 2. Guard: Verify detection, classification, and shadow records are completed
        detection = self.detection_repository.get_by_dataset(dataset_id)
        classification = self.classification_repository.get_by_dataset(dataset_id)
        shadow = self.shadow_repository.get_by_dataset(dataset_id)

        if not detection or detection.detection_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed cloud detection record not found. Run cloud detection first."
            )
        if not classification or classification.classification_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed cloud classification record not found. Run cloud classification first."
            )
        if not shadow or shadow.shadow_detection_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed cloud shadow record not found. Run cloud shadow detection first."
            )

        # Resolve paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        class_map_abs_path = os.path.abspath(os.path.join(workspace_root, classification.classification_map_path))
        shadow_map_abs_path = os.path.abspath(os.path.join(workspace_root, shadow.shadow_mask_path))

        if not os.path.exists(class_map_abs_path):
            raise HTTPException(
                status_code=404,
                detail=f"Classification map not found on disk: {classification.classification_map_path}"
            )
        if not os.path.exists(shadow_map_abs_path):
            raise HTTPException(
                status_code=404,
                detail=f"Shadow mask not found on disk: {shadow.shadow_mask_path}"
            )

        # Initialize/fetch record in PENDING
        record = existing
        if not record:
            record = self.repository.create_segmentation_record(
                dataset_id=dataset_id,
                cloud_shadow_id=shadow.shadow_id,
                status=CloudSegmentationStatus.PENDING.value
            )
        else:
            self.repository.update_segmentation_record(record.segmentation_id, {
                "segmentation_status": CloudSegmentationStatus.PENDING.value,
                "reconstruction_ready": False
            })

        try:
            # 3. Load classification map and shadow map
            with rasterio.open(class_map_abs_path) as src:
                classification_map = src.read(1)
                profile = src.profile.copy()
                transform = src.transform
                target_height, target_width = classification_map.shape

            with rasterio.open(shadow_map_abs_path) as src:
                shadow_mask = src.read(1)

            # 4. Perform connected component & morphological operations
            # Step 4a: Merge into binary target
            binary_mask = (classification_map > 0) | (shadow_mask == 1)

            # Step 4b: Morphological Closing (5x5 ellipse)
            kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            closed = cv2.morphologyEx(binary_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel_close)

            # Step 4c: Morphological Opening (3x3 ellipse)
            kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel_open)

            # Step 4d: Contour-based Hole Filling
            contours, _ = cv2.findContours(opened, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            filled_mask = np.zeros_like(opened)
            cv2.drawContours(filled_mask, contours, -1, 1, thickness=cv2.FILLED)

            # Step 4e: Small Object Removal (<16 pixels)
            labeled_mask, num_features = label(filled_mask, return_num=True)
            regions = regionprops(labeled_mask)
            reconstruction_mask = np.zeros_like(filled_mask, dtype=np.uint8)
            for r in regions:
                if r.area >= 16:
                    reconstruction_mask[labeled_mask == r.label] = 1

            # 5. Build Final Segmentation Mask
            # 0=Background, 1=Thick, 2=Thin, 3=Cirrus, 4=Uncertain, 5=Shadow
            segmentation_mask = np.zeros_like(reconstruction_mask, dtype=np.uint8)
            mask_active = (reconstruction_mask == 1)
            
            # Default to Uncertain cloud code (4) for morphed/filled pixels
            segmentation_mask[mask_active] = 4

            # Overlay original classification and shadow classes where present
            has_class = mask_active & (classification_map > 0)
            segmentation_mask[has_class] = classification_map[has_class]

            has_shadow = mask_active & (classification_map == 0) & (shadow_mask == 1)
            segmentation_mask[has_shadow] = 5

            # 6. Extract Cloud Objects & Compute Heuristics
            labeled_objs, num_objs = label(reconstruction_mask, return_num=True)
            objects = regionprops(labeled_objs)

            total_cloud_pixels = int(np.sum((segmentation_mask >= 1) & (segmentation_mask <= 4)))
            total_shadow_pixels = int(np.sum(segmentation_mask == 5))

            region_details = []
            largest_region = 0
            smallest_region = 999999999 if len(objects) > 0 else 0
            sizes = []

            for obj in objects:
                area_px = int(obj.area)
                sizes.append(area_px)

                if area_px > largest_region:
                    largest_region = area_px
                if area_px < smallest_region:
                    smallest_region = area_px

                # Centroid & Bounding Box
                cy, cx = obj.centroid
                min_y, min_x, max_y, max_x = obj.bbox

                # Perimeter & Compactness circularity proxy
                perimeter = float(obj.perimeter)
                compactness = (perimeter ** 2) / area_px if area_px > 0 else 0.0

                # Classification distribution
                obj_pixels = segmentation_mask[labeled_objs == obj.label]
                unique, counts = np.unique(obj_pixels, return_counts=True)
                class_dist = {int(u): int(c) for u, c in zip(unique, counts)}

                # Shadow overlap percentage
                shadow_count = class_dist.get(5, 0)
                shadow_overlap_percent = (shadow_count / area_px) * 100.0

                # Opacity mapping (thick cloud proportion of total cloud pixels)
                thick_count = class_dist.get(1, 0)
                thin_count = class_dist.get(2, 0)
                cirrus_count = class_dist.get(3, 0)
                uncertain_count = class_dist.get(4, 0)
                total_cloud_in_obj = thick_count + thin_count + cirrus_count + uncertain_count

                thick_fraction = (thick_count / total_cloud_in_obj) if total_cloud_in_obj > 0 else 0.0

                # Reconstruction Priority Scoring
                score = 0
                if area_px > 1000:
                    score += 3
                elif area_px > 200:
                    score += 2
                elif area_px > 50:
                    score += 1

                if thick_fraction > 0.50:
                    score += 3
                elif (thin_count + uncertain_count) / max(1, total_cloud_in_obj) > 0.50:
                    score += 2
                elif cirrus_count / max(1, total_cloud_in_obj) > 0.50:
                    score += 1

                if shadow_overlap_percent > 20.0:
                    score += 1

                if compactness > 40.0:
                    score += 1

                if score >= 5:
                    priority = "HIGH"
                elif score >= 2:
                    priority = "MEDIUM"
                else:
                    priority = "LOW"

                region_details.append({
                    "region_id": int(obj.label),
                    "pixel_count": area_px,
                    "area_percent": (area_px / (target_height * target_width)) * 100.0,
                    "bounding_box": [int(min_y), int(min_x), int(max_y), int(max_x)],
                    "centroid": [float(cy), float(cx)],
                    "classification_distribution": class_dist,
                    "shadow_overlap_percent": shadow_overlap_percent,
                    "perimeter": perimeter,
                    "compactness": compactness,
                    "reconstruction_priority": priority
                })

            smallest_region = smallest_region if len(objects) > 0 else 0
            mean_region_pixels = float(np.mean(sizes)) if len(sizes) > 0 else 0.0
            total_segmented_area_percent = ((total_cloud_pixels + total_shadow_pixels) / (target_height * target_width)) * 100.0

            # 7. Write georeferenced output TIFFs and preview PNG
            out_dir = os.path.join(workspace_root, "datasets", "cloud_segmentations", dataset_id)
            os.makedirs(out_dir, exist_ok=True)

            seg_tif_rel = f"datasets/cloud_segmentations/{dataset_id}/segmentation_mask.tif"
            rec_tif_rel = f"datasets/cloud_segmentations/{dataset_id}/reconstruction_mask.tif"
            png_rel = f"datasets/cloud_segmentations/{dataset_id}/segmentation_preview.png"

            seg_tif_abs = os.path.join(workspace_root, seg_tif_rel)
            rec_tif_abs = os.path.join(workspace_root, rec_tif_rel)
            png_abs = os.path.join(workspace_root, png_rel)

            profile.update(
                dtype=rasterio.uint8,
                count=1,
                compress='lzw'
            )

            # Write segmentation map
            with rasterio.open(seg_tif_abs, "w", **profile) as dst:
                dst.write(segmentation_mask, 1)

            # Write reconstruction target mask
            with rasterio.open(rec_tif_abs, "w", **profile) as dst:
                dst.write(reconstruction_mask, 1)

            # Build preview PNG
            # Color map: Thick=Red, Thin=Orange, Cirrus=Blue, Uncertain=Gray, Shadow=Purple, Background=Black
            rgb_image = np.zeros((target_height, target_width, 3), dtype=np.uint8)
            rgb_image[segmentation_mask == 1] = [239, 68, 68]
            rgb_image[segmentation_mask == 2] = [249, 115, 22]
            rgb_image[segmentation_mask == 3] = [59, 130, 246]
            rgb_image[segmentation_mask == 4] = [156, 163, 175]
            rgb_image[segmentation_mask == 5] = [128, 0, 128]

            png_img = Image.fromarray(rgb_image)
            png_img.save(png_abs, "PNG")

            # 8. Update database record
            update_data = {
                "segmentation_status": CloudSegmentationStatus.COMPLETED.value,
                "total_segmented_regions": len(objects),
                "total_cloud_pixels": total_cloud_pixels,
                "total_shadow_pixels": total_shadow_pixels,
                "largest_region_pixels": largest_region,
                "smallest_region_pixels": smallest_region,
                "mean_region_pixels": mean_region_pixels,
                "total_segmented_area_percent": total_segmented_area_percent,
                "reconstruction_ready": True,
                "segmentation_mask_path": seg_tif_rel,
                "reconstruction_mask_path": rec_tif_rel,
                "segmentation_preview_path": png_rel,
                "region_details_json": json.dumps(region_details)
            }

            db_record = self.repository.update_segmentation_record(record.segmentation_id, update_data)
            return CloudSegmentationResponse.model_validate(db_record)

        except Exception as err:
            self.repository.update_segmentation_record(record.segmentation_id, {
                "segmentation_status": CloudSegmentationStatus.FAILED.value
            })
            raise HTTPException(
                status_code=500,
                detail=f"Cloud segmentation pipeline crashed: {err}"
            )

    def get_preview_image_path(self, dataset_id: str) -> str:
        """
        Resolves the absolute path of the generated preview PNG visualization on disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record or record.segmentation_status != CloudSegmentationStatus.COMPLETED.value:
            raise HTTPException(
                status_code=404,
                detail=f"Completed segmentation assets not found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        abs_path = os.path.abspath(os.path.join(workspace_root, record.segmentation_preview_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical segmentation preview file not found on disk."
            )
        return abs_path

    def delete_segmentation_assets(self, dataset_id: str) -> bool:
        """
        Deletes database record and clears generated segmentation files from disk.
        """
        record = self.repository.get_by_dataset(dataset_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"No cloud segmentation record found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        seg_dir = os.path.join(workspace_root, "datasets", "cloud_segmentations", dataset_id)

        if os.path.exists(seg_dir):
            try:
                shutil.rmtree(seg_dir)
            except Exception as err:
                print(f"Warning: Could not remove cloud segmentation files at {seg_dir}: {err}")

        return self.repository.delete_segmentation_record(dataset_id)
