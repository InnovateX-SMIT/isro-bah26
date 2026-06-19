from sqlalchemy.orm import Session
from app.models.dataset_preview import DatasetPreview

class DatasetPreviewRepository:
    """
    Repository class handling low-level database operations for Dataset Previews.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_preview(self, dataset_id: str, status: str = "PENDING") -> DatasetPreview:
        """
        Creates a new PENDING DatasetPreview record.
        """
        preview = DatasetPreview(dataset_id=dataset_id, preview_status=status)
        self.db.add(preview)
        self.db.commit()
        self.db.refresh(preview)
        return preview

    def get_preview(self, preview_id: str) -> DatasetPreview | None:
        """
        Retrieves a DatasetPreview by its ID.
        """
        return self.db.query(DatasetPreview).filter(DatasetPreview.preview_id == preview_id).first()

    def get_by_dataset(self, dataset_id: str) -> DatasetPreview | None:
        """
        Retrieves a DatasetPreview associated with a specific Dataset ID.
        """
        return self.db.query(DatasetPreview).filter(DatasetPreview.dataset_id == dataset_id).first()

    def update_preview(self, preview_id: str, update_fields: dict) -> DatasetPreview | None:
        """
        Updates the values of a DatasetPreview record.
        """
        db_preview = self.get_preview(preview_id)
        if db_preview:
            for key, val in update_fields.items():
                if hasattr(db_preview, key):
                    setattr(db_preview, key, val)
            self.db.commit()
            self.db.refresh(db_preview)
        return db_preview

    def delete_preview(self, dataset_id: str) -> bool:
        """
        Deletes a dataset preview record by its dataset_id.
        """
        preview = self.get_by_dataset(dataset_id)
        if preview:
            self.db.delete(preview)
            self.db.commit()
            return True
        return False
