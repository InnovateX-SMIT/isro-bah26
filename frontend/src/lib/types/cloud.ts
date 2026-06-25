export type CloudStatusType = "pending" | "processing" | "completed" | "failed";

export interface CloudDetectionResponse {
  dataset_id: string;
  detection_id: string;
  detection_status: CloudStatusType;
  cloud_coverage_percent: number | null;
  probability_map_path: string | null;
  mean_cloud_probability: number | null;
  candidate_region_count: number | null;
  detection_method: string;
  created_at: string;
  updated_at: string;
}

export interface CloudClassificationResponse {
  dataset_id: string;
  cloud_detection_id: string;
  classification_id: string;
  classification_status: CloudStatusType;
  thick_cloud_region_count: number | null;
  thin_cloud_region_count: number | null;
  cirrus_cloud_region_count: number | null;
  uncertain_region_count: number | null;
  thick_cloud_area_percent: number | null;
  thin_cloud_area_percent: number | null;
  cirrus_cloud_area_percent: number | null;
  uncertain_area_percent: number | null;
  classification_map_path: string | null;
  classification_preview_path: string | null;
  region_details: Array<{
    class: string;
    mean_probability: number;
    area_px: number;
    compactness: number;
  }>;
  classification_method: string;
  created_at: string;
  updated_at: string;
}

export interface CloudShadowResponse {
  dataset_id: string;
  cloud_classification_id: string;
  shadow_id: string;
  shadow_detection_status: CloudStatusType;
  solar_geometry_available: boolean;
  shadow_region_count: number | null;
  total_shadow_area_percent: number | null;
  linked_shadow_region_count: number | null;
  unlinked_shadow_region_count: number | null;
  mean_shadow_to_cloud_area_ratio: number | null;
  shadow_mask_path: string | null;
  shadow_preview_path: string | null;
  region_details: Array<{
    id: number;
    area_px: number;
    linked_cloud_id: number | null;
    distance: number | null;
  }>;
  detection_method: string;
  created_at: string;
  updated_at: string;
}

export interface CloudSegmentationResponse {
  dataset_id: string;
  cloud_shadow_id: string;
  segmentation_id: string;
  segmentation_status: CloudStatusType;
  total_segmented_regions: number | null;
  total_cloud_pixels: number | null;
  total_shadow_pixels: number | null;
  largest_region_pixels: number | null;
  smallest_region_pixels: number | null;
  mean_region_pixels: number | null;
  total_segmented_area_percent: number | null;
  reconstruction_ready: boolean;
  segmentation_mask_path: string | null;
  reconstruction_mask_path: string | null;
  segmentation_preview_path: string | null;
  region_details: Array<{
    id: number;
    area_px: number;
    bounding_box: [number, number, number, number];
    centroid: [number, number];
    priority: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CloudAnalyticsResponse {
  dataset_id: string;
  cloud_segmentation_id: string;
  analytics_id: string;
  analytics_status: CloudStatusType;
  total_cloud_coverage_percent: number | null;
  total_shadow_coverage_percent: number | null;
  thick_cloud_percent: number | null;
  thin_cloud_percent: number | null;
  cirrus_cloud_percent: number | null;
  uncertain_cloud_percent: number | null;
  total_cloud_objects: number | null;
  high_priority_objects: number | null;
  medium_priority_objects: number | null;
  low_priority_objects: number | null;
  largest_cloud_object_pixels: number | null;
  smallest_cloud_object_pixels: number | null;
  mean_cloud_object_pixels: number | null;
  reconstruction_target_percent: number | null;
  scene_cloud_complexity_score: number | null;
  scene_reconstruction_difficulty: "LOW" | "MEDIUM" | "HIGH" | "EXTREME" | null;
  cloud_intelligence_score: number | null;
  cloud_burden_index: number | null;
  reconstruction_readiness: boolean;
  analytics_summary: Record<string, any>;
  created_at: string;
  updated_at: string;
}
