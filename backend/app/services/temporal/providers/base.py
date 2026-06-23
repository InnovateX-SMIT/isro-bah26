from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.schemas.temporal import TemporalReferenceCandidate

class TemporalProvider(ABC):
    """
    Abstract base class defining the standard interface and capabilities for historical temporal imagery providers.
    All providers registered with the platform's temporal service must implement this class.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Unique name/identifier of the provider (e.g. 'GoogleEarthEngine').
        """
        pass

    @property
    @abstractmethod
    def is_primary(self) -> bool:
        """
        Indicates if this provider is the primary source of historical imagery.
        """
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """
        Brief text explanation of the provider database/capabilities.
        """
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """
        Runs diagnostic connectivity checks for the provider.
        Returns True if the provider is fully operational, False otherwise.
        """
        pass

    @abstractmethod
    def search_imagery(
        self,
        coordinates: Dict[str, float],
        bounding_box: List[List[float]],
        acquisition_date: str
    ) -> List[TemporalReferenceCandidate]:
        """
        Searches provider for historical reference imagery candidates matching spatial coordinates,
        bounding box footprint, and target acquisition date timeframe.
        """
        pass

    @abstractmethod
    def get_reference(self, candidate_id: str) -> Dict[str, Any]:
        """
        Fetches metadata or reference credentials for a specific imagery candidate.
        """
        pass
