export interface ReconstructionRunResponse {
  id: string;
  session_id: string;
  dataset_id: string;
  reconstruction_status: string; // PENDING, RUNNING, COMPLETED, FAILED
  reconstruction_strategy: string | null;
  summary: string | null;
  output_image_path: string | null;
  preview_image_path: string | null;
  reconstruction_method: string | null;
  execution_time_ms: number | null;
  optimization_status: string | null;
  optimization_timestamp: string | null;
  optimization_method: string | null;
  optimized_output_path: string | null;
  optimized_preview_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReconstructionResponse {
  run: ReconstructionRunResponse;
  package: Record<string, any>;
}

export interface OptimizationResponse {
  run: ReconstructionRunResponse;
  report: {
    optimization_methods: string[];
    execution_time_ms: number;
    metrics: {
      boundary_discontinuity_before: number;
      boundary_discontinuity_after: number;
      improvement_percent: number;
    };
    metadata: {
      timestamp_utc: string;
      guided_filter_radius: number;
      guided_filter_epsilon: number;
      boundary_kernel_size: number;
    };
  };
}

export interface ReconstructionOutputResponse {
  session_id: string;
  output_image_path: string | null;
  preview_image_path: string | null;
  reconstruction_method: string | null;
  execution_time_ms: number | null;
}

export interface ReconstructionOptimizedOutputResponse {
  session_id: string;
  optimization_status: string | null;
  optimization_timestamp: string | null;
  optimization_method: string | null;
  optimized_output_path: string | null;
  optimized_preview_path: string | null;
}

export interface QualityMetrics {
  reconstruction_coverage: number;
  completeness_score: number;
  boundary_quality_score: number;
  spatial_consistency_score: number;
  temporal_agreement_score: number;
  structural_preservation_score: number;
  artifact_score: number;
  overall_score: number;
}

export interface EvaluationReport {
  dataset_information: Record<string, any>;
  cloud_information: Record<string, any>;
  temporal_information: Record<string, any>;
  reconstruction_information: Record<string, any>;
  optimization_information: Record<string, any>;
  evaluation_metrics: QualityMetrics;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overall_assessment: string;
  timestamp_utc: string;
}

export interface EvaluationSummary {
  dataset_id: string;
  overall_score: number;
  summary_text: string;
  timestamp_utc: string;
}

export interface ReconstructionScorecard {
  dataset_id: string;
  timestamp_utc: string;
  grades: {
    Coverage: string;
    Completeness: string;
    "Spatial Consistency": string;
    "Boundary Quality": string;
    "Temporal Agreement": string;
    "Structural Edge Preservation": string;
    "Artifact Level (Cleanliness)": string;
  };
  overall_grade: string;
}
