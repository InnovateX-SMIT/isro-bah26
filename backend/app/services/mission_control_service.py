from fastapi import HTTPException
from app.repositories.dataset_repository import DatasetRepository
from app.services.dataset_metadata_service import DatasetMetadataService
from app.services.geospatial_service import GeospatialService
from app.services.location_service import LocationService
from app.services.geospatial_context_service import GeospatialContextService
from app.schemas.mission_control import MissionControlResponse, MissionControlStatus
from app.repositories.temporal_context_repository import TemporalContextRepository
from app.schemas.temporal_context import TemporalContextResponse
from app.repositories.cloud_detection_repository import CloudDetectionRepository
from app.repositories.cloud_classification_repository import CloudClassificationRepository



class MissionControlService:
    """
    Stateless aggregation service that compiles individual dataset intelligence
    profiles into a unified operational Mission Control response package.
    Conforms to the stateless architectural constraint of Phase 3D.
    """
    def __init__(
        self,
        dataset_repository: DatasetRepository,
        metadata_service: DatasetMetadataService,
        geospatial_service: GeospatialService,
        location_service: LocationService,
        geospatial_context_service: GeospatialContextService,
        temporal_context_repository: TemporalContextRepository,
        cloud_detection_repository: CloudDetectionRepository = None,
        cloud_classification_repository: CloudClassificationRepository = None
    ):
        self.dataset_repository = dataset_repository
        self.metadata_service = metadata_service
        self.geospatial_service = geospatial_service
        self.location_service = location_service
        self.geospatial_context_service = geospatial_context_service
        self.temporal_context_repository = temporal_context_repository
        self.cloud_detection_repository = cloud_detection_repository
        self.cloud_classification_repository = cloud_classification_repository



    def get_mission_control_profile(self, dataset_id: str) -> MissionControlResponse:
        """
        Gathers available intelligence profiles across all layers and computes
        their readiness status dynamically without persistence.
        """
        # 1. Verify Dataset exists in the primary repository
        dataset = self.dataset_repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset registration {dataset_id} not found."
            )

        status_dict = {
            "metadata": "missing",
            "geospatial": "missing",
            "location": "missing",
            "context": "missing",
            "temporal": "missing",
            "cloud": "not_run"
        }

        data_dict = {
            "dataset": dataset,
            "metadata": None,
            "geospatial": None,
            "location": None,
            "context": None,
            "cloud": None
        }


        # 2. Extract or Fetch Metadata Intelligence
        try:
            metadata = self.metadata_service.get_metadata(dataset_id)
            if metadata:
                if metadata.metadata_status == "COMPLETED":
                    data_dict["metadata"] = metadata
                    status_dict["metadata"] = "available"
                elif metadata.metadata_status == "FAILED":
                    status_dict["metadata"] = "error"
                else:
                    status_dict["metadata"] = "missing"
        except HTTPException as he:
            if he.status_code == 404:
                status_dict["metadata"] = "missing"
            elif he.status_code == 400:
                status_dict["metadata"] = "missing"
            else:
                status_dict["metadata"] = "error"
        except Exception:
            status_dict["metadata"] = "error"

        # 3. Extract or Fetch Geospatial Intelligence (lazy calculation)
        try:
            geospatial = self.geospatial_service.get_or_calculate_context(dataset_id)
            if geospatial:
                data_dict["geospatial"] = geospatial
                status_dict["geospatial"] = "available"
        except HTTPException as he:
            if he.status_code in (400, 404):
                status_dict["geospatial"] = "missing"
            else:
                status_dict["geospatial"] = "error"
        except Exception:
            status_dict["geospatial"] = "error"

        # 4. Extract or Fetch Location Intelligence (lazy calculation)
        try:
            location = self.location_service.get_or_create_location_context(dataset_id)
            if location:
                data_dict["location"] = location
                status_dict["location"] = "available"
        except HTTPException as he:
            if he.status_code in (400, 404):
                status_dict["location"] = "missing"
            else:
                status_dict["location"] = "error"
        except Exception:
            status_dict["location"] = "error"

        # 5. Extract or Fetch Geospatial Context Intelligence (lazy calculation)
        try:
            context = self.geospatial_context_service.get_or_create_context_profile(dataset_id)
            if context:
                data_dict["context"] = context
                status_dict["context"] = "available"
        except HTTPException as he:
            if he.status_code in (400, 404):
                status_dict["context"] = "missing"
            else:
                status_dict["context"] = "error"
        except Exception:
            status_dict["context"] = "error"

        # 5.5 Extract or Fetch Temporal Context
        temporal_context = None
        try:
            context_rec = self.temporal_context_repository.get_by_dataset(dataset_id)
            if context_rec:
                temporal_context = TemporalContextResponse.model_validate(context_rec)
                status_dict["temporal"] = "available"
        except Exception:
            status_dict["temporal"] = "error"

        # 5.6 Extract or Fetch Cloud Detection
        if self.cloud_detection_repository:
            try:
                cloud_rec = self.cloud_detection_repository.get_by_dataset(dataset_id)
                if cloud_rec:
                    if cloud_rec.detection_status == "completed":
                        status_dict["cloud"] = "available"
                        data_dict["cloud"] = {
                            "detection_id": cloud_rec.detection_id,
                            "dataset_id": cloud_rec.dataset_id,
                            "detection_status": cloud_rec.detection_status,
                            "cloud_coverage_percent": cloud_rec.cloud_coverage_percent,
                            "mean_cloud_probability": cloud_rec.mean_cloud_probability,
                            "candidate_region_count": cloud_rec.candidate_region_count,
                            "detection_method": cloud_rec.detection_method,
                            "created_at": cloud_rec.created_at,
                            "updated_at": cloud_rec.updated_at,
                            "classification": None
                        }
                        
                        # Add Cloud Classification details if completed
                        if self.cloud_classification_repository:
                            class_rec = self.cloud_classification_repository.get_by_dataset(dataset_id)
                            if class_rec and class_rec.classification_status == "completed":
                                data_dict["cloud"]["classification"] = {
                                    "classification_id": class_rec.classification_id,
                                    "thick_cloud_region_count": class_rec.thick_cloud_region_count,
                                    "thin_cloud_region_count": class_rec.thin_cloud_region_count,
                                    "cirrus_cloud_region_count": class_rec.cirrus_cloud_region_count,
                                    "uncertain_region_count": class_rec.uncertain_region_count,
                                    "thick_cloud_area_percent": class_rec.thick_cloud_area_percent,
                                    "thin_cloud_area_percent": class_rec.thin_cloud_area_percent,
                                    "cirrus_cloud_area_percent": class_rec.cirrus_cloud_area_percent,
                                    "uncertain_area_percent": class_rec.uncertain_area_percent,
                                    "classification_method": class_rec.classification_method
                                }
                    elif cloud_rec.detection_status == "failed":
                        status_dict["cloud"] = "error"
                    else:
                        status_dict["cloud"] = "not_run"
            except Exception:
                status_dict["cloud"] = "error"



        # 6. Generate dynamic human-readable operational briefing summary
        briefing = self._generate_briefing(
            dataset=dataset,
            metadata=data_dict["metadata"],
            geospatial=data_dict["geospatial"],
            location=data_dict["location"],
            context=data_dict["context"],
            temporal=temporal_context,
            status=status_dict
        )

        return MissionControlResponse(
            dataset=dataset,
            metadata=data_dict["metadata"],
            geospatial=data_dict["geospatial"],
            location=data_dict["location"],
            context=data_dict["context"],
            temporal=temporal_context,
            cloud=data_dict["cloud"],
            status=MissionControlStatus(**status_dict),
            summary=briefing
        )


    def _generate_briefing(self, dataset, metadata, geospatial, location, context, temporal, status) -> str:
        """
        Dynamically constructs a human-readable operational summary report.
        Omits or rephrases sections gracefully depending on available dataset fields.
        """
        parts = []
        dataset_name = dataset.dataset_name if dataset else "LISS-IV scene"

        # A. Location & Administrative Details
        if status.get("location") == "available" and location:
            state = location.state or "unknown state"
            country = location.country or "India"
            region = location.geographic_region or "local region"
            parts.append(f"This LISS-IV dataset ({dataset_name}) covers a region within {state}, {country}, located in the {region}.")
        else:
            parts.append(f"This LISS-IV dataset ({dataset_name}) covers a registered geographical scene footprint.")

        # B. Environmental & Terrain Context
        if status.get("context") == "available" and context:
            env = context.environment_type.lower() if context.environment_type else "environmental"
            terrain = context.terrain_type.lower() if context.terrain_type else "terrain"
            landscape = context.dominant_landscape.lower() if context.dominant_landscape else ""

            detail = f"The scene represents a predominantly {env} {terrain}"
            if landscape:
                detail += f" featuring {landscape}"

            if context.regional_characteristics:
                chars = [c.lower() for c in context.regional_characteristics if c]
                if len(chars) >= 2:
                    detail += f", characterized by {', '.join(chars[:-1])}, and {chars[-1]}"
                elif len(chars) == 1:
                    detail += f", characterized by {chars[0]}"
            detail += "."
            parts.append(detail)
        else:
            parts.append("Environmental terrain profiles and regional geomorphic characteristics are currently pending or could not be resolved.")

        # C. Technical Metadata overview
        if status.get("metadata") == "available" and metadata:
            meta_parts = []
            if metadata.acquisition_date:
                meta_parts.append(f"acquired on {metadata.acquisition_date}")
            if metadata.pixel_size_x and metadata.pixel_size_y:
                res = (abs(metadata.pixel_size_x) + abs(metadata.pixel_size_y)) / 2.0
                meta_parts.append(f"with an average spatial resolution of {res:.2f} meters")
            if metadata.band_count:
                meta_parts.append(f"containing {metadata.band_count} spectral bands")

            if meta_parts:
                parts.append("The scene was " + ", ".join(meta_parts) + ".")

        # D. Temporal Intelligence Context
        if status.get("temporal") == "available" and temporal:
            parts.append(temporal.summary)

        return " ".join(parts)
