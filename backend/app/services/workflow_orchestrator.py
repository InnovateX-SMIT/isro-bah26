import time
import logging
import datetime
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from app.services.execution_context import ExecutionContext
from app.services.stage_executor import StageExecutor
from app.services.workflow_state import WorkflowRunState, StageState
from app.repositories.analysis_session_repository import AnalysisSessionRepository
from app.repositories.dataset_repository import DatasetRepository

logger = logging.getLogger("workflow_orchestrator")

class WorkflowOrchestrator:
    """
    Main orchestration class that coordinates the execution of all stages in a geospatial reconstruction workflow.
    """
    def __init__(self, db: Session):
        self.db = db
        self.executor = StageExecutor()
        self.session_repo = AnalysisSessionRepository(db)
        self.dataset_repo = DatasetRepository(db)

    def run_workflow(
        self,
        session_id: str,
        dataset_name: Optional[str] = None,
        dataset_path: Optional[str] = None,
        dataset_type: str = "DEMO",
        temporal_window_days: int = 30,
        num_references: int = 3,
        reconstruction_strategy: str = "TELEA"
    ) -> WorkflowRunState:
        """
        Coordinates and runs the full 18-stage end-to-end geospatial reconstruction pipeline.
        Manages state transitions, timeline reporting, Structured Logging, and updates Analysis Session status.
        """
        # Create execution context
        context = ExecutionContext(
            db=self.db,
            session_id=session_id,
            dataset_name=dataset_name,
            dataset_path=dataset_path,
            dataset_type=dataset_type,
            temporal_window_days=temporal_window_days,
            num_references=num_references,
            reconstruction_strategy=reconstruction_strategy
        )

        stages_list = [
            ("Start Session", self.executor.execute_start_session),
            ("Register Dataset", self.executor.execute_register_dataset),
            ("Inspect Dataset", self.executor.execute_inspect_dataset),
            ("Validate Dataset", self.executor.execute_validate_dataset),
            ("Extract Metadata", self.executor.execute_extract_metadata),
            ("Generate Preview", self.executor.execute_generate_preview),
            ("Generate Geospatial Context", self.executor.execute_generate_geospatial_context),
            ("Generate Location Context", self.executor.execute_generate_location_context),
            ("Generate Temporal Context", self.executor.execute_generate_temporal_context),
            ("Cloud Detection", self.executor.execute_cloud_detection),
            ("Cloud Classification", self.executor.execute_cloud_classification),
            ("Cloud Shadow Detection", self.executor.execute_cloud_shadow_detection),
            ("Cloud Segmentation", self.executor.execute_cloud_segmentation),
            ("Cloud Analytics", self.executor.execute_cloud_analytics),
            ("Reconstruction", self.executor.execute_reconstruction),
            ("Confidence Estimation", self.executor.execute_confidence_estimation),
            ("Mission Control Update", self.executor.execute_mission_control_update),
            ("Export Preparation", self.executor.execute_export_preparation)
        ]

        # Initialize run state
        run_state = WorkflowRunState(session_id=session_id)
        for stage_name, _ in stages_list:
            run_state.stages.append(StageState(name=stage_name, status="pending"))

        logger.info(f"Starting orchestrated workflow run for session {session_id}")
        self.session_repo.update_status(session_id, "active")
        
        # Log session start
        run_state.logs.append({
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "stage": "Workflow Orchestrator",
            "event": f"Initializing workflow orchestration container for session ID: {session_id}",
            "status": "active",
            "severity": "INFO"
        })

        failed_stage = None
        total_time_start = time.time()

        for idx, (stage_name, func) in enumerate(stages_list):
            stage_state = next(s for s in run_state.stages if s.name == stage_name)
            
            if failed_stage:
                stage_state.status = "blocked"
                stage_state.blocked_by = failed_stage
                stage_state.updated_at = datetime.datetime.utcnow().isoformat() + "Z"
                continue

            stage_state.status = "running"
            stage_state.updated_at = datetime.datetime.utcnow().isoformat() + "Z"
            
            logger.info(f"Executing stage: {stage_name}")
            
            # Log stage start
            run_state.logs.append({
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "stage": stage_name,
                "event": f"Running stage service '{stage_name}'...",
                "status": "running",
                "severity": "INFO"
            })
            
            run_state.timeline.append({
                "stage_name": stage_name,
                "event": f"Stage {stage_name} started",
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            })

            start_time = time.time()
            try:
                # Execute stage logic
                outputs = func(context)
                
                duration = (time.time() - start_time) * 1000
                stage_state.status = "completed"
                stage_state.duration_ms = round(duration, 2)
                stage_state.outputs = outputs
                stage_state.updated_at = datetime.datetime.utcnow().isoformat() + "Z"
                
                run_state.logs.append({
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "stage": stage_name,
                    "event": f"Stage {stage_name} completed in {duration:.2f} ms successfully.",
                    "status": "completed",
                    "severity": "INFO"
                })
                
                run_state.timeline.append({
                    "stage_name": stage_name,
                    "event": f"Stage {stage_name} completed",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "duration_ms": round(duration, 2)
                })

            except Exception as e:
                duration = (time.time() - start_time) * 1000
                stage_state.status = "failed"
                stage_state.duration_ms = round(duration, 2)
                stage_state.error_summary = str(e)
                stage_state.updated_at = datetime.datetime.utcnow().isoformat() + "Z"
                failed_stage = stage_name
                
                logger.error(f"Stage {stage_name} failed with error: {str(e)}", exc_info=True)
                
                # Update dataset status in database if available
                if context.dataset_id:
                    self.dataset_repo.update_status(context.dataset_id, "FAILED")
                
                run_state.logs.append({
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "stage": stage_name,
                    "event": f"Stage {stage_name} failed: {str(e)}",
                    "status": "failed",
                    "severity": "ERROR"
                })
                
                run_state.timeline.append({
                    "stage_name": stage_name,
                    "event": f"Stage {stage_name} failed with error",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "duration_ms": round(duration, 2)
                })
                
                run_state.errors[stage_name] = str(e)

        # Update final run state
        run_state.total_processing_time_ms = round((time.time() - total_time_start) * 1000, 2)
        
        completed_count = sum(1 for s in run_state.stages if s.status == "completed")
        run_state.overall_progress = round((completed_count / len(stages_list)) * 100.0, 2)

        if failed_stage:
            run_state.status = "failed"
            self.session_repo.update_status(session_id, "failed")
            logger.error(f"Orchestrated workflow run for session {session_id} failed at stage '{failed_stage}'")
            
            run_state.logs.append({
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "stage": "Workflow Orchestrator",
                "event": f"Workflow run aborted due to failure at stage {failed_stage}.",
                "status": "failed",
                "severity": "ERROR"
            })
        else:
            run_state.status = "completed"
            self.session_repo.update_status(session_id, "completed")
            logger.info(f"Orchestrated workflow run for session {session_id} completed successfully")
            
            run_state.logs.append({
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "stage": "Workflow Orchestrator",
                "event": f"Workflow run completed successfully. Cumulative processing time: {run_state.total_processing_time_ms} ms.",
                "status": "completed",
                "severity": "INFO"
            })

        # Return state
        return run_state
