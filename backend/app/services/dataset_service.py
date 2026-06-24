import os
from fastapi import HTTPException
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.schemas.dataset import DatasetResponse

class DatasetService:
    """
    Service class executing business logic and validation for Dataset Registrations.
    """
    def __init__(
        self,
        repository: DatasetRepository,
        session_repository: AnalysisSessionRepository
    ):
        self.repository = repository
        self.session_repository = session_repository

    def register_dataset(
        self,
        analysis_session_id: str,
        dataset_name: str,
        dataset_path: str,
        dataset_type: str
    ) -> DatasetResponse:
        """
        Registers a dataset under an Analysis Session.
        Validates session existence, duplicate registrations, empty names, and path existence.
        """
        # 1. Verify Analysis Session exists
        session = self.session_repository.get_by_id(analysis_session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {analysis_session_id} not found"
            )

        # 2. Verify name is not empty
        if not dataset_name or not dataset_name.strip():
            raise HTTPException(
                status_code=400,
                detail="Dataset name cannot be empty"
            )

        # 3. Verify path exists on disk (resolved relative to project workspace root)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        resolved_path = os.path.abspath(os.path.join(workspace_root, dataset_path))

        if not os.path.exists(resolved_path):
            raise HTTPException(
                status_code=400,
                detail=f"Dataset directory path does not exist on local disk: {dataset_path}"
            )

        # 4. Verify same dataset (name or path) is not duplicate registered under this session
        existing = self.repository.list_session_datasets(analysis_session_id)
        for record in existing:
            if record.dataset_name == dataset_name or record.dataset_path == dataset_path:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Dataset with name '{dataset_name}' or path '{dataset_path}' "
                        f"is already registered under session {analysis_session_id}"
                    )
                )

        # 5. Create
        dataset = self.repository.create_dataset(
            analysis_session_id=analysis_session_id,
            dataset_name=dataset_name,
            dataset_path=dataset_path,
            dataset_type=dataset_type
        )
        return DatasetResponse.model_validate(dataset)

    def get_dataset(self, dataset_id: str) -> DatasetResponse:
        """
        Fetches dataset details. Raises 404 if not found.
        """
        dataset = self.repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset registration {dataset_id} not found"
            )
        return DatasetResponse.model_validate(dataset)

    def list_datasets(self) -> list[DatasetResponse]:
        """
        Lists all registered datasets.
        """
        datasets = self.repository.list_datasets()
        return [DatasetResponse.model_validate(d) for d in datasets]

    def list_session_datasets(self, session_id: str) -> list[DatasetResponse]:
        """
        Lists datasets registered to a specific session. Raises 404 if session doesn't exist.
        """
        session = self.session_repository.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis Session {session_id} not found"
            )
        datasets = self.repository.list_session_datasets(session_id)
        return [DatasetResponse.model_validate(d) for d in datasets]

    def delete_dataset(self, dataset_id: str) -> bool:
        """
        Purges a dataset registration record. Raises 404 if not found.
        """
        dataset = self.repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset registration {dataset_id} not found"
            )

        # Clean up physical preview directory on disk if it exists
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
        preview_dir = os.path.join(workspace_root, "datasets", "previews", dataset_id)
        if os.path.exists(preview_dir):
            import shutil
            try:
                shutil.rmtree(preview_dir)
            except Exception as io_err:
                print(f"Warning: Could not remove preview directory {preview_dir} on dataset purge: {io_err}")

        # Clean up physical cloud detection directory on disk if it exists
        cloud_dir = os.path.join(workspace_root, "datasets", "cloud_detections", dataset_id)
        if os.path.exists(cloud_dir):
            import shutil
            try:
                shutil.rmtree(cloud_dir)
            except Exception as io_err:
                print(f"Warning: Could not remove cloud detection directory {cloud_dir} on dataset purge: {io_err}")

        # Clean up physical cloud classification directory on disk if it exists
        class_dir = os.path.join(workspace_root, "datasets", "cloud_classifications", dataset_id)
        if os.path.exists(class_dir):
            import shutil
            try:
                shutil.rmtree(class_dir)
            except Exception as io_err:
                print(f"Warning: Could not remove cloud classification directory {class_dir} on dataset purge: {io_err}")

        # Clean up physical cloud shadow directory on disk if it exists
        shadow_dir = os.path.join(workspace_root, "datasets", "cloud_shadows", dataset_id)
        if os.path.exists(shadow_dir):
            import shutil
            try:
                shutil.rmtree(shadow_dir)
            except Exception as io_err:
                print(f"Warning: Could not remove cloud shadow directory {shadow_dir} on dataset purge: {io_err}")

        # Clean up physical cloud segmentation directory on disk if it exists
        seg_dir = os.path.join(workspace_root, "datasets", "cloud_segmentations", dataset_id)
        if os.path.exists(seg_dir):
            import shutil
            try:
                shutil.rmtree(seg_dir)
            except Exception as io_err:
                print(f"Warning: Could not remove cloud segmentation directory {seg_dir} on dataset purge: {io_err}")

        return self.repository.delete_dataset(dataset_id)


