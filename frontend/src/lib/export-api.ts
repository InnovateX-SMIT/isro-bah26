const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ExportRequestPayload {
  session_id: string;
  layer: string;
  format: string;
}

export interface ExportResponse {
  export_id: string;
  session_id: string;
  layer: string;
  format: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  file_path: string | null;
  file_size_bytes: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExportValidationResponse {
  valid: boolean;
  message: string;
}

/**
 * Validates if the selected layer is processed and ready for export on the backend.
 */
export async function validateExport(payload: ExportRequestPayload): Promise<ExportValidationResponse> {
  const res = await fetch(`${API_URL}/api/v1/exports/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to validate layer export" }));
    throw new Error(errorData.detail || "Failed to validate layer export");
  }
  return await res.json();
}

/**
 * Requests the compilation and conversion of the selected layer to the requested format.
 */
export async function requestExport(payload: ExportRequestPayload): Promise<ExportResponse> {
  const res = await fetch(`${API_URL}/api/v1/exports/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to request layer export" }));
    throw new Error(errorData.detail || "Failed to request layer export");
  }
  return await res.json();
}

/**
 * Gets the metadata status of an active export generation task.
 */
export async function getExportStatus(exportId: string): Promise<ExportResponse> {
  const res = await fetch(`${API_URL}/api/v1/exports/status/${exportId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch export status" }));
    throw new Error(errorData.detail || "Failed to fetch export status");
  }
  return await res.json();
}

/**
 * Resolves the raw download URL endpoint for a completed export package.
 */
export function getExportDownloadUrl(exportId: string): string {
  return `${API_URL}/api/v1/exports/download/${exportId}`;
}
