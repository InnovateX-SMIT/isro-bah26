from app.services.temporal.provider_registry import registry
from app.services.temporal.providers.gee_provider import GoogleEarthEngineProvider
from app.services.temporal.providers.local_cache_provider import LocalHistoricalCacheProvider

# Auto-register default providers in global registry on import
registry.register_provider(GoogleEarthEngineProvider())
registry.register_provider(LocalHistoricalCacheProvider())
