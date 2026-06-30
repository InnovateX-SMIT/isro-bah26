import json
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.dataset_repository import DatasetRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.temporal_discovery_repository import TemporalDiscoveryRepository
from app.repositories.temporal_candidate_repository import TemporalCandidateRepository
from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository

from app.services.temporal.historical_discovery_service import parse_acquisition_date
from app.schemas.temporal_reference import (
    ReferenceStackResponse,
    SelectedReferenceResponse
)
from app.schemas.temporal_discovery import TemporalCandidateResponse
from app.schemas.session import SessionStatus

DEFAULT_WEIGHTS = {
    "cloud_cover": 0.4,
    "temporal_distance": 0.3,
    "spatial_overlap": 0.2,
    "data_quality": 0.1
}

class ReferenceSelectionService:
    """
    Evaluates, ranks, and selects top historical satellite references for a given Analysis Session.
    Uses configurable weighted scoring rules and generates selection reason explainability metadata.
    """

    def __init__(self, db: Session):
        self.db = db
        self.dataset_repo = DatasetRepository(db)
        self.metadata_repo = DatasetMetadataRepository(db)
        self.discovery_repo = TemporalDiscoveryRepository(db)
        self.candidate_repo = TemporalCandidateRepository(db)
        self.stack_repo = TemporalReferenceStackRepository(db)
        self.selected_ref_repo = SelectedReferenceRepository(db)
        self.session_repo = AnalysisSessionRepository(db)

    def select_references(
        self,
        session_id: str,
        num_references: int = 5,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> ReferenceStackResponse:
        """
        Calculates ranking scores for all discovered candidates, sorts them,
        persists the top N reference selections, and updates the session processing status.
        """
        # 1. Fetch latest discovery metadata run for this session
        discovery = self.discovery_repo.get_latest(session_id)
        if not discovery:
            raise HTTPException(
                status_code=400,
                detail="No discovery run found for this session. Execute historical discovery first."
            )
        if discovery.status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail=f"The latest discovery run status is '{discovery.status}'. It must be COMPLETED before selecting references."
            )

        # 2. Fetch all candidates matching that discovery
        candidates = self.candidate_repo.get_by_discovery(discovery.id)
        if not candidates:
            raise HTTPException(
                status_code=400,
                detail="No candidate observations discovered during search. Cannot execute reference selection."
            )

        # 3. Retrieve dataset metadata to obtain target acquisition date
        metadata = self.metadata_repo.get_by_dataset(discovery.dataset_id)
        if not metadata or not metadata.acquisition_date:
            raise HTTPException(
                status_code=400,
                detail="Dataset acquisition date is missing in metadata profile."
            )

        try:
            target_date = parse_acquisition_date(metadata.acquisition_date)
        except ValueError as parse_err:
            raise HTTPException(
                status_code=400,
                detail=f"Failed parsing target acquisition date: {parse_err}"
            )

        # 4. Resolve scoring weights
        weights = DEFAULT_WEIGHTS.copy()
        if custom_weights:
            # Validate custom weights sum to 1.0 (approx)
            weights_sum = sum(custom_weights.values())
            if abs(weights_sum - 1.0) > 1e-4:
                raise HTTPException(
                    status_code=400,
                    detail=f"Custom weights must sum exactly to 1.0 (got {weights_sum:.4f})."
                )
            for k in weights.keys():
                if k in custom_weights:
                    weights[k] = custom_weights[k]

        # 5. Evaluate and score candidates
        scored_candidates = []
        max_temporal_decay_days = 180.0 # Standard normalization window for temporal distance decay

        from app.services.temporal_service import TemporalService
        temp_service = TemporalService()
        total_candidates = len(candidates)
        temp_service.set_progress(session_id, "ranking_candidates", 0, total_candidates)

        try:
            for idx, cand in enumerate(candidates):
                temp_service.set_progress(session_id, "ranking_candidates", idx + 1, total_candidates)
                
                # Calculate Cloud Cover Score: lower cloud is better
                cloud_score = max(0.0, 100.0 - cand.cloud_cover)

                # Calculate Temporal Distance Score: closer to target date is better
                try:
                    cand_date = parse_acquisition_date(cand.acquisition_date)
                    days_diff = abs((cand_date - target_date).days)
                except Exception:
                    days_diff = 180
                
                temporal_score = max(0.0, 100.0 * (1.0 - (days_diff / max_temporal_decay_days)))

                # Calculate Spatial Overlap Score: higher overlap is better
                overlap_score = max(0.0, min(100.0, cand.spatial_overlap))

                # Calculate Data Quality Score
                quality_score = 100.0
                if cand.metadata_json:
                    try:
                        m_data = json.loads(cand.metadata_json)
                        quality_val = m_data.get("data_quality") or m_data.get("image_quality") or m_data.get("confidence")
                        if quality_val is not None:
                            quality_score = float(quality_val)
                            if quality_score <= 1.0:
                                quality_score *= 100.0
                    except Exception:
                        pass
                quality_score = max(0.0, min(100.0, quality_score))

                # Compute composite weighted score (0 - 100)
                final_score = (
                    (cloud_score * weights["cloud_cover"]) +
                    (temporal_score * weights["temporal_distance"]) +
                    (overlap_score * weights["spatial_overlap"]) +
                    (quality_score * weights["data_quality"])
                )

                # GenerateSelection Explanation Reason
                reason = (
                    f"Selected due to {cand.cloud_cover:.1f}% cloud cover, "
                    f"{cand.spatial_overlap:.1f}% spatial overlap, and "
                    f"{days_diff}-day temporal distance."
                )

                scored_candidates.append({
                    "candidate": cand,
                    "score": final_score,
                    "days_diff": days_diff,
                    "reason": reason
                })

            # 6. Sort by final score descending
            scored_candidates.sort(key=lambda x: x["score"], reverse=True)

            # 7. Select Top N
            top_selections = scored_candidates[:num_references]

            # 8. Create Reference Stack Record
            stack = self.stack_repo.create(
                session_id=session_id,
                dataset_id=discovery.dataset_id,
                discovery_id=discovery.id,
                selected_count=len(top_selections),
                selection_strategy="weighted_composite"
            )

            # 9. Create Selected Reference mappings
            references_to_create = []
            for i, sel in enumerate(top_selections):
                references_to_create.append({
                    "candidate_id": sel["candidate"].id,
                    "rank_position": i + 1,
                    "ranking_score": sel["score"],
                    "selection_reason": sel["reason"]
                })

            db_selections = self.selected_ref_repo.bulk_create(stack.id, references_to_create)

            # 10. Update parent AnalysisSession status to REFERENCE_SELECTION_COMPLETE milestone
            self.session_repo.update_status(
                session_id=session_id,
                status=SessionStatus.REFERENCE_SELECTION_COMPLETE.value
            )

            temp_service.set_progress(session_id, "completed", total_candidates, total_candidates)
        except Exception as e:
            temp_service.set_progress(session_id, f"failed: {str(e)}", 0, total_candidates)
            raise e

        return self._build_stack_response(stack, db_selections)

    def get_latest_stack(self, session_id: str) -> ReferenceStackResponse:
        """
        Retrieves the latest reference selection stack for the session.
        """
        stack = self.stack_repo.get_latest_by_session(session_id)
        if not stack:
            raise HTTPException(
                status_code=404,
                detail=f"No reference stacks found for session {session_id}."
            )
        
        db_selections = self.selected_ref_repo.get_by_stack(stack.id)
        return self._build_stack_response(stack, db_selections)

    def get_selected_references_list(self, session_id: str) -> List[SelectedReferenceResponse]:
        """
        Retrieves the list of selected references for the latest stack.
        """
        stack = self.stack_repo.get_latest_by_session(session_id)
        if not stack:
            raise HTTPException(
                status_code=404,
                detail=f"No reference stacks found for session {session_id}."
            )

        db_selections = self.selected_ref_repo.get_by_stack(stack.id)
        resp_list = []
        for s in db_selections:
            # Reconstruct candidate schema response
            cand_resp = TemporalCandidateResponse.model_validate(s.candidate) if s.candidate else None
            ref_resp = SelectedReferenceResponse.model_validate(s)
            ref_resp.candidate = cand_resp
            resp_list.append(ref_resp)
        return resp_list

    def _build_stack_response(
        self,
        stack,
        selections
    ) -> ReferenceStackResponse:
        """
        Helper method mapping SQLAlchemy stack and selection models to ReferenceStackResponse.
        """
        stack_resp = ReferenceStackResponse.model_validate(stack)
        selected_resps = []
        for s in selections:
            cand_resp = TemporalCandidateResponse.model_validate(s.candidate) if s.candidate else None
            ref_resp = SelectedReferenceResponse.model_validate(s)
            ref_resp.candidate = cand_resp
            selected_resps.append(ref_resp)
        stack_resp.selected_references = selected_resps
        return stack_resp
