export type DatasetType = "DEMO" | "CUSTOM";
export type DatasetStatus = "REGISTERED" | "INSPECTING" | "VALIDATED" | "READY" | "FAILED";

export interface Dataset {
  dataset_id: string;
  analysis_session_id: string;
  dataset_name: string;
  dataset_path: string;
  dataset_type: DatasetType;
  dataset_status: DatasetStatus;
  created_at: string;
  updated_at: string;
}

export interface DemoDataset {
  dataset_name: string;
  dataset_path: string;
  dataset_type: "DEMO";
}

export interface DatasetCreatePayload {
  analysis_session_id: string;
  dataset_name: string;
  dataset_path: string;
  dataset_type: DatasetType;
}
