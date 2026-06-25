import {
  CloudDetectionResponse,
  CloudClassificationResponse,
  CloudShadowResponse,
  CloudSegmentationResponse,
  CloudAnalyticsResponse
} from "./types/cloud";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Cloud Detection ---
export async function runCloudDetection(datasetId: string): Promise<CloudDetectionResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-detection/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to run cloud detection" }));
    throw new Error(errorData.detail || "Failed to run cloud detection");
  }
  return await res.json();
}

export async function getCloudDetection(datasetId: string): Promise<CloudDetectionResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-detection/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch cloud detection for dataset ${datasetId}`);
  }
  return await res.json();
}

export function getProbabilityMapUrl(datasetId: string): string {
  return `${API_URL}/api/v1/cloud-detection/${datasetId}/probability-map`;
}

// --- Cloud Classification ---
export async function runCloudClassification(datasetId: string): Promise<CloudClassificationResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-classification/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to run cloud classification" }));
    throw new Error(errorData.detail || "Failed to run cloud classification");
  }
  return await res.json();
}

export async function getCloudClassification(datasetId: string): Promise<CloudClassificationResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-classification/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch cloud classification for dataset ${datasetId}`);
  }
  return await res.json();
}

export function getClassificationPreviewUrl(datasetId: string): string {
  return `${API_URL}/api/v1/cloud-classification/${datasetId}/preview`;
}

// --- Cloud Shadow ---
export async function runCloudShadow(datasetId: string): Promise<CloudShadowResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-shadow/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to run cloud shadow detection" }));
    throw new Error(errorData.detail || "Failed to run cloud shadow detection");
  }
  return await res.json();
}

export async function getCloudShadow(datasetId: string): Promise<CloudShadowResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-shadow/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch cloud shadow for dataset ${datasetId}`);
  }
  return await res.json();
}

export function getShadowPreviewUrl(datasetId: string): string {
  return `${API_URL}/api/v1/cloud-shadow/${datasetId}/preview`;
}

// --- Cloud Segmentation ---
export async function runCloudSegmentation(datasetId: string): Promise<CloudSegmentationResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-segmentation/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to run cloud segmentation" }));
    throw new Error(errorData.detail || "Failed to run cloud segmentation");
  }
  return await res.json();
}

export async function getCloudSegmentation(datasetId: string): Promise<CloudSegmentationResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-segmentation/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch cloud segmentation for dataset ${datasetId}`);
  }
  return await res.json();
}

export function getSegmentationPreviewUrl(datasetId: string): string {
  return `${API_URL}/api/v1/cloud-segmentation/${datasetId}/preview`;
}

// --- Cloud Analytics ---
export async function runCloudAnalytics(datasetId: string): Promise<CloudAnalyticsResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-analytics/run/${datasetId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to run cloud analytics" }));
    throw new Error(errorData.detail || "Failed to run cloud analytics");
  }
  return await res.json();
}

export async function getCloudAnalytics(datasetId: string): Promise<CloudAnalyticsResponse> {
  const res = await fetch(`${API_URL}/api/v1/cloud-analytics/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch cloud analytics for dataset ${datasetId}`);
  }
  return await res.json();
}
