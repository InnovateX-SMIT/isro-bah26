from sqlalchemy.orm import Session
from app.models.dataset_inspection import DatasetInspection
from app.models.dataset_file import DatasetFile

class DatasetInspectionRepository:
    """
    Repository class handling low-level database operations for Dataset Inspections.
    Contains no FastAPI routing, endpoint validation, or HTTP exceptions.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_inspection(self, dataset_id: str, status: str = "PENDING") -> DatasetInspection:
        """
        Creates a new PENDING DatasetInspection record.
        """
        inspection = DatasetInspection(dataset_id=dataset_id, inspection_status=status)
        self.db.add(inspection)
        self.db.commit()
        self.db.refresh(inspection)
        return inspection

    def get_inspection(self, inspection_id: str) -> DatasetInspection | None:
        """
        Retrieves a DatasetInspection record by its ID.
        """
        return self.db.query(DatasetInspection).filter(DatasetInspection.inspection_id == inspection_id).first()

    def get_by_dataset(self, dataset_id: str) -> DatasetInspection | None:
        """
        Retrieves a DatasetInspection record associated with a specific Dataset ID.
        """
        return self.db.query(DatasetInspection).filter(DatasetInspection.dataset_id == dataset_id).first()

    def create_file_entry(
        self,
        inspection_id: str,
        file_name: str,
        file_extension: str,
        relative_path: str,
        file_size_bytes: int,
        file_category: str
    ) -> DatasetFile:
        """
        Registers an inventoried file entry linked to the inspection run.
        """
        db_file = DatasetFile(
            inspection_id=inspection_id,
            file_name=file_name,
            file_extension=file_extension,
            relative_path=relative_path,
            file_size_bytes=file_size_bytes,
            file_category=file_category
        )
        self.db.add(db_file)
        self.db.commit()
        self.db.refresh(db_file)
        return db_file

    def list_files(self, inspection_id: str) -> list[DatasetFile]:
        """
        Lists all inventoried file records associated with an inspection ID, ordered alphabetically.
        """
        return (
            self.db.query(DatasetFile)
            .filter(DatasetFile.inspection_id == inspection_id)
            .order_by(DatasetFile.file_name.asc())
            .all()
        )

    def delete_inspection(self, dataset_id: str) -> bool:
        """
        Deletes a dataset inspection profile by its dataset_id.
        Triggers cascading deletion of all associated DatasetFile records in SQLite.
        """
        inspection = self.get_by_dataset(dataset_id)
        if inspection:
            self.db.delete(inspection)
            self.db.commit()
            return True
        return False
