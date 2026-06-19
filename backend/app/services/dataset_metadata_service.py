import os
import re
from fastapi import HTTPException
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset_metadata import DatasetMetadataResponse, MetadataStatus

class DatasetMetadataService:
    """
    Service layer coordinating the parsing of text metadata files (.meta, BAND_META.txt)
    and GeoTIFF bands metadata using rasterio, then storing findings in SQLite.
    """
    def __init__(
        self,
        repository: DatasetMetadataRepository,
        dataset_repository: DatasetRepository
    ):
        self.repository = repository
        self.dataset_repository = dataset_repository

    def run_extraction(self, dataset_id: str) -> DatasetMetadataResponse:
        """
        Runs the extraction pipeline:
        1. Deletes any pre-existing metadata record.
        2. Creates a PENDING metadata record.
        3. Updates status to EXTRACTING.
        4. Parses key-value pairs from BAND_META.txt / *.meta.
        5. Parses GeoTIFF spatial headers (.tif / .tiff) using rasterio.
        6. Merges and updates the record, setting status to COMPLETED (or FAILED on error).
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

        # 1. Fetch existing or create new metadata record
        metadata_record = self.repository.get_by_dataset(dataset_id)
        if not metadata_record:
            metadata_record = self.repository.create_metadata(dataset_id, MetadataStatus.PENDING.value)
        else:
            # Reset existing record fields to PENDING
            self.repository.update_metadata(metadata_record.metadata_id, {
                "coordinate_system": None,
                "projection_name": None,
                "epsg_code": None,
                "utm_zone": None,
                "origin_x": None,
                "origin_y": None,
                "pixel_size_x": None,
                "pixel_size_y": None,
                "raster_width": None,
                "raster_height": None,
                "band_count": None,
                "acquisition_date": None,
                "metadata_status": MetadataStatus.PENDING.value
            })

        # 3. Transition to EXTRACTING
        self.repository.update_metadata(metadata_record.metadata_id, {
            "metadata_status": MetadataStatus.EXTRACTING.value
        })

        try:
            metadata_dict = {}
            tif_file_path = None

            # 4. Recursively scan the folder for text metadata files & first .tif file
            for root, dirs, files in os.walk(resolved_path):
                for file in files:
                    file_lower = file.lower()
                    full_file_path = os.path.join(root, file)

                    # Gather key-value pairs from text metadata files
                    if file_lower == "band_meta.txt" or file_lower.endswith(".meta"):
                        try:
                            with open(full_file_path, "r", encoding="utf-8", errors="ignore") as f:
                                for line in f:
                                    if "=" in line:
                                        parts = line.split("=", 1)
                                        key = parts[0].strip()
                                        val = parts[1].strip()
                                        if key:
                                            metadata_dict[key] = val
                        except Exception as parse_err:
                            print(f"Error parsing metadata file {file}: {parse_err}")

                    # Detect first tif file
                    if not tif_file_path and file_lower.endswith((".tif", ".tiff")):
                        tif_file_path = full_file_path

            # 5. Extract GeoTIFF coordinates via Rasterio
            raster_data = {}
            if tif_file_path:
                import rasterio
                try:
                    with rasterio.open(tif_file_path) as src:
                        raster_data["raster_width"] = src.width
                        raster_data["raster_height"] = src.height
                        raster_data["band_count"] = src.count
                        
                        # Affine transform coordinates (top-left) and resolution
                        raster_data["origin_x"] = float(src.transform[2])
                        raster_data["origin_y"] = float(src.transform[5])
                        raster_data["pixel_size_x"] = float(src.transform[0])
                        raster_data["pixel_size_y"] = float(src.transform[4])

                        # Coordinate reference system and projections
                        if src.crs:
                            epsg = src.crs.to_epsg()
                            if epsg:
                                raster_data["epsg_code"] = int(epsg)
                            
                            crs_str = src.crs.to_string()
                            if src.crs.is_projected:
                                zone = None
                                if hasattr(src.crs, "data") and src.crs.data.get("zone"):
                                    zone = int(src.crs.data.get("zone"))
                                else:
                                    match = re.search(r"326(\d{2})", crs_str)
                                    if match:
                                        zone = int(match.group(1))
                                
                                if zone:
                                    raster_data["projection_name"] = f"WGS 84 / UTM zone {zone}N"
                                    raster_data["utm_zone"] = zone
                                else:
                                    raster_data["projection_name"] = "UTM"
                            else:
                                raster_data["projection_name"] = "Geographic"
                            
                            raster_data["coordinate_system"] = "WGS 84"
                except Exception as raster_err:
                    print(f"Rasterio extraction failed on {tif_file_path}: {raster_err}")

            # Helper functions for safe extraction from text metadata
            def get_safe_int(k):
                v = metadata_dict.get(k)
                if v is not None:
                    # Strip out any non-numeric characters for simple integer casting
                    cleaned = "".join(filter(str.isdigit, str(v).strip()))
                    if cleaned:
                        return int(cleaned)
                return None

            def get_safe_float(k):
                v = metadata_dict.get(k)
                if v is not None:
                    try:
                        return float(str(v).strip())
                    except ValueError:
                        return None
                return None

            # 6. Merge text metadata and rasterio metadata
            # Start with text metadata values
            merged = {
                "coordinate_system": metadata_dict.get("Datum") or metadata_dict.get("Ellipsoid"),
                "projection_name": metadata_dict.get("MapProjection"),
                "epsg_code": None, # EPSG is usually only in GeoTIFF / CRS
                "utm_zone": get_safe_int("ZoneNo"),
                "origin_x": get_safe_float("ProdULMapX"),
                "origin_y": get_safe_float("ProdULMapY"),
                "pixel_size_x": get_safe_float("OutputResolutionAlong"),
                "pixel_size_y": get_safe_float("OutputResolutionAcross"),
                "raster_width": get_safe_int("NoPixels"),
                "raster_height": get_safe_int("NoScans"),
                "band_count": get_safe_int("NoOfBands"),
                "acquisition_date": metadata_dict.get("DateOfPass")
            }

            # Supplement with Rasterio GeoTIFF tags
            for key, val in raster_data.items():
                if val is not None:
                    # Do not override band_count if it is already extracted from metadata files and is > 1
                    if key == "band_count" and merged.get("band_count") and merged["band_count"] > 1:
                        continue
                    merged[key] = val

            # Normalize values / apply defaults
            if not merged["coordinate_system"]:
                merged["coordinate_system"] = "WGS 84"
            else:
                normalized_cs = str(merged["coordinate_system"]).strip().replace("_", " ").upper()
                if normalized_cs in ("WGS84", "WGS 84"):
                    merged["coordinate_system"] = "WGS 84"
                else:
                    merged["coordinate_system"] = normalized_cs

            if not merged["projection_name"]:
                merged["projection_name"] = "UTM"
            
            # Make sure EPSG is set if we have UTM zone 43
            # If UTM zone 43 is detected, datum is WGS84, and EPSG isn't set, we can map to EPSG:32643
            if merged["utm_zone"] == 43 and not merged["epsg_code"]:
                merged["epsg_code"] = 32643

            # Apply final completed values
            merged["metadata_status"] = MetadataStatus.COMPLETED.value
            db_metadata = self.repository.update_metadata(metadata_record.metadata_id, merged)
            return DatasetMetadataResponse.model_validate(db_metadata)

        except Exception as run_err:
            # Catch parsing anomalies and fail gracefully in DB status
            print(f"Metadata extraction failed for dataset {dataset_id}: {run_err}")
            self.repository.update_metadata(metadata_record.metadata_id, {
                "metadata_status": MetadataStatus.FAILED.value
            })
            raise HTTPException(
                status_code=500,
                detail=f"Metadata extraction pipeline failed: {run_err}"
            )

    def get_metadata(self, dataset_id: str) -> DatasetMetadataResponse:
        """
        Retrieves the metadata intelligence profile.
        """
        metadata = self.repository.get_by_dataset(dataset_id)
        if not metadata:
            raise HTTPException(
                status_code=404,
                detail=f"No metadata intelligence profile found for dataset ID {dataset_id}."
            )
        return DatasetMetadataResponse.model_validate(metadata)

    def delete_metadata(self, dataset_id: str) -> bool:
        """
        Deletes the metadata intelligence record from database.
        """
        metadata = self.repository.get_by_dataset(dataset_id)
        if not metadata:
            raise HTTPException(
                status_code=404,
                detail=f"No metadata intelligence profile found for dataset ID {dataset_id}."
            )
        return self.repository.delete_metadata(dataset_id)
