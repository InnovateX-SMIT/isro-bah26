import { DatasetMetadata } from "./types/dataset-metadata";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function runDatasetMetadata(datasetId: string): Promise<DatasetMetadata> {
  const res = await fetch(`${API_URL}/api/v1/dataset-metadata/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to extract metadata intelligence" }));
    throw new Error(errorData.detail || "Failed to extract metadata intelligence");
  }
  return await res.json();
}

export async function getDatasetMetadata(datasetId: string): Promise<DatasetMetadata> {
  const res = await fetch(`${API_URL}/api/v1/dataset-metadata/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch metadata summary" }));
    throw new Error(errorData.detail || "Failed to fetch metadata summary");
  }
  return await res.json();
}

export async function deleteDatasetMetadata(datasetId: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/dataset-metadata/${datasetId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to delete metadata profile" }));
    throw new Error(errorData.detail || "Failed to delete metadata profile");
  }
  return true;
}
