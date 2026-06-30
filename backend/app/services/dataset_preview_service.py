import os
import shutil
import time
import numpy as np
from PIL import Image
import rasterio
from fastapi import HTTPException
from app.repositories.dataset_preview_repository import DatasetPreviewRepository
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset_preview import PreviewResponse, PreviewStatus

MAX_PREVIEW_DIM = 1024

class DatasetPreviewService:
    """
    Service responsible for loading multi-file or multi-band dataset rasters,
    normalizing band data, generating visual preview/thumbnail PNG files on disk,
    and managing the database metadata logs.
    """
    def __init__(
        self,
        repository: DatasetPreviewRepository,
        dataset_repository: DatasetRepository
    ):
        self.repository = repository
        self.dataset_repository = dataset_repository

    def generate_preview(self, dataset_id: str) -> PreviewResponse:
        """
        Generates preview.png (1024px width) and thumbnail.png (256px width)
        by loading decimated raster bands. Stretches values using min-max normalization.
        """
        # Fetch dataset profile
        dataset = self.dataset_repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset registration {dataset_id} not found."
            )

        # Resolve paths dynamically relative to workspace root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        resolved_path = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))

        if not os.path.exists(resolved_path):
            raise HTTPException(
                status_code=400,
                detail=f"Dataset filesystem path does not exist: {dataset.dataset_path}"
            )

        # 1. Fetch or create preview record in database
        preview_record = self.repository.get_by_dataset(dataset_id)
        if not preview_record:
            preview_record = self.repository.create_preview(dataset_id, PreviewStatus.PENDING.value)
        else:
            self.repository.update_preview(preview_record.preview_id, {
                "preview_status": PreviewStatus.PENDING.value,
                "preview_image_path": None,
                "thumbnail_path": None,
                "preview_width": None,
                "preview_height": None,
                "band_count": None,
                "generation_time_ms": None
            })

        # 2. Transition status to GENERATING
        self.repository.update_preview(preview_record.preview_id, {
            "preview_status": PreviewStatus.GENERATING.value
        })

        start_time = time.perf_counter()

        try:
            # 3. Discover raster files
            tif_files = []
            for root, dirs, files in os.walk(resolved_path):
                for file in files:
                    if file.lower().endswith((".tif", ".tiff")):
                        tif_files.append(os.path.join(root, file))
            
            tif_files.sort()  # Sort alphabetically to be deterministic

            if not tif_files:
                raise ValueError("No raster .tif files discovered in the dataset directory.")

            # Open first TIFF to determine height and width ratio
            first_tif = tif_files[0]
            with rasterio.open(first_tif) as src:
                orig_width = src.width
                orig_height = src.height

            # Target preview width is MAX_PREVIEW_DIM pixels. Proportional height.
            preview_width = MAX_PREVIEW_DIM
            preview_height = int(orig_height * (preview_width / orig_width))

            channels = []

            # 4. Read band channels using decimation
            if len(tif_files) >= 3:
                # Multi-file band structure (like LISS-IV Band 2, 3, 4 files)
                # Map first 3 files to R, G, B channels
                for i in range(3):
                    with rasterio.open(tif_files[i]) as src:
                        band_data = src.read(
                            1,
                            out_shape=(preview_height, preview_width),
                            resampling=rasterio.enums.Resampling.bilinear
                        )
                        channels.append(band_data)
            elif len(tif_files) == 2:
                # Map 2 files to R, G and reuse G as B
                for i in range(2):
                    with rasterio.open(tif_files[i]) as src:
                        band_data = src.read(
                            1,
                            out_shape=(preview_height, preview_width),
                            resampling=rasterio.enums.Resampling.bilinear
                        )
                        channels.append(band_data)
                channels.append(channels[1])
            else:
                # Single multi-band file
                single_tif = tif_files[0]
                with rasterio.open(single_tif) as src:
                    num_bands = src.count
                    if num_bands >= 3:
                        for b_idx in (1, 2, 3):
                            band_data = src.read(
                                b_idx,
                                out_shape=(preview_height, preview_width),
                                resampling=rasterio.enums.Resampling.bilinear
                            )
                            channels.append(band_data)
                    elif num_bands == 2:
                        for b_idx in (1, 2):
                            band_data = src.read(
                                b_idx,
                                out_shape=(preview_height, preview_width),
                                resampling=rasterio.enums.Resampling.bilinear
                            )
                            channels.append(band_data)
                        channels.append(channels[1])
                    else:
                        band_data = src.read(
                            1,
                            out_shape=(preview_height, preview_width),
                            resampling=rasterio.enums.Resampling.bilinear
                        )
                        channels.append(band_data)
                        channels.append(band_data)
                        channels.append(band_data)

            # 5. Normalize channel pixels to 0-255 range
            def normalize_band(band):
                b_min = float(band.min())
                b_max = float(band.max())
                if b_max > b_min:
                    return ((band - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
                return np.zeros_like(band, dtype=np.uint8)

            r_norm = normalize_band(channels[0])
            g_norm = normalize_band(channels[1])
            b_norm = normalize_band(channels[2])

            rgb_stack = np.stack([r_norm, g_norm, b_norm], axis=-1)

            # 6. Create previews folder and save PNG images
            previews_dir = os.path.join(workspace_root, "datasets", "previews", dataset_id)
            os.makedirs(previews_dir, exist_ok=True)

            preview_png_path = os.path.join(previews_dir, "preview.png")
            thumb_png_path = os.path.join(previews_dir, "thumbnail.png")

            img = Image.fromarray(rgb_stack)
            img.save(preview_png_path, "PNG")

            # Scale thumbnail: width 256px
            thumb_width = 256
            thumb_height = int(preview_height * (thumb_width / preview_width))
            thumbnail_img = img.resize((thumb_width, thumb_height), Image.Resampling.BILINEAR)
            thumbnail_img.save(thumb_png_path, "PNG")

            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            # 7. Update database record to COMPLETED
            update_data = {
                "preview_status": PreviewStatus.COMPLETED.value,
                "preview_image_path": f"datasets/previews/{dataset_id}/preview.png",
                "thumbnail_path": f"datasets/previews/{dataset_id}/thumbnail.png",
                "preview_width": preview_width,
                "preview_height": preview_height,
                "band_count": len(tif_files) if len(tif_files) >= 3 else 3, # stacked output is RGB (3 channels)
                "generation_time_ms": elapsed_ms
            }

            db_preview = self.repository.update_preview(preview_record.preview_id, update_data)
            return PreviewResponse.model_validate(db_preview)

        except Exception as e:
            # Catch failures gracefully and update status
            print(f"Preview generation failed for dataset {dataset_id}: {e}")
            self.repository.update_preview(preview_record.preview_id, {
                "preview_status": PreviewStatus.FAILED.value
            })
            raise HTTPException(
                status_code=500,
                detail=f"Preview generation pipeline crashed: {e}"
            )

    def get_preview(self, dataset_id: str) -> PreviewResponse:
        """
        Retrieves preview metadata details by dataset ID.
        """
        preview = self.repository.get_by_dataset(dataset_id)
        if not preview:
            raise HTTPException(
                status_code=404,
                detail=f"No preview record found for dataset ID {dataset_id}."
            )
        return PreviewResponse.model_validate(preview)

    def get_image_path(self, dataset_id: str, is_thumbnail: bool = False) -> str:
        """
        Resolves absolute path of generated preview/thumbnail on disk.
        """
        preview = self.repository.get_by_dataset(dataset_id)
        if not preview or preview.preview_status != PreviewStatus.COMPLETED.value:
            raise HTTPException(
                status_code=404,
                detail=f"Generated preview assets not found for dataset {dataset_id}."
            )

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        
        rel_path = preview.thumbnail_path if is_thumbnail else preview.preview_image_path
        abs_path = os.path.abspath(os.path.join(workspace_root, rel_path))

        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=404,
                detail="Physical preview file not found on disk."
            )
        return abs_path

    def delete_preview(self, dataset_id: str) -> bool:
        """
        Purges preview record from SQLite and deletes generated PNGs from disk.
        Original dataset workspace remains untouched.
        """
        preview = self.repository.get_by_dataset(dataset_id)
        if not preview:
            raise HTTPException(
                status_code=404,
                detail=f"No preview record found for dataset ID {dataset_id}."
            )

        # Deleting preview images recursively on disk
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        preview_dir = os.path.join(workspace_root, "datasets", "previews", dataset_id)

        if os.path.exists(preview_dir):
            try:
                shutil.rmtree(preview_dir)
            except Exception as io_err:
                print(f"Warning: Could not remove generated preview files at {preview_dir}: {io_err}")

        return self.repository.delete_preview(dataset_id)
