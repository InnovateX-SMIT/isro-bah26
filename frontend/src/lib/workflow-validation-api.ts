import { WorkflowValidationResponse } from "./types/workflow";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Executes a granular system audit and validation check of the 5 primary workflows for a given session.
 */
export async function getWorkflowValidation(sessionId: string): Promise<WorkflowValidationResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/workflow/validate/${sessionId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to execute workflow validation audit:", err);
    return null;
  }
}
