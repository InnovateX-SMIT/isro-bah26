import os
import shutil
import uuid
import zipfile
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.repositories.dataset_repository import DatasetRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_inspection_repository import DatasetInspectionRepository
from app.services.dataset_service import DatasetService
from app.services.dataset_inspection_service import DatasetInspectionService
from app.schemas.dataset import DatasetResponse

class UploadService:
    """
    Service responsible for validating, extracting, registering,
    and triggering inspection for uploaded LISS-IV ZIP datasets.
    """
    def __init__(self, db: Session):
        self.db = db
        self.dataset_repo = DatasetRepository(db)
        self.session_repo = AnalysisSessionRepository(db)
        self.inspection_repo = DatasetInspectionRepository(db)
        
        self.dataset_service = DatasetService(self.dataset_repo, self.session_repo)
        self.inspection_service = DatasetInspectionService(self.inspection_repo, self.dataset_repo)

    def handle_upload(
        self,
        file: UploadFile,
        analysis_session_id: str,
        dataset_name: str
    ) -> DatasetResponse:
        # 1. Verify Analysis Session exists
        session = self.session_repo.get_by_id(analysis_session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {analysis_session_id} not found."
            )

        # Clean/verify dataset name
        if not dataset_name or not dataset_name.strip():
            # Fallback to ZIP filename without extension
            filename = file.filename or "uploaded_dataset"
            dataset_name = os.path.splitext(os.path.basename(filename))[0]
            
        dataset_name = dataset_name.strip()
        
        # 2. Setup paths dynamically relative to workspace root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        
        uploaded_dir = os.path.join(workspace_root, "datasets", "uploaded")
        os.makedirs(uploaded_dir, exist_ok=True)
        
        dest_path_rel = f"datasets/uploaded/{dataset_name}"
        dest_dir = os.path.abspath(os.path.join(workspace_root, dest_path_rel))
        
        # Check for duplicate folder or database entry
        if os.path.exists(dest_dir):
            raise HTTPException(
                status_code=409,
                detail=f"A dataset folder with name '{dataset_name}' already exists on disk."
            )
            
        existing = self.dataset_repo.list_session_datasets(analysis_session_id)
        for record in existing:
            if record.dataset_name == dataset_name or record.dataset_path == dest_path_rel:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Dataset with name '{dataset_name}' or path '{dest_path_rel}' "
                        f"is already registered under session {analysis_session_id}"
                    )
                )

        # 3. Save uploaded file to temp file inside the workspace
        temp_zip_path = os.path.join(uploaded_dir, f"temp_{uuid.uuid4()}.zip")
        try:
            with open(temp_zip_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            if os.path.exists(temp_zip_path):
                os.remove(temp_zip_path)
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
                # a. ZIP Slip prevention: Verify no traversal in entry paths
                real_dest_dir = os.path.realpath(dest_dir)
                for member in zip_ref.infolist():
                    # Resolve extraction path
                    target_path = os.path.realpath(os.path.join(real_dest_dir, member.filename))
                    if not target_path.startswith(real_dest_dir + os.sep) and target_path != real_dest_dir:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Security error: Invalid entry path in ZIP archive (ZIP Slip): {member.filename}"
                        )
                
                # b. Verify LISS-IV band requirements (case-insensitive check on basenames)
                namelist = zip_ref.namelist()
                basenames = [os.path.basename(f).lower() for f in namelist]
                
                required_files = ["band2.tif", "band3.tif", "band4.tif", "band_meta.txt"]
                missing = [r for r in required_files if r not in basenames]
                if missing:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid LISS-IV dataset: missing required files: {', '.join(missing)}"
                    )

                # c. Extract ZIP
                os.makedirs(dest_dir, exist_ok=True)
                zip_ref.extractall(dest_dir)
                
            # 5. Flatten single parent folder nesting if present
            # After extraction, if there is a single directory and no non-hidden files, move all files up.
            all_items = os.listdir(dest_dir)
            non_hidden = [item for item in all_items if not item.startswith(".")]
            if len(non_hidden) == 1:
                subdir_path = os.path.join(dest_dir, non_hidden[0])
                if os.path.isdir(subdir_path):
                    # Move everything up
                    for subitem in os.listdir(subdir_path):
                        src = os.path.join(subdir_path, subitem)
                        dst = os.path.join(dest_dir, subitem)
                        if os.path.exists(dst):
                            if os.path.isdir(dst):
                                shutil.rmtree(dst)
                            else:
                                os.remove(dst)
                        shutil.move(src, dst)
                    # Remove the now-empty subdirectory
                    shutil.rmtree(subdir_path)

        except HTTPException:
            if os.path.exists(dest_dir):
                shutil.rmtree(dest_dir)
            raise
        except Exception as e:
            if os.path.exists(dest_dir):
                shutil.rmtree(dest_dir)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process or extract ZIP archive: {e}"
            )
        finally:
            # Always clean up temporary zip file
            if os.path.exists(temp_zip_path):
                try:
                    os.remove(temp_zip_path)
                except Exception as clean_err:
                    print(f"Warning: Failed to delete temporary ZIP file {temp_zip_path}: {clean_err}")

        # 6. Database Registration
        try:
            dataset_resp = self.dataset_service.register_dataset(
                analysis_session_id=analysis_session_id,
                dataset_name=dataset_name,
                dataset_path=dest_path_rel,
                dataset_type="CUSTOM"
            )
        except Exception as db_err:
            # If DB registration fails, clean up the extracted files
            if os.path.exists(dest_dir):
                shutil.rmtree(dest_dir)
            raise HTTPException(
                status_code=500,
                detail=f"Database registration failed: {db_err}"
            )

        # 7. Trigger the existing inspection workflow
        try:
            self.inspection_service.run_inspection(dataset_resp.dataset_id)
        except Exception as insp_err:
            # Set dataset status in datasets table to FAILED on inspection error
            self.dataset_repo.update_status(dataset_resp.dataset_id, "FAILED")
            raise HTTPException(
                status_code=500,
                detail=f"Dataset registered but filesystem inspection failed: {insp_err}"
            )

        # 8. Set dataset status to VALIDATED as the final step
        try:
            updated_dataset = self.dataset_repo.update_status(dataset_resp.dataset_id, "VALIDATED")
            if updated_dataset:
                return DatasetResponse.model_validate(updated_dataset)
        except Exception as status_err:
            print(f"Warning: Failed to update dataset status to VALIDATED: {status_err}")
            
        return dataset_resp
