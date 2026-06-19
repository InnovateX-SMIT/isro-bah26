import os
from fastapi import HTTPException
from app.repositories.dataset_inspection_repository import DatasetInspectionRepository
from app.repositories.dataset_repository import DatasetRepository
from app.schemas.dataset_inspection import DatasetInspectionResponse, DatasetFileResponse, FileCategory, InspectionStatus

class DatasetInspectionService:
    """
    Service executing the filesystem scan, categorizing files, and building
    the database profile/inventory for dataset folders.
    """
    def __init__(
        self,
        repository: DatasetInspectionRepository,
        dataset_repository: DatasetRepository
    ):
        self.repository = repository
        self.dataset_repository = dataset_repository

    def run_inspection(self, dataset_id: str) -> DatasetInspectionResponse:
        """
        Scans filesystem recursively at the dataset path.
        Saves file inventories, categorizes extensions, and updates metadata counts.
        """
        # 1. Fetch dataset profile
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

        # 2. Clear pre-existing inspection runs to support re-runs cleanly
        existing = self.repository.get_by_dataset(dataset_id)
        if existing:
            self.repository.delete_inspection(dataset_id)

        # 3. Create a PENDING scan log
        inspection = self.repository.create_inspection(dataset_id, status=InspectionStatus.PENDING.value)

        total_files = 0
        total_tif = 0
        total_xml = 0
        total_txt = 0
        total_meta = 0
        total_jpg = 0
        discovered_files = []

        try:
            # 4. Recursively walk dataset folder
            for root, dirs, files in os.walk(resolved_path):
                # Deterministic sorting
                files.sort()
                for file in files:
                    if file.startswith("."):
                        # Skip gitignore, hidden metadata etc.
                        continue

                    full_path = os.path.join(root, file)
                    file_size = os.path.getsize(full_path)

                    # Path relative to project root
                    relative_path = os.path.relpath(full_path, workspace_root).replace(os.sep, "/")

                    # Analyze extension
                    _, ext = os.path.splitext(file)
                    ext_lower = ext.lower()

                    # Categorize extensions
                    if ext_lower in (".tif", ".tiff"):
                        category = FileCategory.TIF
                        total_tif += 1
                    elif ext_lower == ".xml":
                        category = FileCategory.XML
                        total_xml += 1
                    elif ext_lower == ".txt":
                        category = FileCategory.TXT
                        total_txt += 1
                    elif ext_lower == ".meta":
                        category = FileCategory.META
                        total_meta += 1
                    elif ext_lower in (".jpg", ".jpeg"):
                        category = FileCategory.JPG
                        total_jpg += 1
                    else:
                        category = FileCategory.OTHER

                    total_files += 1
                    discovered_files.append({
                        "file_name": file,
                        "file_extension": ext_lower,
                        "relative_path": relative_path,
                        "file_size_bytes": file_size,
                        "file_category": category.value
                    })

            # 5. Insert individual file records into SQLite
            for f_info in discovered_files:
                self.repository.create_file_entry(
                    inspection_id=inspection.inspection_id,
                    file_name=f_info["file_name"],
                    file_extension=f_info["file_extension"],
                    relative_path=f_info["relative_path"],
                    file_size_bytes=f_info["file_size_bytes"],
                    file_category=f_info["file_category"]
                )

            # 6. Finalize inspection status and counts
            inspection.inspection_status = InspectionStatus.COMPLETED.value
            inspection.total_files = total_files
            inspection.total_tif_files = total_tif
            inspection.total_xml_files = total_xml
            inspection.total_txt_files = total_txt
            inspection.total_meta_files = total_meta
            inspection.total_jpg_files = total_jpg

            self.repository.db.commit()
            self.repository.db.refresh(inspection)

        except Exception as e:
            # Mark scan run as FAILED on error
            inspection.inspection_status = InspectionStatus.FAILED.value
            self.repository.db.commit()
            self.repository.db.refresh(inspection)
            raise HTTPException(
                status_code=500,
                detail=f"Fs walk scanning failed: {e}"
            )

        return DatasetInspectionResponse.model_validate(inspection)

    def get_inspection(self, dataset_id: str) -> DatasetInspectionResponse:
        """
        Fetches session/dataset inspection summaries. Raises 404 if not found.
        """
        inspection = self.repository.get_by_dataset(dataset_id)
        if not inspection:
            raise HTTPException(
                status_code=404,
                detail=f"No inspection profile found for dataset ID {dataset_id}."
            )
        return DatasetInspectionResponse.model_validate(inspection)

    def list_files(self, dataset_id: str) -> list[DatasetFileResponse]:
        """
        Lists discovered files linked to the dataset's inspection run.
        """
        inspection = self.repository.get_by_dataset(dataset_id)
        if not inspection:
            raise HTTPException(
                status_code=404,
                detail=f"No inspection profile found for dataset ID {dataset_id}."
            )
        files = self.repository.list_files(inspection.inspection_id)
        return [DatasetFileResponse.model_validate(f) for f in files]

    def delete_inspection(self, dataset_id: str) -> bool:
        """
        Purges inspection summaries and cascading files indexes.
        """
        inspection = self.repository.get_by_dataset(dataset_id)
        if not inspection:
            raise HTTPException(
                status_code=404,
                detail=f"No inspection profile found for dataset ID {dataset_id}."
            )
        return self.repository.delete_inspection(dataset_id)
