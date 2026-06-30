import os
import shutil
import uuid
import zipfile
import re
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.repositories.dataset_repository import DatasetRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_inspection_repository import DatasetInspectionRepository
from app.services.dataset_service import DatasetService
from app.services.dataset_inspection_service import DatasetInspectionService
from app.schemas.dataset import DatasetResponse, UploadValidationResponse, UploadStatus, RecoveredMetadata

class UploadService:
    """
    Service responsible for validating, extracting, recovering metadata,
    and finalizing registration of uploaded LISS-IV ZIP datasets.
    """
    def __init__(self, db: Session):
        self.db = db
        self.dataset_repo = DatasetRepository(db)
        self.session_repo = AnalysisSessionRepository(db)
        self.inspection_repo = DatasetInspectionRepository(db)
        
        self.dataset_service = DatasetService(self.dataset_repo, self.session_repo)
        self.inspection_service = DatasetInspectionService(self.inspection_repo, self.dataset_repo)

    def _get_workspace_root(self) -> str:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        if workspace_root == "/":
            if os.path.exists("/app"):
                workspace_root = "/app"
        return workspace_root

    def handle_upload(
        self,
        file: UploadFile,
        analysis_session_id: str,
        dataset_name: str
    ) -> UploadValidationResponse:
        # 1. Verify Analysis Session exists
        session = self.session_repo.get_by_id(analysis_session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {analysis_session_id} not found."
            )

        # Clean/verify dataset name
        if not dataset_name or not dataset_name.strip():
            filename = file.filename or "uploaded_dataset"
            dataset_name = os.path.splitext(os.path.basename(filename))[0]
        dataset_name = dataset_name.strip()

        # 2. Setup paths dynamically relative to workspace root
        workspace_root = self._get_workspace_root()
        uploaded_dir = os.path.join(workspace_root, "datasets", "uploaded")
        os.makedirs(uploaded_dir, exist_ok=True)

        # We first extract to a temporary session folder
        temp_session_id = f"temp_upload_{uuid.uuid4()}"
        temp_dir = os.path.abspath(os.path.join(uploaded_dir, temp_session_id))
        os.makedirs(temp_dir, exist_ok=True)

        temp_zip_path = os.path.join(uploaded_dir, f"temp_{uuid.uuid4()}.zip")

        # 3. Save uploaded file to temp zip
        try:
            with open(temp_zip_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            if os.path.exists(temp_zip_path):
                os.remove(temp_zip_path)
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to write uploaded file to disk: {e}"
            )

        # 4. Open and validate ZIP
        try:
            if not zipfile.is_zipfile(temp_zip_path):
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded file is not a valid ZIP archive."
                )

            with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
                # Check for empty zip
                namelist = zip_ref.namelist()
                if not namelist:
                    raise HTTPException(
                        status_code=400,
                        detail="The uploaded ZIP archive is empty."
                    )

                # ZIP Slip prevention
                real_temp_dir = os.path.realpath(temp_dir)
                for member in zip_ref.infolist():
                    target_path = os.path.realpath(os.path.join(real_temp_dir, member.filename))
                    if not target_path.startswith(real_temp_dir + os.sep) and target_path != real_temp_dir:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Security error: Invalid entry path in ZIP archive: {member.filename}"
                        )
                
                # Check that we have at least 3 TIFF files
                tiffs = [f for f in namelist if f.lower().endswith((".tif", ".tiff"))]
                if len(tiffs) < 3:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid LISS-IV dataset: ZIP must contain at least 3 band TIFF images, found {len(tiffs)}."
                    )

                # Extract ZIP to temp folder
                zip_ref.extractall(temp_dir)

            # Flatten nesting if present
            all_items = os.listdir(temp_dir)
            non_hidden = [item for item in all_items if not item.startswith(".")]
            if len(non_hidden) == 1:
                subdir_path = os.path.join(temp_dir, non_hidden[0])
                if os.path.isdir(subdir_path):
                    for subitem in os.listdir(subdir_path):
                        src = os.path.join(subdir_path, subitem)
                        dst = os.path.join(temp_dir, subitem)
                        if os.path.exists(dst):
                            if os.path.isdir(dst):
                                shutil.rmtree(dst)
                            else:
                                os.remove(dst)
                        shutil.move(src, dst)
                    shutil.rmtree(subdir_path)

            # Standardize band filenames
            self._standardize_band_filenames(temp_dir)

        except HTTPException:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            raise
        except zipfile.BadZipFile:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            raise HTTPException(
                status_code=400,
                detail="The uploaded ZIP archive is corrupted or has an invalid format."
            )
        except Exception as e:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process or extract ZIP archive: {e}"
            )
        finally:
            if os.path.exists(temp_zip_path):
                try:
                    os.remove(temp_zip_path)
                except Exception:
                    pass

        # 5. Recover metadata
        recovered = self._recover_metadata(temp_dir)
        
        # Check for missing fields
        missing_fields = []
        mandatory = ["acquisition_date", "crs", "latitude", "longitude", "sensor", "satellite"]
        for field in mandatory:
            if not recovered.get(field):
                missing_fields.append(field)

        if missing_fields:
            return UploadValidationResponse(
                status=UploadStatus.METADATA_REQUIRED,
                temp_session_id=temp_session_id,
                recovered_metadata=RecoveredMetadata(**recovered),
                missing_fields=missing_fields
            )

        # 6. Complete registration directly if all metadata is found
        return self._finalize_registration(
            temp_dir=temp_dir,
            analysis_session_id=analysis_session_id,
            dataset_name=dataset_name,
            metadata=recovered
        )

    def finalize_upload(
        self,
        temp_session_id: str,
        analysis_session_id: str,
        dataset_name: str,
        metadata: dict
    ) -> DatasetResponse:
        workspace_root = self._get_workspace_root()
        temp_dir = os.path.abspath(os.path.join(workspace_root, "datasets", "uploaded", temp_session_id))
        
        if not os.path.exists(temp_dir):
            raise HTTPException(
                status_code=404,
                detail="Temporary upload session not found or has expired."
            )

        # Validate fields
        try:
            lat = float(metadata.get("latitude"))
            lon = float(metadata.get("longitude"))
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                raise ValueError("Coordinates range invalid")
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="Invalid coordinates. Latitude must be between -90 and 90, Longitude must be between -180 and 180."
            )

        crs_str = str(metadata.get("crs", "")).strip()
        if not crs_str:
            raise HTTPException(
                status_code=400,
                detail="Coordinate Reference System (CRS) is required (e.g. EPSG:32643)."
            )

        acq_date = str(metadata.get("acquisition_date", "")).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", acq_date):
            raise HTTPException(
                status_code=400,
                detail="Acquisition date must be in YYYY-MM-DD format."
            )

        # Run finalized registration
        val_res = self._finalize_registration(
            temp_dir=temp_dir,
            analysis_session_id=analysis_session_id,
            dataset_name=dataset_name,
            metadata=metadata
        )
        return val_res.dataset

    def _finalize_registration(
        self,
        temp_dir: str,
        analysis_session_id: str,
        dataset_name: str,
        metadata: dict
    ) -> UploadValidationResponse:
        workspace_root = self._get_workspace_root()
        dest_path_rel = f"datasets/uploaded/{dataset_name}"
        dest_dir = os.path.abspath(os.path.join(workspace_root, dest_path_rel))

        # Check for duplicates
        if os.path.exists(dest_dir):
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            raise HTTPException(
                status_code=409,
                detail=f"A dataset folder with name '{dataset_name}' already exists on disk."
            )
            
        existing = self.dataset_repo.list_session_datasets(analysis_session_id)
        for record in existing:
            if record.dataset_name == dataset_name or record.dataset_path == dest_path_rel:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise HTTPException(
                    status_code=409,
                    detail=f"Dataset with name '{dataset_name}' is already registered under this session."
                )

        try:
            # Parse UTM zone if epsg is provided
            zone = 43
            epsg = 32643
            crs_clean = str(metadata.get("crs", "")).upper()
            match = re.search(r"326(\d{2})", crs_clean)
            if match:
                zone = int(match.group(1))
                epsg = 32600 + zone
            elif "4326" in crs_clean:
                epsg = 4326

            # Write standard band_meta.txt inside temp_dir
            band_meta_path = os.path.join(temp_dir, "band_meta.txt")
            with open(band_meta_path, "w", encoding="utf-8") as f:
                f.write(f"DateOfPass = {metadata.get('acquisition_date')}\n")
                f.write("Ellipsoid = WGS 84\n")
                f.write("Datum = WGS 84\n")
                f.write("MapProjection = UTM\n")
                f.write(f"ZoneNo = {zone}\n")
                f.write("NoOfBands = 3\n")
                f.write(f"Sensor = {metadata.get('sensor', 'LISS-IV')}\n")
                f.write(f"Satellite = {metadata.get('satellite', 'IRS-P6')}\n")
                f.write("NoPixels = 1000\n")
                f.write("NoScans = 1000\n")

            # Move temp folder to final destination
            shutil.move(temp_dir, dest_dir)

            # Register dataset
            dataset_resp = self.dataset_service.register_dataset(
                analysis_session_id=analysis_session_id,
                dataset_name=dataset_name,
                dataset_path=dest_path_rel,
                dataset_type="CUSTOM"
            )

        except Exception as e:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            if os.path.exists(dest_dir):
                shutil.rmtree(dest_dir)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to complete dataset registration: {e}"
            )

        # Trigger inspection
        try:
            self.inspection_service.run_inspection(dataset_resp.dataset_id)
        except Exception as insp_err:
            self.dataset_repo.update_status(dataset_resp.dataset_id, "FAILED")
            raise HTTPException(
                status_code=500,
                detail=f"Dataset registered but inspection failed: {insp_err}"
            )

        # Set status to VALIDATED
        try:
            updated_dataset = self.dataset_repo.update_status(dataset_resp.dataset_id, "VALIDATED")
            if updated_dataset:
                return UploadValidationResponse(
                    status=UploadStatus.SUCCESS,
                    dataset=DatasetResponse.model_validate(updated_dataset)
                )
        except Exception as status_err:
            print(f"Warning: Failed to update status: {status_err}")
            
        return UploadValidationResponse(
            status=UploadStatus.SUCCESS,
            dataset=dataset_resp
        )

    def _standardize_band_filenames(self, extraction_dir: str):
        tiffs = []
        for root, dirs, files in os.walk(extraction_dir):
            for file in files:
                if file.lower().endswith((".tif", ".tiff")):
                    tiffs.append(os.path.join(root, file))
        
        b2_path = next((t for t in tiffs if "band2" in os.path.basename(t).lower() or "b2" in os.path.basename(t).lower()), None)
        b3_path = next((t for t in tiffs if "band3" in os.path.basename(t).lower() or "b3" in os.path.basename(t).lower()), None)
        b4_path = next((t for t in tiffs if "band4" in os.path.basename(t).lower() or "b4" in os.path.basename(t).lower()), None)

        remaining_tiffs = [t for t in tiffs if t not in (b2_path, b3_path, b4_path)]
        remaining_tiffs.sort()

        if not b2_path and remaining_tiffs:
            b2_path = remaining_tiffs.pop(0)
        if not b3_path and remaining_tiffs:
            b3_path = remaining_tiffs.pop(0)
        if not b4_path and remaining_tiffs:
            b4_path = remaining_tiffs.pop(0)

        if not b2_path or not b3_path or not b4_path:
            raise HTTPException(
                status_code=400,
                detail="Incomplete dataset: Could not resolve the three standard band files (Band 2, Band 3, Band 4) from the archive."
            )

        target_b2 = os.path.join(extraction_dir, "band2.tif")
        target_b3 = os.path.join(extraction_dir, "band3.tif")
        target_b4 = os.path.join(extraction_dir, "band4.tif")

        if os.path.realpath(b2_path) != os.path.realpath(target_b2):
            shutil.move(b2_path, target_b2)
        if os.path.realpath(b3_path) != os.path.realpath(target_b3):
            shutil.move(b3_path, target_b3)
        if os.path.realpath(b4_path) != os.path.realpath(target_b4):
            shutil.move(b4_path, target_b4)

    def _recover_metadata(self, extraction_dir: str) -> dict:
        metadata = {
            "acquisition_date": None,
            "crs": None,
            "latitude": None,
            "longitude": None,
            "sensor": "LISS-IV",
            "satellite": "IRS-P6"
        }

        metadata_dict = {}
        for root, dirs, files in os.walk(extraction_dir):
            for file in files:
                file_lower = file.lower()
                full_path = os.path.join(root, file)
                if file_lower == "band_meta.txt" or file_lower.endswith(".meta"):
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            for line in f:
                                if "=" in line:
                                    parts = line.split("=", 1)
                                    key = parts[0].strip()
                                    val = parts[1].strip()
                                    if key:
                                        metadata_dict[key] = val
                    except Exception as e:
                        print(f"Error parsing metadata file {file} in recovery: {e}")

        if metadata_dict.get("DateOfPass"):
            metadata["acquisition_date"] = metadata_dict.get("DateOfPass")
        if metadata_dict.get("Sensor"):
            metadata["sensor"] = metadata_dict.get("Sensor")
        if metadata_dict.get("Satellite"):
            metadata["satellite"] = metadata_dict.get("Satellite")

        # Try to parse date from directory name
        if not metadata["acquisition_date"]:
            dir_name = os.path.basename(extraction_dir)
            date_match = re.search(r"(\d{4})[-_]?(\d{2})[-_]?(\d{2})", dir_name)
            if date_match:
                metadata["acquisition_date"] = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
            else:
                months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
                month_pattern = "|".join(months)
                match_txt = re.search(rf"(\d{{2}})({month_pattern})(\d{{4}})", dir_name, re.IGNORECASE)
                if match_txt:
                    day, mon, yr = match_txt.groups()
                    mon_num = months.index(mon.upper()) + 1
                    metadata["acquisition_date"] = f"{yr}-{mon_num:02d}-{day}"

        # Resolve from TIFF using rasterio
        tif_path = None
        for root, dirs, files in os.walk(extraction_dir):
            for file in files:
                if file.lower().endswith((".tif", ".tiff")) and "band2" in file.lower():
                    tif_path = os.path.join(root, file)
                    break
            if tif_path:
                break
        
        if not tif_path:
            for root, dirs, files in os.walk(extraction_dir):
                for file in files:
                    if file.lower().endswith((".tif", ".tiff")):
                        tif_path = os.path.join(root, file)
                        break
                if tif_path:
                    break

        if tif_path:
            import rasterio
            from pyproj import Transformer
            try:
                with rasterio.open(tif_path) as src:
                    if src.crs:
                        epsg = src.crs.to_epsg()
                        if epsg:
                            metadata["crs"] = f"EPSG:{epsg}"
                        else:
                            metadata["crs"] = src.crs.to_string()
                        
                        left, bottom, right, top = src.bounds
                        center_x = (left + right) / 2.0
                        center_y = (bottom + top) / 2.0
                        
                        transformer = Transformer.from_crs(src.crs, "EPSG:4326", always_xy=True)
                        center_lon, center_lat = transformer.transform(center_x, center_y)
                        
                        if -90 <= center_lat <= 90 and -180 <= center_lon <= 180:
                            metadata["latitude"] = round(center_lat, 6)
                            metadata["longitude"] = round(center_lon, 6)
            except Exception as e:
                print(f"Rasterio metadata recovery failed on {tif_path}: {e}")

        return metadata
