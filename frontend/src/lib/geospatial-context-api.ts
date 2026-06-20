import { GeospatialContextProfile } from "./types/geospatial-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the environmental geospatial context profile of a registered dataset.
 * Triggers lazy generation on the backend if not already computed.
 */
export async function getGeospatialContextProfile(datasetId: string): Promise<GeospatialContextProfile> {
  const res = await fetch(`${API_URL}/api/v1/geospatial-context/${datasetId}/profile`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to resolve geospatial context profile" }));
    throw new Error(errorData.detail || "Failed to resolve geospatial context profile");
  }
  return await res.json();
}
