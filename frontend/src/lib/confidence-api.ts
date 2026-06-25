import {
  ConfidenceEstimationResponse,
  ReliabilityScoreResponse,
  ConfidenceHeatmapResponse,
  ConfidenceAnalyticsResponse,
  ConfidenceReport
} from "./types/confidence";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Confidence Estimation ---
export async function runConfidenceEstimation(reconstructionRunId: string): Promise<ConfidenceEstimationResponse> {
  const res = await fetch(`${API_URL}/api/v1/confidence/run/${reconstructionRunId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to execute confidence estimation" }));
    throw new Error(errorData.detail || "Failed to execute confidence estimation");
  }
  return await res.json();
}

export async function getConfidenceEstimation(reconstructionRunId: string): Promise<ConfidenceEstimationResponse> {
  const res = await fetch(`${API_URL}/api/v1/confidence/${reconstructionRunId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch confidence estimation record" }));
    throw new Error(errorData.detail || "Failed to fetch confidence estimation record");
  }
  return await res.json();
}

export function getConfidencePreviewUrl(reconstructionRunId: string): string {
  return `${API_URL}/api/v1/confidence/${reconstructionRunId}/image`;
}

// --- Reliability Scoring ---
export async function runReliabilityScoring(confidenceId: string): Promise<ReliabilityScoreResponse> {
  const res = await fetch(`${API_URL}/api/v1/reliability/run/${confidenceId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to execute reliability scoring" }));
    throw new Error(errorData.detail || "Failed to execute reliability scoring");
  }
  return await res.json();
}

export async function getReliabilityScore(confidenceId: string): Promise<ReliabilityScoreResponse> {
  const res = await fetch(`${API_URL}/api/v1/reliability/${confidenceId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch reliability scores" }));
    throw new Error(errorData.detail || "Failed to fetch reliability scores");
  }
  return await res.json();
}

// --- Heatmap Generation ---
export async function runHeatmapGeneration(reliabilityId: string): Promise<ConfidenceHeatmapResponse> {
  const res = await fetch(`${API_URL}/api/v1/confidence-heatmap/run/${reliabilityId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to generate confidence heatmap" }));
    throw new Error(errorData.detail || "Failed to generate confidence heatmap");
  }
  return await res.json();
}

export async function getHeatmap(reliabilityId: string): Promise<ConfidenceHeatmapResponse> {
  const res = await fetch(`${API_URL}/api/v1/confidence-heatmap/${reliabilityId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch confidence heatmap record" }));
    throw new Error(errorData.detail || "Failed to fetch confidence heatmap record");
  }
  return await res.json();
}

export function getConfidenceOverlayUrl(reliabilityId: string): string {
  return `${API_URL}/api/v1/confidence-heatmap/${reliabilityId}/overlay`;
}

export function getReliabilityMapUrl(reliabilityId: string): string {
  return `${API_URL}/api/v1/confidence-heatmap/${reliabilityId}/reliability-map`;
}

// --- Analytics & Reports ---
export async function runAnalytics(heatmapId: string): Promise<ConfidenceAnalyticsResponse> {
  const res = await fetch(`${API_URL}/api/v1/confidence-analytics/run/${heatmapId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to compile confidence analytics" }));
    throw new Error(errorData.detail || "Failed to compile confidence analytics");
  }
  return await res.json();
}

export async function getAnalytics(heatmapId: string): Promise<ConfidenceAnalyticsResponse> {
  const res = await fetch(`${API_URL}/api/v1/confidence-analytics/${heatmapId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch confidence analytics record" }));
    throw new Error(errorData.detail || "Failed to fetch confidence analytics record");
  }
  return await res.json();
}

export async function getConfidenceReportFile(heatmapId: string): Promise<ConfidenceReport> {
  const res = await fetch(`${API_URL}/api/v1/confidence-analytics/${heatmapId}/report`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch full confidence report file" }));
    throw new Error(errorData.detail || "Failed to fetch full confidence report file");
  }
  return await res.json();
}
