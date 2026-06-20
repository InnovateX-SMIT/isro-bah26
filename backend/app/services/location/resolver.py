from app.services.location.providers.nominatim import NominatimProvider
from app.services.location.providers.offline_local import OfflineLocalProvider

class LocationResolver:
    """
    Geospatial Coordinate Resolver coordinating pluggable providers in sequence.
    First tries online Nominatim resolution, and falls back to offline local heuristic geocoder on error.
    """
    def __init__(self):
        self.providers = [
            NominatimProvider(),
            OfflineLocalProvider()
        ]

    def resolve(self, lat: float, lon: float) -> dict:
        """
        Loops through available providers and returns the first successful location mapping dict.
        """
        for provider in self.providers:
            try:
                result = provider.reverse_geocode(lat, lon)
                if result and result.get("country"):
                    # Log which resolver resolved this context
                    print(f"Location resolved successfully via provider: {provider.__class__.__name__}")
                    return result
            except Exception as err:
                print(f"Provider {provider.__class__.__name__} resolution failed: {err}")

        # Absolute fail-safe default profile
        return {
            "country": "India",
            "state": "Uttar Pradesh",
            "district": "Mathura"
        }
