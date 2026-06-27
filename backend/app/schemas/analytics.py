from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ExecutiveMetrics(BaseModel):
    total_sessions: int
    active_sessions: int
    completed_sessions: int
    failed_sessions: int
    total_datasets: int
    successful_datasets: int
    avg_processing_time_ms: float
    workflow_completion_rate: float

class DatasetAnalytics(BaseModel):
    type_distribution: Dict[str, int]
    band_distribution: Dict[str, int]
    crs_distribution: Dict[str, int]
    avg_size_bytes: float
    success_rate: float

class WorkflowAnalytics(BaseModel):
    stage_completion_rates: Dict[str, float]
    stage_avg_duration_ms: Dict[str, float]
    stage_failure_rates: Dict[str, float]

class CloudAnalyticsMetrics(BaseModel):
    avg_coverage_percent: float
    avg_probability: float
    thick_vs_thin_ratio: float
    avg_shadow_percent: float
    cloud_processing_duration_ms: float

class ReconstructionAnalyticsMetrics(BaseModel):
    total_runs: int
    successful_runs: int
    failed_runs: int
    avg_duration_ms: float
    strategy_distribution: Dict[str, int]

class ConfidenceAnalyticsMetrics(BaseModel):
    mean_confidence_score: float
    reliability_tier_distribution: Dict[str, int]
    low_confidence_area_percent: float

class TemporalAnalyticsMetrics(BaseModel):
    avg_references_discovered: float
    avg_temporal_distance_days: float
    provider_usage: Dict[str, int]
    search_duration_ms: float

class SystemHealthMetrics(BaseModel):
    api_available: bool
    db_connected: bool
    storage_used_bytes: int
    storage_free_bytes: int
    cache_hit_rate: float

class TrendItem(BaseModel):
    date: str
    count: float

class HistoricalTrends(BaseModel):
    daily_volume: List[TrendItem]
    daily_completion: List[TrendItem]
    daily_cloud: List[TrendItem]
    daily_confidence: List[TrendItem]

class AnalyticsOverviewResponse(BaseModel):
    executive: ExecutiveMetrics
    datasets: DatasetAnalytics
    workflow: WorkflowAnalytics
    cloud: CloudAnalyticsMetrics
    reconstruction: ReconstructionAnalyticsMetrics
    confidence: ConfidenceAnalyticsMetrics
    temporal: TemporalAnalyticsMetrics
    system_health: SystemHealthMetrics
    trends: HistoricalTrends
