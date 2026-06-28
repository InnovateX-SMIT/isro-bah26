const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ReportRequestPayload {
  session_id: string;
  report_type: string; // analysis, metadata, reconstruction, confidence
}

export interface ReportResponse {
  session_id: string;
  report_type: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  file_path: string | null;
  file_size_bytes: number | null;
  created_at: string;
  error_message: string | null;
}

export interface ReportValidationResponse {
  valid: boolean;
  message: string;
  sections: string[];
}

/**
 * Checks which report sections are compiled and validates report prerequisites.
 */
export async function validateReport(payload: ReportRequestPayload): Promise<ReportValidationResponse> {
  const res = await fetch(`${API_URL}/api/v1/reports/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to validate report readiness" }));
    throw new Error(errorData.detail || "Failed to validate report readiness");
  }
  return await res.json();
}

/**
 * Triggers the on-the-fly PDF report compiler for the session.
 */
export async function requestReport(payload: ReportRequestPayload): Promise<ReportResponse> {
  const res = await fetch(`${API_URL}/api/v1/reports/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to compile report" }));
    throw new Error(errorData.detail || "Failed to compile report");
  }
  return await res.json();
}

/**
 * Resolves the raw download URL endpoint for a compiled PDF report.
 */
export function getReportDownloadUrl(sessionId: string, reportType: string): string {
  return `${API_URL}/api/v1/reports/download/${sessionId}/${reportType.toLowerCase()}`;
}
