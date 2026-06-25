import os
import json
import time
import numpy as np
from typing import Optional, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.confidence_analytics_repository import ConfidenceAnalyticsRepository
from app.repositories.confidence_heatmap_repository import ConfidenceHeatmapRepository
from app.repositories.reliability_repository import ReliabilityRepository
from app.repositories.confidence_repository import ConfidenceRepository

from app.models.confidence_heatmap import ConfidenceHeatmap
from app.models.reliability_score import ReliabilityScore
from app.models.confidence_estimation import ConfidenceEstimation

from app.schemas.confidence_estimation import ConfidenceEstimationResponse
from app.schemas.reliability_score import ReliabilityScoreResponse
from app.schemas.confidence_heatmap import ConfidenceHeatmapResponse

from app.services.confidence.analytics_report_builder import (
    build_full_report,
    build_summary,
    build_scorecard,
    generate_headline_summary
)

class ConfidenceAnalyticsService:
    """
    Service layer coordinating Confidence Analytics report generation, caching,
    and DB persistence.
    """
    def __init__(
        self,
        db: Session,
        analytics_repo: ConfidenceAnalyticsRepository,
        heatmap_repo: ConfidenceHeatmapRepository,
        reliability_repo: ReliabilityRepository,
        confidence_repo: ConfidenceRepository
    ):
        self.db = db
        self.analytics_repo = analytics_repo
        self.heatmap_repo = heatmap_repo
        self.reliability_repo = reliability_repo
        self.confidence_repo = confidence_repo

    def get_analytics(self, confidence_heatmap_id: str) -> Optional[Any]:
        """
        Retrieves the confidence analytics record for a given Confidence Heatmap ID.
        """
        record = self.analytics_repo.get_by_confidence_heatmap(confidence_heatmap_id)
        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence analytics record not found for confidence heatmap {confidence_heatmap_id}."
            )
        return record

    def run_analytics(self, confidence_heatmap_id: str) -> Optional[Any]:
        """
        Runs the analytics reporting pipeline:
        1. Cache check via lazy-generate-then-cache.
        2. Validates completed parent ConfidenceHeatmap.
        3. Fetches related ReliabilityScore and ConfidenceEstimation.
        4. Invokes report builder functions to create three JSON visual reports:
           confidence_report.json, confidence_summary.json, and reliability_scorecard.json.
        5. Writes reports to datasets directory on disk.
        6. Persists details to database.
        """
        # Step 1: Cache check
        existing = self.analytics_repo.get_by_confidence_heatmap(confidence_heatmap_id)
        if existing and existing.analytics_status == "completed":
            return existing

        # Step 2: Validate parent confidence heatmap record
        heatmap = self.db.query(ConfidenceHeatmap).filter(
            ConfidenceHeatmap.heatmap_id == confidence_heatmap_id
        ).first()

        if not heatmap:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence heatmap {confidence_heatmap_id} not found."
            )
        if heatmap.heatmap_status != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Parent ConfidenceHeatmap status is '{heatmap.heatmap_status}'. It must be 'completed'."
            )

        # Fetch related reliability score record
        rel_score = self.db.query(ReliabilityScore).filter(
            ReliabilityScore.reliability_id == heatmap.reliability_score_id
        ).first()
        if not rel_score or rel_score.reliability_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Parent ReliabilityScore is missing or not completed."
            )

        # Fetch related confidence estimation details
        conf_est = self.confidence_repo.get_by_id(rel_score.confidence_estimation_id)
        if not conf_est or conf_est.confidence_status != "completed":
            raise HTTPException(
                status_code=400,
                detail="Parent ConfidenceEstimation is missing or not completed."
            )

        # Resolve workspace root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

        # Initialize/fetch record in database
        record = existing
        if not record:
            record = self.analytics_repo.create(
                confidence_heatmap_id=confidence_heatmap_id,
                dataset_id=heatmap.dataset_id,
                report_basis="Initializing confidence analytics engine...",
                status="pending"
            )
        else:
            self.analytics_repo.update_status(record.analytics_id, "pending", report_basis="Re-initializing analytics reports...")

        try:
            # Serialize database objects to dicts using Pydantic schemas
            conf_data = ConfidenceEstimationResponse.model_validate(conf_est).model_dump()
            rel_data = ReliabilityScoreResponse.model_validate(rel_score).model_dump()
            heat_data = ConfidenceHeatmapResponse.model_validate(heatmap).model_dump()

            timestamp_utc = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            # 1. Tally region tiers using numpy for speed
            regions = rel_data.get("region_reliability") or []
            region_tier_counts = {"High": 0, "Moderate": 0, "Low": 0, "Very Low": 0}
            if regions:
                tiers = [r.get("reliability_tier") for r in regions if r.get("reliability_tier")]
                unique, counts = np.unique(tiers, return_counts=True)
                for u, c in zip(unique, counts):
                    if u in region_tier_counts:
                        region_tier_counts[u] = int(c)

            # 2. Build headline summary
            headline = generate_headline_summary(
                reliability_tier=rel_score.dataset_reliability_tier,
                dataset_reliability_score=rel_score.dataset_reliability_score,
                region_tier_counts=region_tier_counts
            )

            # 3. Generate the three JSON reports
            full_report = build_full_report(conf_data, rel_data, heat_data, timestamp_utc)
            summary_report = build_summary(full_report, headline)
            scorecard_report = build_scorecard(full_report)

            # Output paths
            output_dir_rel = f"datasets/confidence_analytics/{heatmap.dataset_id}"
            output_dir_abs = os.path.abspath(os.path.join(workspace_root, output_dir_rel))
            os.makedirs(output_dir_abs, exist_ok=True)

            report_path_rel = f"{output_dir_rel}/confidence_report.json"
            summary_path_rel = f"{output_dir_rel}/confidence_summary.json"
            scorecard_path_rel = f"{output_dir_rel}/reliability_scorecard.json"

            report_path_abs = os.path.join(output_dir_abs, "confidence_report.json")
            summary_path_abs = os.path.join(output_dir_abs, "confidence_summary.json")
            scorecard_path_abs = os.path.join(output_dir_abs, "reliability_scorecard.json")

            # Save JSON files to disk
            with open(report_path_abs, "w") as f:
                json.dump(full_report, f, indent=4)
            with open(summary_path_abs, "w") as f:
                json.dump(summary_report, f, indent=4)
            with open(scorecard_path_abs, "w") as f:
                json.dump(scorecard_report, f, indent=4)

            basis_str = (
                f"Aggregated reports and scorecards generated on {timestamp_utc}. "
                f"Consumes ConfidenceEstimation {conf_est.confidence_id}, ReliabilityScore {rel_score.reliability_id}, "
                f"and ConfidenceHeatmap {heatmap.heatmap_id}."
            )

            # Step 5: Save database record
            updated_record = self.analytics_repo.update_status(
                analytics_id=record.analytics_id,
                status="completed",
                confidence_report_path=report_path_rel,
                confidence_summary_path=summary_path_rel,
                reliability_scorecard_path=scorecard_path_rel,
                headline_summary=headline,
                report_basis=basis_str
            )
            return updated_record

        except Exception as e:
            self.analytics_repo.update_status(
                analytics_id=record.analytics_id,
                status="failed",
                report_basis=f"Analytics report generation failed: {str(e)}"
            )
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=500,
                detail=f"Analytics report generation failed: {str(e)}"
            )

    def delete_analytics(self, confidence_heatmap_id: str) -> bool:
        """
        Deletes the confidence analytics record.
        """
        analytics = self.analytics_repo.get_by_confidence_heatmap(confidence_heatmap_id)
        if not analytics:
            raise HTTPException(
                status_code=404,
                detail=f"Confidence analytics record not found for confidence heatmap {confidence_heatmap_id}."
            )
        return self.analytics_repo.delete_by_confidence_heatmap(confidence_heatmap_id)
