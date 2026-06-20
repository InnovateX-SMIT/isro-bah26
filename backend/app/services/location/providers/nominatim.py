import urllib.request
import urllib.parse
import json
from app.services.location.providers.base import BaseLocationProvider

class NominatimProvider(BaseLocationProvider):
    """
    Location provider resolving geographic coordinates against OpenStreetMap Nominatim web service.
    """
    def reverse_geocode(self, lat: float, lon: float) -> dict | None:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'ISRO-BAH26-Geospatial-Platform/1.0'}
        )
        try:
            # Short timeout of 3 seconds to avoid stalling if offline
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.status == 200:
                    body = response.read().decode("utf-8")
                    data = json.loads(body)
                    address = data.get("address", {})
                    
                    country = address.get("country")
                    state = address.get("state")
                    
                    # Nominatim address keys can vary; check multiple candidates for district
                    district = (
                        address.get("district") or 
                        address.get("state_district") or 
                        address.get("county") or 
                        address.get("suburb") or 
                        address.get("city") or 
                        address.get("town")
                    )
                    
                    if country or state or district:
                        return {
                            "country": country or "Unknown",
                            "state": state or "Unknown",
                            "district": district or "Unknown"
                        }
        except Exception as e:
            # Log failure but return None to support provider fallback cascade
            print(f"Nominatim lookup failed: {e}")
        return None
