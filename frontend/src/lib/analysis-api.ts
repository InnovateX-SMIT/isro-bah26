import { AnalysisSession } from "./types/analysis";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createAnalysis(): Promise<AnalysisSession> {
  const res = await fetch(`${API_URL}/api/v1/analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to create session" }));
    throw new Error(errorData.detail || "Failed to create session");
  }
  return await res.json();
}

export async function getAnalysisSessions(): Promise<AnalysisSession[]> {
  const res = await fetch(`${API_URL}/api/v1/analysis`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch sessions" }));
    throw new Error(errorData.detail || "Failed to fetch sessions");
  }
  return await res.json();
}

export async function getAnalysisSession(sessionId: string): Promise<AnalysisSession> {
  const res = await fetch(`${API_URL}/api/v1/analysis/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch session details" }));
    throw new Error(errorData.detail || "Failed to fetch session details");
  }
  return await res.json();
}

export async function deleteAnalysisSession(sessionId: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/v1/analysis/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to delete session" }));
    throw new Error(errorData.detail || "Failed to delete session");
  }
  return true;
}
export async function updateAnalysisStatus(sessionId: string, status: string): Promise<AnalysisSession> {
  const res = await fetch(`${API_URL}/api/v1/analysis/${sessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to update session status" }));
    throw new Error(errorData.detail || "Failed to update session status");
  }
  return await res.json();
}
