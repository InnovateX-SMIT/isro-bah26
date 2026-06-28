import { WorkflowResponse } from "./types/workflow";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the workflow monitoring profile for a given analysis session.
 */
export async function getWorkflowStatus(sessionId: string): Promise<WorkflowResponse> {
  try {
    const res = await fetch(`${API_URL}/api/v1/workflow/${sessionId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return buildUnavailableWorkflow(sessionId);
    }
    return await res.json();
  } catch {
    return buildUnavailableWorkflow(sessionId);
  }
}

function buildUnavailableWorkflow(sessionId: string): WorkflowResponse {
  return {
    session_id: sessionId,
    current_stage: "Workflow status unavailable",
    overall_progress: 0,
    total_processing_time_ms: 0,
    session_health: "DEGRADED",
    stages: [],
    timeline: [],
    logs: [
      {
        timestamp: new Date().toISOString(),
        stage: "Workflow",
        event: "Workflow status is currently unavailable. Continue from the required workflow step.",
        status: "unavailable",
        severity: "WARNING",
      },
    ],
  };
}
