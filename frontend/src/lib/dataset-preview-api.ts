import { DatasetPreview } from "./types/dataset-preview";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function runDatasetPreview(datasetId: string): Promise<DatasetPreview> {
  const res = await fetch(`${API_URL}/api/v1/dataset-preview/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to generate dataset preview image" }));
    throw new Error(`[${res.status}] ${errorData.detail || "Failed to generate dataset preview image"}`);
  }
  return await res.json();
}

export async function getDatasetPreview(datasetId: string): Promise<DatasetPreview> {
  const res = await fetch(`${API_URL}/api/v1/dataset-preview/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch preview summary" }));
    throw new Error(`[${res.status}] ${errorData.detail || "Failed to fetch preview summary"}`);
  }
  return await res.json();
}

export async function deleteDatasetPreview(datasetId: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/dataset-preview/${datasetId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to purge preview records" }));
    throw new Error(`[${res.status}] ${errorData.detail || "Failed to purge preview records"}`);
  }
  return true;
}

export function getDatasetPreviewImageUrl(datasetId: string): string {
  // Returns cache-busting url for preview image source
  return `${API_URL}/api/v1/dataset-preview/${datasetId}/image?t=${new Date().getTime()}`;
}

export function getDatasetPreviewThumbnailUrl(datasetId: string): string {
  // Returns cache-busting url for thumbnail image source
  return `${API_URL}/api/v1/dataset-preview/${datasetId}/thumbnail?t=${new Date().getTime()}`;
}
