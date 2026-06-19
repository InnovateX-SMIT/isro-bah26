from sqlalchemy.orm import Session
from app.models.dataset import Dataset

class DatasetRepository:
    """
    Repository class handling low-level database operations for Dataset registrations.
    Contains no FastAPI routing, endpoint validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_dataset(
        self,
        analysis_session_id: str,
        dataset_name: str,
        dataset_path: str,
        dataset_type: str,
        status: str = "REGISTERED"
    ) -> Dataset:
        """
        Creates a new Dataset record and persists it in the database.
        """
        dataset = Dataset(
            analysis_session_id=analysis_session_id,
            dataset_name=dataset_name,
            dataset_path=dataset_path,
            dataset_type=dataset_type,
            dataset_status=status
        )
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def get_dataset(self, dataset_id: str) -> Dataset | None:
        """
        Retrieves a registered dataset by its ID.
        """
        return self.db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()

    def list_datasets(self) -> list[Dataset]:
        """
        Retrieves all registered datasets, ordered newest first (created_at DESC).
        """
        return self.db.query(Dataset).order_by(Dataset.created_at.desc()).all()

    def list_session_datasets(self, session_id: str) -> list[Dataset]:
        """
        Retrieves all registered datasets associated with a specific session ID.
        """
        return self.db.query(Dataset).filter(Dataset.analysis_session_id == session_id).order_by(Dataset.created_at.desc()).all()

    def update_status(self, dataset_id: str, status: str) -> Dataset | None:
        """
        Updates the operational lifecycle status of a dataset registration.
        """
        dataset = self.get_dataset(dataset_id)
        if dataset:
            dataset.dataset_status = status
            self.db.commit()
            self.db.refresh(dataset)
        return dataset

    def delete_dataset(self, dataset_id: str) -> bool:
        """
        Deletes a dataset registration record. Never deletes physical files from disk.
        """
        dataset = self.get_dataset(dataset_id)
        if dataset:
            self.db.delete(dataset)
            self.db.commit()
            return True
        return False
