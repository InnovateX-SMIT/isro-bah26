export type InspectionStatus = "PENDING" | "COMPLETED" | "FAILED";
export type FileCategory = "TIF" | "XML" | "TXT" | "META" | "JPG" | "OTHER";

export interface DatasetFile {
  file_id: string;
  inspection_id: string;
  file_name: string;
  file_extension: string;
  relative_path: string;
  file_size_bytes: number;
  file_category: FileCategory;
  created_at: string;
}

export interface DatasetInspection {
  inspection_id: string;
  dataset_id: string;
  inspection_status: InspectionStatus;
  total_files: number;
  total_tif_files: number;
  total_xml_files: number;
  total_txt_files: number;
  total_meta_files: number;
  total_jpg_files: number;
  created_at: string;
  updated_at: string;
}
