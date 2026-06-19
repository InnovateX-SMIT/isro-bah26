export type MetadataStatus = "PENDING" | "EXTRACTING" | "COMPLETED" | "FAILED";

export interface DatasetMetadata {
  metadata_id: string;
  dataset_id: string;
  coordinate_system: string | null;
  projection_name: string | null;
  epsg_code: number | null;
  utm_zone: number | null;
  origin_x: number | null;
  origin_y: number | null;
  pixel_size_x: number | null;
  pixel_size_y: number | null;
  raster_width: number | null;
  raster_height: number | null;
  band_count: number | null;
  acquisition_date: string | null;
  metadata_status: MetadataStatus;
  created_at: string;
  updated_at: string;
}
