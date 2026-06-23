import {
  ProviderInfoResponse,
  SystemHealthResponse,
  TemporalCandidateListResponse,
  TemporalDiscoveryResponse,
  ReferenceStackResponse,
  SelectedReference,
  TemporalContextPackageResponse,
  TemporalContextResponse,
  TemporalDiscoveryRequest,
  ReferenceSelectionRequest
} from "./types/temporal-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves administrative profiles for all currently registered historical temporal providers.
 */
export async function getProviders(): Promise<ProviderInfoResponse[]> {
  const res = await fetch(`${API_URL}/api/v1/temporal/providers`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch temporal providers" }));
    throw new Error(errorData.detail || "Failed to fetch temporal providers");
  }
  return await res.json();
}

/**
 * Performs diagnostic queries to check live online/connectivity status of all providers.
 */
export async function getProvidersHealth(): Promise<SystemHealthResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/providers/health`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch provider health status" }));
    throw new Error(errorData.detail || "Failed to fetch provider health status");
  }
  return await res.json();
}

/**
 * Triggers the Historical Discovery Engine to search for reference candidates matching the dataset footprint.
 */
export async function runDiscovery(sessionId: string, payload: TemporalDiscoveryRequest): Promise<TemporalCandidateListResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/discover/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to run historical discovery" }));
    throw new Error(errorData.detail || "Failed to run historical discovery");
  }
  return await res.json();
}

/**
 * Retrieves metadata details of the latest discovery run executed for this session.
 */
export async function getLatestDiscovery(sessionId: string): Promise<TemporalDiscoveryResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/discover/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch latest discovery run" }));
    throw new Error(errorData.detail || "Failed to fetch latest discovery run");
  }
  return await res.json();
}

/**
 * Retrieves the list of candidate observations matching the latest discovery run.
 */
export async function getDiscoveredCandidates(sessionId: string): Promise<TemporalCandidateListResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/discover/${sessionId}/candidates`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch discovered candidates" }));
    throw new Error(errorData.detail || "Failed to fetch discovered candidates");
  }
  return await res.json();
}

/**
 * Evaluates all discovered candidates for this session, ranks them, selects the top N, and saves the stack.
 */
export async function runReferenceSelection(sessionId: string, payload: ReferenceSelectionRequest): Promise<ReferenceStackResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/select/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to run reference selection" }));
    throw new Error(errorData.detail || "Failed to run reference selection");
  }
  return await res.json();
}

/**
 * Retrieves the metadata and selected references of the latest reference stack generated for this session.
 */
export async function getReferenceStack(sessionId: string): Promise<ReferenceStackResponse> {
  const res = await fetch(`${API_URL}/api/v1/temporal/references/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch latest reference stack" }));
    throw new Error(errorData.detail || "Failed to fetch latest reference stack");
  }
  return await res.json();
}

/**
 * Retrieves the detailed list of selected reference candidates along with scores and explanations.
 */
export async function getSelectedReferences(sessionId: string): Promise<SelectedReference[]> {
  const res = await fetch(`${API_URL}/api/v1/temporal/references/${sessionId}/selected`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch selected references" }));
    throw new Error(errorData.detail || "Failed to fetch selected references");
  }
  return await res.json();
}

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

