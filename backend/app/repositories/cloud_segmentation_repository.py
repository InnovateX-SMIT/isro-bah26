from sqlalchemy.orm import Session
from app.models.cloud_segmentation import CloudSegmentation

class CloudSegmentationRepository:
    """
    Repository class handling database operations for Cloud Segmentation records.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_segmentation_record(self, dataset_id: str, cloud_shadow_id: str, status: str = "pending") -> CloudSegmentation:
        """
        Creates a new PENDING CloudSegmentation record.
        """
        segmentation = CloudSegmentation(
            dataset_id=dataset_id,
            cloud_shadow_id=cloud_shadow_id,
            segmentation_status=status,
            reconstruction_ready=False
        )
        self.db.add(segmentation)
        self.db.commit()
        self.db.refresh(segmentation)
        return segmentation

    def get_segmentation_record(self, segmentation_id: str) -> CloudSegmentation | None:
        """
        Retrieves a CloudSegmentation record by its ID.
        """
        return self.db.query(CloudSegmentation).filter(CloudSegmentation.segmentation_id == segmentation_id).first()

    def get_by_dataset(self, dataset_id: str) -> CloudSegmentation | None:
        """
        Retrieves a CloudSegmentation record associated with a specific Dataset ID.
        """
        return self.db.query(CloudSegmentation).filter(CloudSegmentation.dataset_id == dataset_id).first()

    def update_segmentation_record(self, segmentation_id: str, update_fields: dict) -> CloudSegmentation | None:
        """
        Updates the values of a CloudSegmentation record.
        """
        db_segmentation = self.get_segmentation_record(segmentation_id)
        if db_segmentation:
            for key, val in update_fields.items():
                if hasattr(db_segmentation, key):
                    setattr(db_segmentation, key, val)
            self.db.commit()
            self.db.refresh(db_segmentation)
        return db_segmentation

    def delete_segmentation_record(self, dataset_id: str) -> bool:
        """
        Deletes a cloud segmentation record by its dataset_id.
        """
        segmentation = self.get_by_dataset(dataset_id)
        if segmentation:
            self.db.delete(segmentation)
            self.db.commit()
            return True
        return False
