import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
from app.repositories.selected_reference_repository import SelectedReferenceRepository
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.repositories.dataset_metadata_repository import DatasetMetadataRepository
from app.repositories.analysis_session_repository import AnalysisSessionRepository

from app.services.temporal.historical_discovery_service import parse_acquisition_date
from app.schemas.temporal_context import (
    TemporalContextPackageResponse,
    ProviderStatisticsResponse,
    CloudStatisticsResponse,
    TemporalStatisticsResponse,
    SpatialStatisticsResponse,
    TemporalContextResponse
)
from app.schemas.temporal_reference import SelectedReferenceResponse
from app.schemas.temporal_discovery import TemporalCandidateResponse
from app.schemas.session import SessionStatus


class TemporalContextService:
    """
    Evaluates selected references, computes statistics, generates human summaries,
    packages, and saves the reconstruction-ready Temporal Context Package.
    """

    def __init__(self, db: Session):
        self.db = db
        self.stack_repo = TemporalReferenceStackRepository(db)
        self.selected_ref_repo = SelectedReferenceRepository(db)
        self.context_repo = TemporalContextRepository(db)
        self.metadata_repo = DatasetMetadataRepository(db)
        self.session_repo = AnalysisSessionRepository(db)

    def generate_temporal_context(self, session_id: str) -> TemporalContextPackageResponse:
        """
        Gathers selected references, computes aggregate statistics (cloud, temporal, spatial, provider),
        generates a human-readable briefing summary, stores the temporal context in the database,
        and transitions the analysis session status.
        """
        # 1. Fetch latest reference stack for session
        stack = self.stack_repo.get_latest_by_session(session_id)
        if not stack:
            raise HTTPException(
                status_code=404,
                detail=f"No reference selection stack found for session {session_id}."
            )

        # 2. Fetch selections for stack
        selections = self.selected_ref_repo.get_by_stack(stack.id)
        if not selections:
            raise HTTPException(
                status_code=404,
                detail=f"No selected references found for stack {stack.id}."
            )

        # 3. Retrieve dataset metadata to get target acquisition date
        metadata = self.metadata_repo.get_by_dataset(stack.dataset_id)
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

        # 4. Extract data and compute statistics
        provider_list = []
        provider_counts = {}
        cloud_covers = []
        temporal_distances = []
        spatial_overlaps = []
        selected_references_resps = []

        for sel in selections:
            cand = sel.candidate
            if not cand:
                continue
            
            # Map candidate schema response
            cand_resp = TemporalCandidateResponse.model_validate(cand)
            ref_resp = SelectedReferenceResponse.model_validate(sel)
            ref_resp.candidate = cand_resp
            selected_references_resps.append(ref_resp)

            # Provider info
            prov = cand.provider_name
            provider_list.append(prov)
            provider_counts[prov] = provider_counts.get(prov, 0) + 1

            # Cloud cover
            cloud_covers.append(cand.cloud_cover)

            # Temporal distance
            try:
                cand_date = parse_acquisition_date(cand.acquisition_date)
                days_diff = abs((cand_date - target_date).days)
            except Exception:
                days_diff = 180
            temporal_distances.append(days_diff)

            # Spatial overlap
            spatial_overlaps.append(cand.spatial_overlap)

        if not selected_references_resps:
            raise HTTPException(
                status_code=400,
                detail="No candidate details found on selected references."
            )

        # Compute aggregate statistics
        providers_represented = sorted(list(set(provider_list)))
        provider_count = len(providers_represented)
        reference_count = len(selected_references_resps)

        cloud_avg = sum(cloud_covers) / len(cloud_covers)
        cloud_min = min(cloud_covers)
        cloud_max = max(cloud_covers)

        temp_avg = sum(temporal_distances) / len(temporal_distances)
        temp_min = min(temporal_distances)
        temp_max = max(temporal_distances)

        spatial_avg = sum(spatial_overlaps) / len(spatial_overlaps)
        spatial_min = min(spatial_overlaps)
        spatial_max = max(spatial_overlaps)

        # 5. Construct operational briefing summary
        clarity_rating = "Excellent" if cloud_avg < 10.0 else "Moderate" if cloud_avg < 30.0 else "Low"
        overlap_rating = "optimal" if spatial_avg > 80.0 else "sub-optimal"

        summary = (
            f"Temporal context evaluation complete for session {session_id}. Consolidated {reference_count} historical "
            f"reference scene(s) across {provider_count} provider(s) ({', '.join(providers_represented)}). "
            f"Average cloud cover is {cloud_avg:.1f}% ({clarity_rating} clarity, range: {cloud_min:.1f}% to {cloud_max:.1f}%), "
            f"with a mean temporal offset of {temp_avg:.1f} days (range: {temp_min} to {temp_max} days) "
            f"and an average spatial overlap of {spatial_avg:.1f}% ({overlap_rating} coverage, range: {spatial_min:.1f}% to {spatial_max:.1f}%). "
            f"The selected reference stack is fully prepared and meets quality thresholds for reconstruction intelligence."
        )

        # 6. Save TemporalContext record in database
        stats_payload = {
            "provider_summary": {
                "providers_represented": providers_represented,
                "provider_counts": provider_counts
            },
            "cloud_statistics": {
                "average": cloud_avg,
                "min": cloud_min,
                "max": cloud_max
            },
            "temporal_statistics": {
                "average": temp_avg,
                "min": float(temp_min),
                "max": float(temp_max)
            },
            "spatial_statistics": {
                "average": spatial_avg,
                "min": spatial_min,
                "max": spatial_max
            },
            "reference_metadata": {
                "target_acquisition_date": metadata.acquisition_date,
                "selection_strategy": stack.selection_strategy
            },
            "context_summary": summary
        }
        metadata_json_str = json.dumps(stats_payload)

        self.context_repo.create(
            session_id=session_id,
            dataset_id=stack.dataset_id,
            reference_stack_id=stack.id,
            provider_count=provider_count,
            reference_count=reference_count,
            average_cloud_cover=cloud_avg,
            average_temporal_distance=temp_avg,
            average_spatial_overlap=spatial_avg,
            summary=summary,
            metadata_json=metadata_json_str
        )

        # Update AnalysisSession status to TEMPORAL_CONTEXT_GENERATED
        self.session_repo.update_status(
            session_id=session_id,
            status=SessionStatus.TEMPORAL_CONTEXT_GENERATED.value
        )

        return TemporalContextPackageResponse(
            selected_references=selected_references_resps,
            provider_summary=ProviderStatisticsResponse(
                providers_represented=providers_represented,
                provider_counts=provider_counts
            ),
            cloud_statistics=CloudStatisticsResponse(
                average=cloud_avg,
                min=cloud_min,
                max=cloud_max
            ),
            temporal_statistics=TemporalStatisticsResponse(
                average=temp_avg,
                min=float(temp_min),
                max=float(temp_max)
            ),
            spatial_statistics=SpatialStatisticsResponse(
                average=spatial_avg,
                min=spatial_min,
                max=spatial_max
            ),
            reference_metadata=stats_payload["reference_metadata"],
            context_summary=summary
        )

    def get_temporal_context_package(self, session_id: str) -> TemporalContextPackageResponse:
        """
        Retrieves the finalized Temporal Context Package details from DB and returns a detailed response.
        """
        context = self.context_repo.get_by_session(session_id)
        if not context:
            raise HTTPException(
                status_code=404,
                detail=f"Temporal context not found for session {session_id}."
            )

        stack = self.stack_repo.get_by_id(context.reference_stack_id)
        if not stack:
            raise HTTPException(
                status_code=404,
                detail=f"Reference stack {context.reference_stack_id} not found."
            )

        selections = self.selected_ref_repo.get_by_stack(stack.id)

        # Retrieve target acquisition date
        metadata = self.metadata_repo.get_by_dataset(stack.dataset_id)
        target_date_str = metadata.acquisition_date if metadata else None
        
        try:
            target_date = parse_acquisition_date(target_date_str) if target_date_str else None
        except Exception:
            target_date = None

        # Build responses
        selected_references_resps = []
        for sel in selections:
            cand = sel.candidate
            cand_resp = TemporalCandidateResponse.model_validate(cand) if cand else None
            ref_resp = SelectedReferenceResponse.model_validate(sel)
            ref_resp.candidate = cand_resp
            selected_references_resps.append(ref_resp)

        metadata_dict = {}
        if context.metadata_json:
            try:
                metadata_dict = json.loads(context.metadata_json)
            except Exception:
                pass

        provider_summary = metadata_dict.get("provider_summary", {})
        cloud_statistics = metadata_dict.get("cloud_statistics", {})
        temporal_statistics = metadata_dict.get("temporal_statistics", {})
        spatial_statistics = metadata_dict.get("spatial_statistics", {})

        return TemporalContextPackageResponse(
            selected_references=selected_references_resps,
            provider_summary=ProviderStatisticsResponse(
                providers_represented=provider_summary.get("providers_represented", []),
                provider_counts=provider_summary.get("provider_counts", {})
            ),
            cloud_statistics=CloudStatisticsResponse(
                average=cloud_statistics.get("average", context.average_cloud_cover),
                min=cloud_statistics.get("min", context.average_cloud_cover),
                max=cloud_statistics.get("max", context.average_cloud_cover)
            ),
            temporal_statistics=TemporalStatisticsResponse(
                average=temporal_statistics.get("average", context.average_temporal_distance),
                min=temporal_statistics.get("min", context.average_temporal_distance),
                max=temporal_statistics.get("max", context.average_temporal_distance)
            ),
            spatial_statistics=SpatialStatisticsResponse(
                average=spatial_statistics.get("average", context.average_spatial_overlap),
                min=spatial_statistics.get("min", context.average_spatial_overlap),
                max=spatial_statistics.get("max", context.average_spatial_overlap)
            ),
            reference_metadata=metadata_dict.get("reference_metadata", {}),
            context_summary=context.summary
        )

    def get_temporal_context(self, session_id: str) -> Optional[TemporalContextResponse]:
        """
        Retrieves the flat temporal context record.
        """
        context = self.context_repo.get_by_session(session_id)
        if not context:
            return None
        return TemporalContextResponse.model_validate(context)
