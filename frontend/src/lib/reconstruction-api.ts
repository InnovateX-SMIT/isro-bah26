import {
  ReconstructionResponse,
  ReconstructionRunResponse,
  ReconstructionOutputResponse,
  OptimizationResponse,
  ReconstructionOptimizedOutputResponse,
  EvaluationReport,
  QualityMetrics,
  ReconstructionScorecard
} from "./types/reconstruction";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Triggers the reconstruction pipeline foundation run.
 */
export async function runReconstruction(sessionId: string, strategy: string = "DEFAULT"): Promise<ReconstructionResponse> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/run/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategy }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to execute reconstruction" }));
    throw new Error(errorData.detail || "Failed to execute reconstruction");
  }
  return await res.json();
}

/**
 * Retrieves the latest reconstruction run status record.
 */
export async function getReconstructionStatus(sessionId: string): Promise<ReconstructionRunResponse> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch reconstruction status" }));
    throw new Error(errorData.detail || "Failed to fetch reconstruction status");
  }
  return await res.json();
}

/**
 * Retrieves the explainable text summary of reconstruction.
 */
export async function getReconstructionSummary(sessionId: string): Promise<{ session_id: string; reconstruction_status: string; summary: string | null }> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}/summary`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch reconstruction summary" }));
    throw new Error(errorData.detail || "Failed to fetch reconstruction summary");
  }
  return await res.json();
}

/**
 * Retrieves file paths and processing metadata for reconstruction run.
 */
export async function getReconstructionOutput(sessionId: string): Promise<ReconstructionOutputResponse> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}/output`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch reconstruction output paths" }));
    throw new Error(errorData.detail || "Failed to fetch reconstruction output paths");
  }
  return await res.json();
}

/**
 * Helper to build reconstruction preview URL path.
 */
export function getReconstructionPreviewUrl(sessionId: string): string {
  return `${API_URL}/api/v1/reconstruction/${sessionId}/preview`;
}

/**
 * Triggers the reconstruction post-processing spatial and spectral optimization.
 */
export async function runOptimization(sessionId: string): Promise<OptimizationResponse> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/optimize/${sessionId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to execute reconstruction optimization" }));
    throw new Error(errorData.detail || "Failed to execute reconstruction optimization");
  }
  return await res.json();
}

/**
 * Retrieves file paths and optimization metrics.
 */
export async function getReconstructionOptimizedOutput(sessionId: string): Promise<ReconstructionOptimizedOutputResponse> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}/optimized-output`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch optimized output paths" }));
    throw new Error(errorData.detail || "Failed to fetch optimized output paths");
  }
  return await res.json();
}

/**
 * Helper to build optimized preview URL path.
 */
export function getReconstructionOptimizedPreviewUrl(sessionId: string): string {
  return `${API_URL}/api/v1/reconstruction/${sessionId}/optimized-preview`;
}

/**
 * Triggers the quantitative evaluation scoring algorithm.
 */
export async function runEvaluation(sessionId: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/evaluate/${sessionId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to execute evaluation scoring" }));
    throw new Error(errorData.detail || "Failed to execute evaluation scoring");
  }
  return await res.json();
}

/**
 * Retrieves the comprehensive machine-readable evaluation report JSON.
 */
export async function getEvaluationReport(sessionId: string): Promise<EvaluationReport> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}/evaluation`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch evaluation report" }));
    throw new Error(errorData.detail || "Failed to fetch evaluation report");
  }
  return await res.json();
}

/**
 * Retrieves flat quality metric dictionary.
 */
export async function getEvaluationMetrics(sessionId: string): Promise<QualityMetrics> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}/evaluation/metrics`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch quality metrics" }));
    throw new Error(errorData.detail || "Failed to fetch quality metrics");
  }
  return await res.json();
}

/**
 * Retrieves standard letter grades scorecard.
 */
export async function getEvaluationScorecard(sessionId: string): Promise<ReconstructionScorecard> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}/evaluation/scorecard`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch scorecard report" }));
    throw new Error(errorData.detail || "Failed to fetch scorecard report");
  }
  return await res.json();
}

/**
 * Retrieves status of evaluation (whether completed or not).
 */
export async function getEvaluationStatus(sessionId: string): Promise<{ session_id: string; evaluation_status: "COMPLETED" | "NOT_STARTED" }> {
  const res = await fetch(`${API_URL}/api/v1/reconstruction/${sessionId}/evaluation/status`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch evaluation status" }));
    throw new Error(errorData.detail || "Failed to fetch evaluation status");
  }
  return await res.json();
}
