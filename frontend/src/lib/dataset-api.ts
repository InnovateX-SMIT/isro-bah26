import { Dataset, DemoDataset, DatasetCreatePayload } from "./types/dataset";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getDemoDatasets(): Promise<DemoDataset[]> {
  const res = await fetch(`${API_URL}/api/v1/datasets/demo`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch demo datasets");
  }
  return await res.json();
}

export async function registerDataset(payload: DatasetCreatePayload): Promise<Dataset> {
  const res = await fetch(`${API_URL}/api/v1/datasets/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to register dataset" }));
    throw new Error(errorData.detail || "Failed to register dataset");
  }
  return await res.json();
}

export async function getRegisteredDatasets(): Promise<Dataset[]> {
  const res = await fetch(`${API_URL}/api/v1/datasets`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch registered datasets");
  }
  return await res.json();
}

export async function getDataset(id: string): Promise<Dataset> {
  const res = await fetch(`${API_URL}/api/v1/datasets/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset ${id}`);
  }
  return await res.json();
}

export async function getSessionDatasets(sessionId: string): Promise<Dataset[]> {
  const res = await fetch(`${API_URL}/api/v1/datasets/session/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch datasets for session ${sessionId}`);
  }
  return await res.json();
}

export async function deleteDataset(id: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/datasets/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to delete dataset registration" }));
    throw new Error(errorData.detail || "Failed to delete dataset registration");
  }
  return true;
}
