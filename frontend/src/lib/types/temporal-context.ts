export interface ProviderStatistics {
  providers_represented: string[];
  provider_counts: Record<string, number>;
}

export interface CloudStatistics {
  average: number;
  min: number;
  max: number;
}

export interface TemporalStatistics {
  average: number;
  min: number;
  max: number;
}

export interface SpatialStatistics {
  average: number;
  min: number;
  max: number;
}

export interface TemporalCandidate {
  id: string;
  discovery_id: string;
  candidate_id: string;
  provider_name: string;
  acquisition_date: string;
  cloud_cover: number;
  spatial_overlap: number;
  preview_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SelectedReference {
  id: string;
  reference_stack_id: string;
  candidate_id: string;
  rank_position: number;
  ranking_score: number;
  selection_reason: string;
  candidate: TemporalCandidate | null;
  created_at: string;
}

export interface TemporalContextResponse {
  id: string;
  session_id: string;
  dataset_id: string;
  reference_stack_id: string;
  provider_count: number;
  reference_count: number;
  average_cloud_cover: number;
  average_temporal_distance: number;
  average_spatial_overlap: number;
  summary: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TemporalContextPackageResponse {
  selected_references: SelectedReference[];
  provider_summary: ProviderStatistics;
  cloud_statistics: CloudStatistics;
  temporal_statistics: TemporalStatistics;
  spatial_statistics: SpatialStatistics;
  reference_metadata: Record<string, any>;
  context_summary: string;
}
