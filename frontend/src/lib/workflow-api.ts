import { WorkflowResponse } from "./types/workflow";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the workflow monitoring profile for a given analysis session.
 */
export async function getWorkflowStatus(sessionId: string): Promise<WorkflowResponse> {
  const res = await fetch(`${API_URL}/api/v1/workflow/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to load workflow status" }));
    throw new Error(errorData.detail || "Failed to load workflow status");
  }
  return await res.json();
}
