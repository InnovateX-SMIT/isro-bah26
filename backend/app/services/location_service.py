from fastapi import HTTPException
from app.repositories.location_repository import LocationRepository
from app.repositories.geospatial_repository import GeospatialRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.geospatial_service import GeospatialService
from app.services.location.resolver import LocationResolver
from app.schemas.location_context import LocationContextResponse

# Scientific state classification maps for India
STATE_REGION_MAP = {
    "uttar pradesh": ("Northern India", "Indo-Gangetic Plain"),
    "haryana": ("Northern India", "Indo-Gangetic Plain"),
    "punjab": ("Northern India", "Indo-Gangetic Plain"),
    "delhi": ("Northern India", "Indo-Gangetic Plain"),
    "rajasthan": ("Northern India", "Thar Desert"),
    "himachal pradesh": ("Northern India", "Himalayan Region"),
    "uttarakhand": ("Northern India", "Himalayan Region"),
    "jammu and kashmir": ("Northern India", "Himalayan Region"),
    "ladakh": ("Northern India", "Himalayan Region"),
    
    "maharashtra": ("Western India", "Deccan Plateau"),
    "gujarat": ("Western India", "Western Coastal Zone"),
    "goa": ("Western India", "Western Coastal Zone"),
    
    "karnataka": ("Southern India", "Deccan Plateau"),
    "kerala": ("Southern India", "Western Coastal Zone"),
    "tamil nadu": ("Southern India", "Eastern Coastal Zone"),
    "andhra pradesh": ("Southern India", "Deccan Plateau"),
    "telangana": ("Southern India", "Deccan Plateau"),
    
    "madhya pradesh": ("Central India", "Central Highlands"),
    "chhattisgarh": ("Central India", "Deccan Plateau"),
    
    "west bengal": ("Eastern India", "Indo-Gangetic Plain"),
    "bihar": ("Eastern India", "Indo-Gangetic Plain"),
    "jharkhand": ("Eastern India", "Central Highlands"),
    "odisha": ("Eastern India", "Eastern Coastal Zone"),
    
    "assam": ("Northeast India", "Brahmaputra Valley"),
    "arunachal pradesh": ("Northeast India", "Himalayan Region"),
    "manipur": ("Northeast India", "Northeastern Highlands"),
    "meghalaya": ("Northeast India", "Shillong Plateau"),
    "mizoram": ("Northeast India", "Northeastern Highlands"),
    "nagaland": ("Northeastern Highlands", "Himalayan Region"),
    "tripura": ("Northeast India", "Northeastern Highlands"),
    "sikkim": ("Northeast India", "Himalayan Region")
}

class LocationService:
    """
    Service layer coordinating reverse geocoding coordinates, categorizing regions,
    assembling location summaries, and persisting Location Intelligence profiles.
    """
    def __init__(
        self,
        repository: LocationRepository,
        geospatial_repository: GeospatialRepository,
        dataset_repository: DatasetRepository,
        geospatial_service: GeospatialService
    ):
        self.repository = repository
        self.geospatial_repository = geospatial_repository
        self.dataset_repository = dataset_repository
        self.geospatial_service = geospatial_service
        self.resolver = LocationResolver()

    def get_or_create_location_context(self, dataset_id: str) -> LocationContextResponse:
        """
        Retrieves existing location context from database, or resolves coordinates
        using the geocoding resolver pipeline and saves the context profile.
        """
        # 1. Verify Dataset exists
        dataset = self.dataset_repository.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset registration {dataset_id} not found."
            )

        # 2. Check if context already exists in SQLite
        db_context = self.repository.get_by_dataset(dataset_id)
        if db_context:
            return LocationContextResponse.model_validate(db_context)

        # 3. Retrieve or compute Geospatial Context
        geospatial_context = self.geospatial_repository.get_by_dataset(dataset_id)
        if not geospatial_context:
            try:
                # Trigger lazy generation of geospatial coordinates first
                self.geospatial_service.get_or_calculate_context(dataset_id)
                geospatial_context = self.geospatial_repository.get_by_dataset(dataset_id)
            except Exception as geo_err:
                raise HTTPException(
                    status_code=400,
                    detail=f"Geospatial Context could not be established: {geo_err}"
                )

        if not geospatial_context:
            raise HTTPException(
                status_code=400,
                detail=f"Missing geospatial coordinate bounds context for dataset {dataset_id}."
            )

        # 4. Resolve center coordinates via geocoding provider stack
        lat = geospatial_context.center_lat
        lon = geospatial_context.center_lon

        try:
            resolved = self.resolver.resolve(lat, lon)
        except Exception as res_err:
            raise HTTPException(
                status_code=502,
                detail=f"Location resolution resolver failed: {res_err}"
            )

        country = resolved.get("country", "India")
        state = resolved.get("state", "Uttar Pradesh")
        district = resolved.get("district", "Mathura")

        # 5. Determine administrative and geographic region boundaries
        state_key = state.strip().lower()
        if country.strip().lower() == "india":
            admin_region, geo_region = STATE_REGION_MAP.get(
                state_key, 
                ("Northern India", "Indo-Gangetic Plain")
            )
        else:
            # Fallback classifications for international scenes
            admin_region = "International Zone"
            geo_region = "Global Terrestrial"

        # 6. Generate textual Location Summary dynamically
        location_summary = (
            f"LISS-IV scene located in the {geo_region} of {country}, "
            f"within the state of {state} and intersecting the {district} district."
        )

        # 7. Persist context inside SQLite
        context_data = {
            "country": country,
            "state": state,
            "district": district,
            "administrative_region": admin_region,
            "geographic_region": geo_region,
            "location_summary": location_summary
        }

        try:
            db_context = self.repository.save_context(dataset_id, context_data)
        except Exception as save_err:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to persist Location Context record: {save_err}"
            )

        return LocationContextResponse.model_validate(db_context)

    def delete_location_context(self, dataset_id: str) -> bool:
        """
        Deletes the location context record from the database.
        """
        return self.repository.delete_by_dataset(dataset_id)
