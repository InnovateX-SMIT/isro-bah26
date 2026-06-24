from sqlalchemy.orm import Session
from app.models.cloud_classification import CloudClassification

class CloudClassificationRepository:
    """
    Repository class handling database operations for Cloud Classification records.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_classification(self, dataset_id: str, cloud_detection_id: str, status: str = "pending") -> CloudClassification:
        """
        Creates a new PENDING CloudClassification record.
        """
        classification = CloudClassification(
            dataset_id=dataset_id,
            cloud_detection_id=cloud_detection_id,
            classification_status=status
        )
        self.db.add(classification)
        self.db.commit()
        self.db.refresh(classification)
        return classification

    def get_classification(self, classification_id: str) -> CloudClassification | None:
        """
        Retrieves a CloudClassification record by its ID.
        """
        return self.db.query(CloudClassification).filter(CloudClassification.classification_id == classification_id).first()

    def get_by_dataset(self, dataset_id: str) -> CloudClassification | None:
        """
        Retrieves a CloudClassification record associated with a specific Dataset ID.
        """
        return self.db.query(CloudClassification).filter(CloudClassification.dataset_id == dataset_id).first()

    def update_classification(self, classification_id: str, update_fields: dict) -> CloudClassification | None:
        """
        Updates the values of a CloudClassification record.
        """
        db_classification = self.get_classification(classification_id)
        if db_classification:
            for key, val in update_fields.items():
                if hasattr(db_classification, key):
                    setattr(db_classification, key, val)
            self.db.commit()
            self.db.refresh(db_classification)
        return db_classification

    def delete_classification(self, dataset_id: str) -> bool:
        """
        Deletes a cloud classification record by its dataset_id.
        """
        classification = self.get_by_dataset(dataset_id)
        if classification:
            self.db.delete(classification)
            self.db.commit()
            return True
        return False
