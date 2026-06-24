from sqlalchemy.orm import Session
from app.models.cloud_detection import CloudDetection

class CloudDetectionRepository:
    """
    Repository class handling database operations for Cloud Detection records.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_detection(self, dataset_id: str, status: str = "pending") -> CloudDetection:
        """
        Creates a new PENDING CloudDetection record.
        """
        detection = CloudDetection(dataset_id=dataset_id, detection_status=status)
        self.db.add(detection)
        self.db.commit()
        self.db.refresh(detection)
        return detection

    def get_detection(self, detection_id: str) -> CloudDetection | None:
        """
        Retrieves a CloudDetection record by its ID.
        """
        return self.db.query(CloudDetection).filter(CloudDetection.detection_id == detection_id).first()

    def get_by_dataset(self, dataset_id: str) -> CloudDetection | None:
        """
        Retrieves a CloudDetection record associated with a specific Dataset ID.
        """
        return self.db.query(CloudDetection).filter(CloudDetection.dataset_id == dataset_id).first()

    def update_detection(self, detection_id: str, update_fields: dict) -> CloudDetection | None:
        """
        Updates the values of a CloudDetection record.
        """
        db_detection = self.get_detection(detection_id)
        if db_detection:
            for key, val in update_fields.items():
                if hasattr(db_detection, key):
                    setattr(db_detection, key, val)
            self.db.commit()
            self.db.refresh(db_detection)
        return db_detection

    def delete_detection(self, dataset_id: str) -> bool:
        """
        Deletes a cloud detection record by its dataset_id.
        """
        detection = self.get_by_dataset(dataset_id)
        if detection:
            self.db.delete(detection)
            self.db.commit()
            return True
        return False
