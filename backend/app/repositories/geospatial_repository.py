from sqlalchemy.orm import Session
from app.models.geospatial_context import GeospatialContext

class GeospatialRepository:
    """
    Repository class handling low-level database operations for Geospatial Context.
    Follows repository patterns established across core components.
    """
    def __init__(self, db: Session):
        self.db = db

    def save_context(self, dataset_id: str, context_data: dict) -> GeospatialContext:
        """
        Saves (creates or updates) the geospatial context record for a given dataset.
        """
        db_context = self.get_by_dataset(dataset_id)
        if db_context:
            # Update fields
            for key, val in context_data.items():
                if hasattr(db_context, key):
                    setattr(db_context, key, val)
        else:
            # Create new context record
            db_context = GeospatialContext(dataset_id=dataset_id, **context_data)
            self.db.add(db_context)
            
        self.db.commit()
        self.db.refresh(db_context)
        return db_context

    def get_by_dataset(self, dataset_id: str) -> GeospatialContext | None:
        """
        Retrieves geospatial context record associated with a specific Dataset ID.
        """
        return self.db.query(GeospatialContext).filter(GeospatialContext.dataset_id == dataset_id).first()

    def delete_by_dataset(self, dataset_id: str) -> bool:
        """
        Purges dataset geospatial context record from the database.
        """
        db_context = self.get_by_dataset(dataset_id)
        if db_context:
            self.db.delete(db_context)
            self.db.commit()
            return True
        return False
