from sqlalchemy.orm import Session
from app.models.cloud_analytics import CloudAnalytics

class CloudAnalyticsRepository:
    """
    Repository class handling database operations for Cloud Analytics records.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_analytics_record(self, dataset_id: str, cloud_segmentation_id: str, status: str = "pending") -> CloudAnalytics:
        """
        Creates a new PENDING CloudAnalytics record.
        """
        analytics = CloudAnalytics(
            dataset_id=dataset_id,
            cloud_segmentation_id=cloud_segmentation_id,
            analytics_status=status,
            reconstruction_readiness=False
        )
        self.db.add(analytics)
        self.db.commit()
        self.db.refresh(analytics)
        return analytics

    def get_analytics_record(self, analytics_id: str) -> CloudAnalytics | None:
        """
        Retrieves a CloudAnalytics record by its ID.
        """
        return self.db.query(CloudAnalytics).filter(CloudAnalytics.analytics_id == analytics_id).first()

    def get_by_dataset(self, dataset_id: str) -> CloudAnalytics | None:
        """
        Retrieves a CloudAnalytics record associated with a specific Dataset ID.
        """
        return self.db.query(CloudAnalytics).filter(CloudAnalytics.dataset_id == dataset_id).first()

    def update_analytics_record(self, analytics_id: str, update_fields: dict) -> CloudAnalytics | None:
        """
        Updates the values of a CloudAnalytics record.
        """
        db_analytics = self.get_analytics_record(analytics_id)
        if db_analytics:
            for key, val in update_fields.items():
                if hasattr(db_analytics, key):
                    setattr(db_analytics, key, val)
            self.db.commit()
            self.db.refresh(db_analytics)
        return db_analytics

    def delete_analytics_record(self, dataset_id: str) -> bool:
        """
        Deletes a cloud analytics record by its dataset_id.
        """
        analytics = self.get_by_dataset(dataset_id)
        if analytics:
            self.db.delete(analytics)
            self.db.commit()
            return True
        return False
