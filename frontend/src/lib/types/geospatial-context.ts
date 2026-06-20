export interface GeospatialContextProfile {
  dataset_id: string;
  terrain_type: string;
  environment_type: string;
  dominant_landscape: string;
  hydrology_context: string;
  agricultural_context: string;
  urbanization_context: string;
  regional_characteristics: string[];
  inference_basis: string;
  context_summary: string;
}
