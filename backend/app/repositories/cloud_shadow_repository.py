from sqlalchemy.orm import Session
from app.models.cloud_shadow import CloudShadow

class CloudShadowRepository:
    """
    Repository class handling database operations for Cloud Shadow records.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_shadow_record(self, dataset_id: str, cloud_classification_id: str, status: str = "pending") -> CloudShadow:
        """
        Creates a new PENDING CloudShadow record.
        """
        shadow = CloudShadow(
            dataset_id=dataset_id,
            cloud_classification_id=cloud_classification_id,
            shadow_detection_status=status
        )
        self.db.add(shadow)
        self.db.commit()
        self.db.refresh(shadow)
        return shadow

    def get_shadow_record(self, shadow_id: str) -> CloudShadow | None:
        """
        Retrieves a CloudShadow record by its ID.
        """
        return self.db.query(CloudShadow).filter(CloudShadow.shadow_id == shadow_id).first()

    def get_by_dataset(self, dataset_id: str) -> CloudShadow | None:
        """
        Retrieves a CloudShadow record associated with a specific Dataset ID.
        """
        return self.db.query(CloudShadow).filter(CloudShadow.dataset_id == dataset_id).first()

    def update_shadow_record(self, shadow_id: str, update_fields: dict) -> CloudShadow | None:
        """
        Updates the values of a CloudShadow record.
        """
        db_shadow = self.get_shadow_record(shadow_id)
        if db_shadow:
            for key, val in update_fields.items():
                if hasattr(db_shadow, key):
                    setattr(db_shadow, key, val)
            self.db.commit()
            self.db.refresh(db_shadow)
        return db_shadow

    def delete_shadow_record(self, dataset_id: str) -> bool:
        """
        Deletes a cloud shadow record by its dataset_id.
        """
        shadow = self.get_by_dataset(dataset_id)
        if shadow:
            self.db.delete(shadow)
            self.db.commit()
            return True
        return False
