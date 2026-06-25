export interface ConfidenceEstimationResponse {
  confidence_id: string;
  reconstruction_run_id: string;
  dataset_id: string;
  confidence_status: string; // pending, completed, failed
  mean_confidence_score: number | null;
  low_confidence_area_percent: number | null;
  confidence_map_path: string | null;
  confidence_preview_path: string | null;
  inference_basis: string;
  confidence_method: string;
  created_at: string;
  updated_at: string;
}

export interface RegionReliability {
  region_id: number;
  mean_confidence: number;
  reliability_tier: string; // High, Moderate, Low, Very Low
  area_px: number;
}

export interface ReliabilityScoreResponse {
  reliability_id: string;
  confidence_estimation_id: string;
  dataset_id: string;
  reliability_status: string; // pending, completed, failed
  dataset_reliability_score: number | null;
  dataset_reliability_tier: string | null;
  region_reliability: RegionReliability[] | null;
  reconstruction_reliability_score: number | null;
  scoring_basis: string;
  scoring_method: string;
  created_at: string;
  updated_at: string;
}

export interface ConfidenceHeatmapResponse {
  heatmap_id: string;
  reliability_score_id: string;
  dataset_id: string;
  heatmap_status: string; // pending, completed, failed
  confidence_overlay_path: string | null;
  reliability_map_path: string | null;
  legend: Record<string, any> | null;
  basis: string;
  heatmap_method: string;
  created_at: string;
  updated_at: string;
}

export interface ConfidenceAnalyticsResponse {
  analytics_id: string;
  confidence_heatmap_id: string;
  dataset_id: string;
  analytics_status: string; // pending, completed, failed
  confidence_report_path: string | null;
  confidence_summary_path: string | null;
  reliability_scorecard_path: string | null;
  headline_summary: string | null;
  report_basis: string;
  analytics_method: string;
  created_at: string;
  updated_at: string;
}

export interface ConfidenceReport {
  report_metadata: {
    timestamp_utc: string;
    report_version: string;
  };
  confidence: {
    confidence_id: string;
    mean_confidence_score: number | null;
    low_confidence_area_percent: number | null;
    confidence_status: string;
    inference_basis: string;
    confidence_map_path: string | null;
    confidence_preview_path: string | null;
    created_at: string;
  };
  reliability: {
    reliability_id: string;
    dataset_reliability_score: number | null;
    dataset_reliability_tier: string | null;
    region_reliability: RegionReliability[] | null;
    reconstruction_reliability_score: number | null;
    scoring_basis: string;
    scoring_method: string;
    created_at: string;
  };
  heatmap: {
    heatmap_id: string;
    heatmap_status: string;
    confidence_overlay_path: string | null;
    reliability_map_path: string | null;
    legend: Record<string, any> | null;
    basis: string;
    heatmap_method: string;
    created_at: string;
  };
}

export interface ConfidenceSummary {
  dataset_id: string;
  dataset_reliability_score: number | null;
  dataset_reliability_tier: string | null;
  mean_confidence_score: number | null;
  low_confidence_area_percent: number | null;
  total_cloud_regions: number;
  region_tier_counts: Record<string, number>;
  headline_summary: string | null;
  timestamp_utc: string;
}

export interface ReliabilityScorecard {
  scores: {
    mean_confidence_score: number;
    low_confidence_area_percent: number;
    dataset_reliability_score: number;
    reconstruction_reliability_score: number;
  };
  grades: {
    "Mean Confidence": string;
    "Dataset Reliability": string;
    "Reconstruction Reliability": string;
  };
  overall_grade: string;
  timestamp_utc: string;
}
