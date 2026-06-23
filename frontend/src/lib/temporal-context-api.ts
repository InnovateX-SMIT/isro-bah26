import { TemporalContextPackageResponse, TemporalContextResponse } from "./types/temporal-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generates the reconstruction-ready Temporal Context Package for a given session.
 */
export async function generateTemporalContext(sessionId: string): Promise<TemporalContextPackageResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/context/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to generate temporal context" }));
    throw new Error(errorData.detail || "Failed to generate temporal context");
  }
  return await res.json();
}

/**
 * Retrieves the flat temporal context record for a given session.
 */
export async function getTemporalContext(sessionId: string): Promise<TemporalContextResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/context/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch temporal context record" }));
    throw new Error(errorData.detail || "Failed to fetch temporal context record");
  }
  return await res.json();
}

/**
 * Retrieves only the human briefing summary.
 */
export async function getTemporalSummary(sessionId: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/temporal/context/${sessionId}/summary`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch temporal briefing summary" }));
    throw new Error(errorData.detail || "Failed to fetch temporal briefing summary");
  }
  return await res.text();
}

/**
 * Retrieves the complete temporal context package.
 */
export async function getTemporalContextPackage(sessionId: string): Promise<TemporalContextPackageResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/context/${sessionId}/statistics`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch temporal context package" }));
    throw new Error(errorData.detail || "Failed to fetch temporal context package");
  }
  return await res.json();
}
