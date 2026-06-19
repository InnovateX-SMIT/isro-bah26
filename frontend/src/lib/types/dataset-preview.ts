export type PreviewStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";

export interface DatasetPreview {
  preview_id: string;
  dataset_id: string;
  preview_status: PreviewStatus;
  preview_image_path: string | null;
  thumbnail_path: string | null;
  preview_width: number | null;
  preview_height: number | null;
  band_count: number | null;
  generation_time_ms: number | null;
  created_at: string;
  updated_at: string;
}
