from fastapi import HTTPException
from app.repositories.geospatial_context_profile_repository import GeospatialContextProfileRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.location_service import LocationService
from app.services.geospatial_context.knowledge_base import REGIONAL_CONTEXT_MAPPINGS, DEFAULT_CONTEXT
from app.schemas.geospatial_context_profile import GeospatialContextProfileResponse

class GeospatialContextService:
    """
    Service layer coordinating Environmental and Geospatial Context Profile generation.
    Resolves dataset administrative locations first and executes the rules engine
    reading from the static scientific knowledge base mapping.
    """
    def __init__(
        self,
        repository: GeospatialContextProfileRepository,
        location_repository: LocationRepository,
        dataset_repository: DatasetRepository,
        location_service: LocationService
    ):
        self.repository = repository
        self.location_repository = location_repository
        self.dataset_repository = dataset_repository
        self.location_service = location_service

    def get_or_create_context_profile(self, dataset_id: str) -> GeospatialContextProfileResponse:
        """
        Retrieves existing context profile or runs context intelligence rule engine
        to deduce environmental descriptors, then stores context inside SQLite.
        """
        # 1. Verify Dataset exists
        dataset = self.dataset_repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset registration {dataset_id} not found."
            )

        # 2. Check if profile already exists in database
        db_profile = self.repository.get_by_dataset(dataset_id)
        if db_profile:
            return self._build_response(db_profile)

        # 3. Retrieve or compute Location Context (lazy generation cascade)
        location_context = self.location_repository.get_by_dataset(dataset_id)
        if not location_context:
            try:
                self.location_service.get_or_create_location_context(dataset_id)
                location_context = self.location_repository.get_by_dataset(dataset_id)
            except Exception as loc_err:
                raise HTTPException(
                    status_code=400,
                    detail=f"Location Context is missing and could not be established: {loc_err}"
                )

        if not location_context:
            raise HTTPException(
                status_code=400,
                detail=f"Location Context is required to infer environmental profile features for dataset {dataset_id}."
            )

        # 4. Lookup geographic region traits inside static knowledge base
        geo_region = location_context.geographic_region or ""
        region_key = geo_region.strip().lower()

        traits = REGIONAL_CONTEXT_MAPPINGS.get(region_key, DEFAULT_CONTEXT)

        # 5. Extract features
        terrain_type = traits["terrain_type"]
        environment_type = traits["environment_type"]
        dominant_landscape = traits["dominant_landscape"]
        hydrology_context = traits["hydrology_context"]
        agricultural_context = traits["agricultural_context"]
        urbanization_context = traits["urbanization_context"]
        characteristics_list = traits["regional_characteristics"]
        inference_basis = "rule-based regional heuristic"

        # 6. Generate dynamic contextual summary report with explainability disclaimers
        char_desc = ""
        if len(characteristics_list) >= 3:
            char_desc = f"characterized by {characteristics_list[0].lower()}, {characteristics_list[1].lower()}, and {characteristics_list[2].lower()}"
        elif len(characteristics_list) > 0:
            char_desc = f"characterized by {', '.join([c.lower() for c in characteristics_list])}"

        summary = (
            f"This dataset covers a predominantly {environment_type.lower()} {terrain_type.lower()} "
            f"within the {geo_region} region {char_desc}. "
            f"This characterization is derived from regional classification data and should be treated "
            f"as contextual guidance rather than verified ground survey data."
        )

        # 7. Persist context inside SQLite
        context_data = {
            "terrain_type": terrain_type,
            "environment_type": environment_type,
            "dominant_landscape": dominant_landscape,
            "hydrology_context": hydrology_context,
            "agricultural_context": agricultural_context,
            "urbanization_context": urbanization_context,
            "regional_characteristics": ";".join(characteristics_list),
            "inference_basis": inference_basis,
            "context_summary": summary
        }

        try:
            db_profile = self.repository.save_profile(dataset_id, context_data)
        except Exception as save_err:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to persist Geospatial Context Profile record: {save_err}"
            )

        return self._build_response(db_profile)

    def delete_profile(self, dataset_id: str) -> bool:
        """
        Deletes the context profile record from the database.
        """
        return self.repository.delete_by_dataset(dataset_id)

    def _build_response(self, db_profile) -> GeospatialContextProfileResponse:
        """
        Converts SQLAlchemy model instance to Pydantic Response Schema model.
        """
        chars = [c.strip() for c in db_profile.regional_characteristics.split(";") if c.strip()]
        return GeospatialContextProfileResponse(
            dataset_id=db_profile.dataset_id,
            terrain_type=db_profile.terrain_type,
            environment_type=db_profile.environment_type,
            dominant_landscape=db_profile.dominant_landscape,
            hydrology_context=db_profile.hydrology_context,
            agricultural_context=db_profile.agricultural_context,
            urbanization_context=db_profile.urbanization_context,
            regional_characteristics=chars,
            inference_basis=db_profile.inference_basis,
            context_summary=db_profile.context_summary
        )
