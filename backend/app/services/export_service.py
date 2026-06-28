import os
import shutil
import time
import uuid
from typing import Dict, Any, List, Optional
import numpy as np
from PIL import Image
import rasterio
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.export_repository import ExportRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.models.export import Export
from app.models.reconstruction_run import ReconstructionRun
from app.models.confidence_estimation import ConfidenceEstimation
from app.models.confidence_heatmap import ConfidenceHeatmap
from app.models.cloud_segmentation import CloudSegmentation
from app.schemas.export import ExportResponse, ExportValidationResponse

class ExportService:
    """
    Service layer coordinating the Raster Export System:
    1. Validates layers availability based on workflow state.
    2. Resolves source raster paths relative to workspace root.
    3. Compiles exported products into a dedicated directory.
    4. Handles format conversions: GeoTIFF projection mapping, PNG, and JPG.
    """
    def __init__(
        self,
        db: Session,
        export_repo: ExportRepository,
        session_repo: AnalysisSessionRepository,
        dataset_repo: DatasetRepository
    ):
        self.db = db
        self.export_repo = export_repo
        self.session_repo = session_repo
        self.dataset_repo = dataset_repo

    def validate_export_request(self, session_id: str, layer: str, format: str) -> ExportValidationResponse:
        """
        Validates if the requested layer is fully generated and ready to export,
        and checks if the format is compatible.
        """
        # Validate Session
        session = self.session_repo.get_by_id(session_id)
        if not session:
            return ExportValidationResponse(valid=False, message=f"Analysis session '{session_id}' not found.")

        # Validate Dataset
        datasets = self.dataset_repo.list_session_datasets(session_id)
        if not datasets:
            return ExportValidationResponse(valid=False, message="No datasets registered under this session.")
        dataset = datasets[0]
        dataset_id = dataset.dataset_id

        # Validate Format
        allowed_formats = ["GeoTIFF", "PNG", "JPG"]
        if format not in allowed_formats:
            return ExportValidationResponse(valid=False, message=f"Format '{format}' is not supported. Must be one of {allowed_formats}")

        # Validate Layer availability
        layer_lower = layer.lower()
        
        try:
            source_path, _ = self._resolve_layer_paths(session_id, dataset_id, layer_lower)
            if not source_path:
                return ExportValidationResponse(valid=False, message=f"Layer '{layer}' does not have a valid output registered.")
            
            # Check physical file existence
            current_dir = os.path.dirname(os.path.abspath(__file__))
            workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
            abs_source_path = os.path.abspath(os.path.join(workspace_root, source_path))
            
            if not os.path.exists(abs_source_path):
                return ExportValidationResponse(
                    valid=False,
                    message=f"Layer '{layer}' record exists in database, but the physical file is missing from workspace disk."
                )
            
            return ExportValidationResponse(valid=True, message="Asset is compiled and ready for operational export.")
            
        except HTTPException as he:
            return ExportValidationResponse(valid=False, message=he.detail)
        except Exception as e:
            return ExportValidationResponse(valid=False, message=f"Failed validation due to internal error: {str(e)}")

    def trigger_export(self, session_id: str, layer: str, format: str) -> ExportResponse:
        """
        Triggers compiling and converting the selected layer into the requested format.
        Outputs to datasets/exports/{export_id}/
        """
        # Perform validation first
        validation = self.validate_export_request(session_id, layer, format)
        if not validation.valid:
            raise HTTPException(status_code=400, detail=validation.message)

        # Get dataset
        datasets = self.dataset_repo.list_session_datasets(session_id)
        dataset = datasets[0]
        dataset_id = dataset.dataset_id
        dataset_name = dataset.dataset_name

        # Create export record in DB
        export_record = self.export_repo.create(session_id, layer, format, status="PROCESSING")
        export_id = export_record.export_id

        # Setup paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        exports_dir = os.path.abspath(os.path.join(workspace_root, "datasets", "exports", export_id))
        os.makedirs(exports_dir, exist_ok=True)

        try:
            # Resolve layer paths
            source_rel_path, preview_rel_path = self._resolve_layer_paths(session_id, dataset_id, layer.lower())
            
            src_abs_path = os.path.abspath(os.path.join(workspace_root, source_rel_path))
            
            # Determine output filename and extension
            ext = self._get_extension_for_format(format)
            safe_dataset_name = dataset_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
            dest_filename = f"{safe_dataset_name}_{layer.lower()}_{export_id[:8]}.{ext}"
            dest_abs_path = os.path.join(exports_dir, dest_filename)
            dest_rel_path = f"datasets/exports/{export_id}/{dest_filename}"

            # Run compilation and format conversion
            self._compile_and_convert(
                dataset=dataset,
                workspace_root=workspace_root,
                src_abs_path=src_abs_path,
                dest_abs_path=dest_abs_path,
                preview_rel_path=preview_rel_path,
                format=format
            )

            # Update DB to COMPLETED
            file_size = os.path.getsize(dest_abs_path)
            updated_record = self.export_repo.update_status(
                export_id=export_id,
                status="COMPLETED",
                file_path=dest_rel_path,
                file_size_bytes=file_size
            )
            return ExportResponse.model_validate(updated_record)

        except Exception as e:
            # Update DB to FAILED
            error_msg = f"Compilation crashed: {str(e)}"
            self.export_repo.update_status(
                export_id=export_id,
                status="FAILED",
                error_message=error_msg
            )
            raise HTTPException(status_code=500, detail=error_msg)

    def get_export_file_path(self, export_id: str) -> str:
        """
        Resolves the absolute path of a completed export file for download.
        """
        export_run = self.export_repo.get_by_id(export_id)
        if not export_run or export_run.status != "COMPLETED":
            raise HTTPException(status_code=404, detail=f"Completed export run {export_id} not found.")

        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        abs_path = os.path.abspath(os.path.join(workspace_root, export_run.file_path))

        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Physical export file not found on disk storage.")
        return abs_path

    def _resolve_layer_paths(self, session_id: str, dataset_id: str, layer: str) -> tuple:
        """
        Helper resolving source paths for requested layers.
        Returns: (source_rel_path, preview_rel_path)
        """
        if layer == "reconstruction":
            run = self.db.query(ReconstructionRun).filter(
                ReconstructionRun.session_id == session_id
            ).order_by(ReconstructionRun.created_at.desc()).first()
            if not run or run.reconstruction_status != "COMPLETED":
                raise HTTPException(status_code=404, detail="Completed baseline reconstruction run not found.")
            return run.output_image_path, run.preview_image_path

        elif layer == "optimized_reconstruction":
            run = self.db.query(ReconstructionRun).filter(
                ReconstructionRun.session_id == session_id
            ).order_by(ReconstructionRun.created_at.desc()).first()
            if not run or run.optimization_status != "COMPLETED":
                raise HTTPException(status_code=404, detail="Completed optimized reconstruction run not found.")
            return run.optimized_output_path, run.optimized_preview_path

        elif layer == "cloud_mask":
            seg = self.db.query(CloudSegmentation).filter(
                CloudSegmentation.dataset_id == dataset_id
            ).first()
            if not seg or seg.segmentation_status != "completed":
                raise HTTPException(status_code=404, detail="Completed cloud segmentation layers not found.")
            return seg.segmentation_mask_path, seg.segmentation_preview_path

        elif layer == "reconstruction_mask":
            seg = self.db.query(CloudSegmentation).filter(
                CloudSegmentation.dataset_id == dataset_id
            ).first()
            if not seg or seg.segmentation_status != "completed":
                raise HTTPException(status_code=404, detail="Completed binary reconstruction mask not found.")
            return seg.reconstruction_mask_path, seg.segmentation_preview_path

        elif layer == "confidence_map":
            conf = self.db.query(ConfidenceEstimation).filter(
                ConfidenceEstimation.dataset_id == dataset_id
            ).first()
            if not conf or conf.confidence_status != "completed":
                raise HTTPException(status_code=404, detail="Completed confidence estimation map not found.")
            return conf.confidence_map_path, conf.confidence_preview_path

        elif layer == "confidence_overlay":
            heatmap = self.db.query(ConfidenceHeatmap).filter(
                ConfidenceHeatmap.dataset_id == dataset_id
            ).first()
            if not heatmap or heatmap.heatmap_status != "completed":
                raise HTTPException(status_code=404, detail="Completed confidence overlay map not found.")
            # Source overlay is a PNG directly
            return heatmap.confidence_overlay_path, heatmap.confidence_overlay_path

        elif layer == "reliability_map":
            heatmap = self.db.query(ConfidenceHeatmap).filter(
                ConfidenceHeatmap.dataset_id == dataset_id
            ).first()
            if not heatmap or heatmap.heatmap_status != "completed":
                raise HTTPException(status_code=404, detail="Completed reliability tier map not found.")
            # Source reliability map is a PNG directly
            return heatmap.reliability_map_path, heatmap.reliability_map_path

        else:
            raise HTTPException(status_code=400, detail=f"Layer type '{layer}' is unrecognized.")

    def _get_extension_for_format(self, format: str) -> str:
        if format == "GeoTIFF":
            return "tif"
        elif format == "PNG":
            return "png"
        elif format == "JPG":
            return "jpg"
        return "bin"

    def _compile_and_convert(
        self,
        dataset: Any,
        workspace_root: str,
        src_abs_path: str,
        dest_abs_path: str,
        preview_rel_path: Optional[str],
        format: str
    ) -> None:
        """
        Executes format conversion based on requirements.
        - GeoTIFF output: preserves georeferencing coordinates.
        - PNG / JPG output: exports visual layout outputs.
        """
        src_is_tiff = src_abs_path.lower().endswith((".tif", ".tiff"))

        # Case A: User requests GeoTIFF format
        if format == "GeoTIFF":
            if src_is_tiff:
                # Fast direct copy of the original georeferenced TIFF
                shutil.copy2(src_abs_path, dest_abs_path)
            else:
                # Source is a PNG image, but user requested a GeoTIFF.
                # We project it back to coordinates using original dataset references.
                self._georeference_png_to_tiff(dataset, workspace_root, src_abs_path, dest_abs_path)

        # Case B: User requests PNG format
        elif format == "PNG":
            if not src_is_tiff:
                # Source is already a PNG, direct copy
                shutil.copy2(src_abs_path, dest_abs_path)
            else:
                # Source is a TIFF. If there's an existing preview PNG, copy it to avoid conversion load.
                if preview_rel_path and os.path.exists(os.path.join(workspace_root, preview_rel_path)):
                    shutil.copy2(os.path.join(workspace_root, preview_rel_path), dest_abs_path)
                else:
                    # Fallback manual conversion of TIFF to 8-bit visual PNG
                    self._convert_tiff_to_visual_image(src_abs_path, dest_abs_path, "PNG")

        # Case C: User requests JPG format
        elif format == "JPG":
            # Read from preview PNG if available to maintain speed, or from the source PNG
            img_source = src_abs_path
            if src_is_tiff:
                if preview_rel_path and os.path.exists(os.path.join(workspace_root, preview_rel_path)):
                    img_source = os.path.join(workspace_root, preview_rel_path)
                else:
                    # Fallback convert TIFF to a temporary preview
                    temp_png = dest_abs_path + ".temp.png"
                    self._convert_tiff_to_visual_image(src_abs_path, temp_png, "PNG")
                    img_source = temp_png

            # Save to JPEG (must convert to RGB since JPG doesn't support transparency/Alpha)
            img = Image.open(img_source)
            rgb_img = img.convert("RGB")
            rgb_img.save(dest_abs_path, "JPEG")

            # Clean up temp files
            if src_is_tiff and not preview_rel_path:
                try:
                    os.remove(dest_abs_path + ".temp.png")
                except Exception:
                    pass

    def _convert_tiff_to_visual_image(self, tiff_path: str, dest_path: str, format_name: str) -> None:
        """
        Reads first 3 bands of a TIFF, normalizes values to 0-255 range, and writes as PNG/JPG.
        """
        with rasterio.open(tiff_path) as src:
            count = src.count
            width = min(1024, src.width)
            height = int(src.height * (width / src.width))
            
            channels = []
            if count >= 3:
                # R, G, B
                for b_idx in (1, 2, 3):
                    channels.append(src.read(
                        b_idx,
                        out_shape=(height, width),
                        resampling=rasterio.enums.Resampling.bilinear
                    ))
            else:
                # Single band (like mask/confidence) repeated
                b1 = src.read(
                    1,
                    out_shape=(height, width),
                    resampling=rasterio.enums.Resampling.bilinear
                )
                channels = [b1, b1, b1]

        def normalize(band):
            b_min = float(band.min())
            b_max = float(band.max())
            if b_max > b_min:
                return ((band - b_min) / (b_max - b_min) * 255.0).astype(np.uint8)
            return np.zeros_like(band, dtype=np.uint8)

        r = normalize(channels[0])
        g = normalize(channels[1])
        b = normalize(channels[2])
        rgb = np.stack([r, g, b], axis=-1)

        img = Image.fromarray(rgb)
        img.save(dest_path, format_name)

    def _georeference_png_to_tiff(self, dataset: Any, workspace_root: str, png_path: str, tiff_path: str) -> None:
        """
        Georeferences a static overlay PNG using original geospatial profiles, writing a GIS-ready TIFF.
        """
        # Discover first raw raster in dataset to copy exact EPSG CRS & Transforms
        dataset_dir = os.path.abspath(os.path.join(workspace_root, dataset.dataset_path))
        tif_files = []
        for root, _, files in os.walk(dataset_dir):
            for file in files:
                if file.lower().endswith((".tif", ".tiff")):
                    tif_files.append(os.path.join(root, file))
        
        if not tif_files:
            raise ValueError("No base GeoTIFF found in original dataset path to extract spatial reference.")
        
        base_tif = sorted(tif_files)[0]

        # Read reference coordinate system from base file
        with rasterio.open(base_tif) as ref:
            ref_crs = ref.crs
            ref_transform = ref.transform
            ref_width = ref.width
            ref_height = ref.height

        # Load PNG image channels
        img = Image.open(png_path)
        # Resize visual PNG pixels to match base satellite image bounds exactly
        if img.size != (ref_width, ref_height):
            img = img.resize((ref_width, ref_height), Image.Resampling.BILINEAR)

        img_data = np.array(img)
        
        # Split into band channels
        if len(img_data.shape) == 3:
            bands = img_data.shape[2]
            img_data = img_data.transpose(2, 0, 1) # Convert to shape: (C, H, W)
        else:
            bands = 1
            img_data = img_data[np.newaxis, ...] # Convert to shape: (1, H, W)

        profile = {
            "driver": "GTiff",
            "dtype": "uint8",
            "nodata": None,
            "width": ref_width,
            "height": ref_height,
            "count": bands,
            "crs": ref_crs,
            "transform": ref_transform,
            "tiled": False
        }

        # Write georeferenced output
        with rasterio.open(tiff_path, "w", **profile) as dst:
            dst.write(img_data)
