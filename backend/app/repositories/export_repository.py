from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.export import Export

class ExportRepository:
    """
    Repository class handling database CRUD operations for Export records.
    Contains no FastAPI logic, validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, export_id: str) -> Optional[Export]:
        """
        Retrieves a single Export by its ID.
        """
        return self.db.query(Export).filter(Export.export_id == export_id).first()

    def create(
        self,
        session_id: str,
        layer: str,
        format: str,
        status: str = "PENDING"
    ) -> Export:
        """
        Creates and persists a new Export record.
        """
        export_run = Export(
            session_id=session_id,
            layer=layer,
            format=format,
            status=status
        )
        self.db.add(export_run)
        self.db.commit()
        self.db.refresh(export_run)
        return export_run

    def update_status(
        self,
        export_id: str,
        status: str,
        file_path: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Optional[Export]:
        """
        Updates status, file paths, size, and error details of an export run.
        """
        export_run = self.get_by_id(export_id)
        if export_run:
            export_run.status = status
            if file_path is not None:
                export_run.file_path = file_path
            if file_size_bytes is not None:
                export_run.file_size_bytes = file_size_bytes
            if error_message is not None:
                export_run.error_message = error_message
            self.db.commit()
            self.db.refresh(export_run)
        return export_run

    def list_by_session(self, session_id: str) -> List[Export]:
        """
        Lists all exports associated with a session ID.
        """
        return (
            self.db.query(Export)
            .filter(Export.session_id == session_id)
            .order_by(Export.created_at.desc())
            .all()
        )

    def delete_by_session(self, session_id: str) -> bool:
        """
        Deletes all exports associated with a session ID.
        """
        exports = self.db.query(Export).filter(Export.session_id == session_id).all()
        if exports:
            for exp in exports:
                self.db.delete(exp)
            self.db.commit()
            return True
        return False
