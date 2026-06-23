import sys
import os

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app

def print_header(title):
    print(f"\n==================================================")
    print(f" {title}")
    print(f"==================================================")

try:
    # 1. Verify Imports and Interface Compliance
    print_header("1. Verify Provider Interface & Implementations")
    from app.services.temporal.providers.base import TemporalProvider
    from app.services.temporal.providers.gee_provider import GoogleEarthEngineProvider
    from app.services.temporal.providers.local_cache_provider import LocalHistoricalCacheProvider

    # Check inheritance
    assert issubclass(GoogleEarthEngineProvider, TemporalProvider), "GoogleEarthEngineProvider must inherit from TemporalProvider"
    assert issubclass(LocalHistoricalCacheProvider, TemporalProvider), "LocalHistoricalCacheProvider must inherit from TemporalProvider"
    print("✓ Temporal provider inheritance structure is valid.")

    # 2. Verify Provider Registry
    print_header("2. Verify Provider Registry")
    from app.services.temporal.provider_registry import ProviderRegistry, registry
    
    # Check default registration
    providers = registry.list_providers()
    assert len(providers) >= 2, f"Expected at least 2 registered providers, got {len(providers)}"
    
    names = [p.name for p in providers]
    assert "GoogleEarthEngine" in names, "GoogleEarthEngineProvider not registered"
    assert "LocalHistoricalCache" in names, "LocalHistoricalCacheProvider not registered"
    print(f"✓ Registered providers: {names}")

    # Check provider priority
    primary = registry.get_primary_provider()
    assert primary is not None, "Primary provider should be registered"
    assert primary.name == "GoogleEarthEngine", f"Primary provider should be GoogleEarthEngine, got {primary.name}"
    print(f"✓ Primary provider verified: {primary.name}")

    # Test custom registry registration behavior
    test_registry = ProviderRegistry()
    class DummyProvider(TemporalProvider):
        @property
        def name(self) -> str: return "Dummy"
        @property
        def is_primary(self) -> bool: return False
        @property
        def description(self) -> str: return "Dummy provider"
        def health_check(self) -> bool: return True
        def search_imagery(self, coords, bbox, date): return []
        def get_reference(self, cid): return {}

    dummy = DummyProvider()
    test_registry.register_provider(dummy)
    assert test_registry.get_provider("Dummy") == dummy, "Custom registration failing"
    print("✓ Provider registry extension capabilities verified.")

    # 3. Verify Schemas
    print_header("3. Verify Temporal Schemas")
    from app.schemas.temporal import TemporalReferenceCandidate, ProviderInfoResponse, SystemHealthResponse
    
    candidate = TemporalReferenceCandidate(
        candidate_id="test_id",
        provider_name="TestProvider",
        acquisition_date="2026-01-01",
        cloud_cover=10.0,
        spatial_overlap=85.5,
        preview_url="http://example.com/preview.png",
        metadata={"info": "test"}
    )
    assert candidate.candidate_id == "test_id"
    assert candidate.metadata["info"] == "test"
    print("✓ Temporal schemas compile and instantiate successfully.")

    # 4. Verify Service Orchestration
    print_header("4. Verify Temporal Service Foundation")
    from app.services.temporal_service import TemporalService
    service = TemporalService()
    
    available = service.get_available_providers()
    assert len(available) == 2, f"Expected 2 available provider responses, got {len(available)}"
    assert available[0].name == "GoogleEarthEngine"
    assert available[0].is_primary is True
    assert available[1].name == "LocalHistoricalCache"
    assert available[1].is_primary is False
    print("✓ Service returns correctly formatted provider listings.")

    health_report = service.provider_health_status()
    assert health_report.status == "healthy"
    assert len(health_report.providers) == 2
    for p_health in health_report.providers:
        assert p_health.healthy is True, f"Provider {p_health.name} is not healthy in health check"
    print("✓ Service health report compiles correctly and all providers are healthy.")

    # 5. Verify API Layer
    print_header("5. Verify API Endpoints via TestClient")
    client = TestClient(app)
    
    # Test GET /api/v1/temporal/providers
    r = client.get("/api/v1/temporal/providers")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    providers_list = r.json()
    assert len(providers_list) == 2, f"Expected 2 providers in API response, got {len(providers_list)}"
    assert providers_list[0]["name"] == "GoogleEarthEngine"
    assert providers_list[0]["is_primary"] is True
    assert providers_list[1]["name"] == "LocalHistoricalCache"
    assert providers_list[1]["is_primary"] is False
    print("✓ GET /api/v1/temporal/providers is operational and returns correct schema.")

    # Test GET /api/v1/temporal/providers/health
    r = client.get("/api/v1/temporal/providers/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    health_res = r.json()
    assert health_res["status"] == "healthy"
    assert len(health_res["providers"]) == 2
    assert health_res["providers"][0]["name"] == "GoogleEarthEngine"
    assert health_res["providers"][0]["healthy"] is True
    assert health_res["providers"][1]["name"] == "LocalHistoricalCache"
    assert health_res["providers"][1]["healthy"] is True
    print("✓ GET /api/v1/temporal/providers/health is operational and returns correct health report.")

    print("\n==================================================")
    print(" ALL PHASE 5A VERIFICATIONS PASSED!")
    print("==================================================")

except Exception as e:
    print(f"\nValidation failed with error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
