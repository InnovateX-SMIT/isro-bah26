import { DatasetInspection, DatasetFile } from "./types/dataset-inspection";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function runDatasetInspection(datasetId: string): Promise<DatasetInspection> {
  const res = await fetch(`${API_URL}/api/v1/dataset-inspection/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to execute filesystem inspection" }));
    throw new Error(`[${res.status}] ${errorData.detail || "Failed to execute filesystem inspection"}`);
  }
  return await res.json();
}

export async function getDatasetInspection(datasetId: string): Promise<DatasetInspection> {
  const res = await fetch(`${API_URL}/api/v1/dataset-inspection/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch inspection summary" }));
    throw new Error(`[${res.status}] ${errorData.detail || "Failed to fetch inspection summary"}`);
  }
  return await res.json();
}

export async function getDatasetInspectionFiles(datasetId: string): Promise<DatasetFile[]> {
  const res = await fetch(`${API_URL}/api/v1/dataset-inspection/${datasetId}/files`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`[${res.status}] Failed to fetch discovered files inventory`);
  }
  return await res.json();
}

export async function deleteDatasetInspection(datasetId: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/dataset-inspection/${datasetId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to purge inspection record" }));
    throw new Error(`[${res.status}] ${errorData.detail || "Failed to purge inspection record"}`);
  }
  return true;
}
