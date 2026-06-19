from sqlalchemy.orm import Session
from app.models.dataset_metadata import DatasetMetadata

class DatasetMetadataRepository:
    """
    Repository class handling low-level database operations for Dataset Metadata.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_metadata(self, dataset_id: str, status: str = "PENDING") -> DatasetMetadata:
        """
        Creates a new PENDING metadata record.
        """
        metadata = DatasetMetadata(dataset_id=dataset_id, metadata_status=status)
        self.db.add(metadata)
        self.db.commit()
        self.db.refresh(metadata)
        return metadata

    def update_metadata(self, metadata_id: str, update_fields: dict) -> DatasetMetadata | None:
        """
        Updates the values of a metadata record.
        """
        db_metadata = self.db.query(DatasetMetadata).filter(DatasetMetadata.metadata_id == metadata_id).first()
        if db_metadata:
            for key, val in update_fields.items():
                if hasattr(db_metadata, key):
                    setattr(db_metadata, key, val)
            self.db.commit()
            self.db.refresh(db_metadata)
        return db_metadata

    def get_by_dataset(self, dataset_id: str) -> DatasetMetadata | None:
        """
        Retrieves metadata record associated with a specific Dataset ID.
        """
        return self.db.query(DatasetMetadata).filter(DatasetMetadata.dataset_id == dataset_id).first()

    def delete_metadata(self, dataset_id: str) -> bool:
        """
        Purges dataset metadata record by dataset_id.
        """
        metadata = self.get_by_dataset(dataset_id)
        if metadata:
            self.db.delete(metadata)
            self.db.commit()
            return True
        return False
