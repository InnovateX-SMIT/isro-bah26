const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PackageResponse {
  package_id: string;
  session_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  format: string;
  file_path: string | null;
  file_size_bytes: number | null;
  progress: number;
  message: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  included_assets: string[];
}

export interface PackageValidationResponse {
  valid: boolean;
  message: string;
  available_assets: string[];
  missing_assets: string[];
}

/**
 * Validates if the session telemetry holds enough ready metrics/layers to compile a package.
 */
export async function validatePackage(sessionId: string): Promise<PackageValidationResponse> {
  const res = await fetch(`${API_URL}/api/v1/packages/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId, format: "ZIP" }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to validate analysis package" }));
    throw new Error(errorData.detail || "Failed to validate analysis package");
  }
  return await res.json();
}

/**
 * Requests the async background compilation and zipping of the consolidated analysis package.
 */
export async function requestPackage(sessionId: string, format: string = "ZIP"): Promise<PackageResponse> {
  const res = await fetch(`${API_URL}/api/v1/packages/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId, format }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to request analysis package" }));
    throw new Error(errorData.detail || "Failed to request analysis package");
  }
  return await res.json();
}

/**
 * Polls the compiler cache status of a session package compilation.
 */
export async function getPackageStatus(sessionId: string): Promise<PackageResponse> {
  const res = await fetch(`${API_URL}/api/v1/packages/status/${sessionId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch package status" }));
    throw new Error(errorData.detail || "Failed to fetch package status");
  }
  return await res.json();
}

/**
 * Resolves the raw download URL endpoint for the completed ZIP package.
 */
export function getPackageDownloadUrl(sessionId: string): string {
  return `${API_URL}/api/v1/packages/download/${sessionId}`;
}
