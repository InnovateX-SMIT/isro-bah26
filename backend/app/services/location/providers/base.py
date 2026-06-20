from abc import ABC, abstractmethod

class BaseLocationProvider(ABC):
    """
    Abstract base class defining interface for location reverse-geocoding providers.
    Allows easy pluggability and swapping of reverse geocoding systems.
    """
    @abstractmethod
    def reverse_geocode(self, lat: float, lon: float) -> dict | None:
        """
        Reverse geocodes coordinate pair.
        Returns a dict containing resolved 'country', 'state', and 'district',
        or None if the lookup fails.
        """
        pass
