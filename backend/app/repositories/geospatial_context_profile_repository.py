from sqlalchemy.orm import Session
from app.models.geospatial_context_profile import GeospatialContextProfile

class GeospatialContextProfileRepository:
    """
    Repository class handling database transactions for GeospatialContextProfile records.
    Follows established repository patterns.
    """
    def __init__(self, db: Session):
        self.db = db

    def save_profile(self, dataset_id: str, context_data: dict) -> GeospatialContextProfile:
        """
        Saves (creates or updates) the context profile record for a given dataset.
        """
        db_profile = self.get_by_dataset(dataset_id)
        if db_profile:
            # Update fields
            for key, val in context_data.items():
                if hasattr(db_profile, key):
                    setattr(db_profile, key, val)
        else:
            # Create new context profile record
            db_profile = GeospatialContextProfile(dataset_id=dataset_id, **context_data)
            self.db.add(db_profile)
            
        self.db.commit()
        self.db.refresh(db_profile)
        return db_profile

    def get_by_dataset(self, dataset_id: str) -> GeospatialContextProfile | None:
        """
        Retrieves context profile record associated with a specific Dataset ID.
        """
        return self.db.query(GeospatialContextProfile).filter(GeospatialContextProfile.dataset_id == dataset_id).first()

    def delete_by_dataset(self, dataset_id: str) -> bool:
        """
        Purges dataset context profile record from the database.
        """
        db_profile = self.get_by_dataset(dataset_id)
        if db_profile:
            self.db.delete(db_profile)
            self.db.commit()
            return True
        return False
