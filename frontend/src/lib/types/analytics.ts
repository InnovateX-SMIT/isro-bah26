export interface ExecutiveMetrics {
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  failed_sessions: number;
  total_datasets: number;
  successful_datasets: number;
  avg_processing_time_ms: number;
  workflow_completion_rate: number;
}

export interface DatasetAnalytics {
  type_distribution: Record<string, number>;
  band_distribution: Record<string, number>;
  crs_distribution: Record<string, number>;
  avg_size_bytes: number;
  success_rate: number;
}

export interface WorkflowAnalytics {
  stage_completion_rates: Record<string, number>;
  stage_avg_duration_ms: Record<string, number>;
  stage_failure_rates: Record<string, number>;
}

export interface CloudAnalyticsMetrics {
  avg_coverage_percent: number;
  avg_probability: number;
  thick_vs_thin_ratio: number;
  avg_shadow_percent: number;
  cloud_processing_duration_ms: number;
}

export interface ReconstructionAnalyticsMetrics {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_duration_ms: number;
  strategy_distribution: Record<string, number>;
}

export interface ConfidenceAnalyticsMetrics {
  mean_confidence_score: number;
  reliability_tier_distribution: Record<string, number>;
  low_confidence_area_percent: number;
}

export interface TemporalAnalyticsMetrics {
  avg_references_discovered: number;
  avg_temporal_distance_days: number;
  provider_usage: Record<string, number>;
  search_duration_ms: number;
}

export interface SystemHealthMetrics {
  api_available: boolean;
  db_connected: boolean;
  storage_used_bytes: number;
  storage_free_bytes: number;
  cache_hit_rate: number;
}

export interface TrendItem {
  date: string;
  count: number;
}

export interface HistoricalTrends {
  daily_volume: TrendItem[];
  daily_completion: TrendItem[];
  daily_cloud: TrendItem[];
  daily_confidence: TrendItem[];
}

export interface AnalyticsOverviewResponse {
  executive: ExecutiveMetrics;
  datasets: DatasetAnalytics;
  workflow: WorkflowAnalytics;
  cloud: CloudAnalyticsMetrics;
  reconstruction: ReconstructionAnalyticsMetrics;
  confidence: ConfidenceAnalyticsMetrics;
  temporal: TemporalAnalyticsMetrics;
  system_health: SystemHealthMetrics;
  trends: HistoricalTrends;
}
