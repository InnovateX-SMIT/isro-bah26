import { AnalyticsOverviewResponse } from "./types/analytics";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the operational analytics overview metrics.
 */
export async function getOverviewAnalytics(): Promise<AnalyticsOverviewResponse> {
  const res = await fetch(`${API_URL}/api/v1/analytics/overview`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to load operational analytics" }));
    throw new Error(errorData.detail || "Failed to load operational analytics");
  }
  return await res.json();
}
