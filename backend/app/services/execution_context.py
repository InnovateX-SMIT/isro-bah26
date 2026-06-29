from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

class ExecutionContext:
    """
    Class responsible for representing the shared execution context of an orchestrated workflow run.
    Stores session metadata, database sessions, configuration parameters, and intermediate results.
    """
    def __init__(
        self,
        db: Session,
        session_id: str,
        dataset_name: Optional[str] = None,
        dataset_path: Optional[str] = None,
        dataset_type: str = "DEMO",
        temporal_window_days: int = 30,
        num_references: int = 3,
        reconstruction_strategy: str = "TELEA"
    ):
        self.db = db
        self.session_id = session_id
        self.dataset_name = dataset_name
        self.dataset_path = dataset_path
        self.dataset_type = dataset_type
        
        # Ingestion params
        self.temporal_window_days = temporal_window_days
        self.num_references = num_references
        self.reconstruction_strategy = reconstruction_strategy
        
        # Resolved/computed IDs across stages
        self.dataset_id: Optional[str] = None
        self.reconstruction_run_id: Optional[str] = None
        self.confidence_id: Optional[str] = None
        self.reliability_id: Optional[str] = None
        self.heatmap_id: Optional[str] = None
        self.analytics_id: Optional[str] = None
        
        # Arbitrary context storage
        self.store: Dict[str, Any] = {}
