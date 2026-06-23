from typing import Dict, List, Optional
from app.services.temporal.providers.base import TemporalProvider

class ProviderRegistry:
    """
    Registry for managing and fetching historical imagery providers.
    """

    def __init__(self):
        self._providers: Dict[str, TemporalProvider] = {}

    def register_provider(self, provider: TemporalProvider) -> None:
        """
        Registers a temporal provider.
        """
        self._providers[provider.name] = provider

    def get_provider(self, name: str) -> Optional[TemporalProvider]:
        """
        Retrieves a registered provider by name.
        """
        return self._providers.get(name)

    def list_providers(self) -> List[TemporalProvider]:
        """
        Lists all registered providers ordered by their primary priority status.
        """
        return sorted(self._providers.values(), key=lambda p: p.is_primary, reverse=True)

    def get_primary_provider(self) -> Optional[TemporalProvider]:
        """
        Retrieves the primary registered provider.
        """
        for provider in self._providers.values():
            if provider.is_primary:
                return provider
        return None

# Global registry instance
registry = ProviderRegistry()
