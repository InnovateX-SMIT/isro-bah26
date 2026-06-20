import { GeospatialContext } from "./types/geospatial";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the geospatial context of a registered dataset.
 * Triggers lazy generation on the backend if not already computed.
 */
export async function getGeospatialContext(datasetId: string): Promise<GeospatialContext> {
  const res = await fetch(`${API_URL}/api/v1/geospatial/${datasetId}/context`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to fetch geospatial intelligence context" }));
    throw new Error(errorData.detail || "Failed to fetch geospatial intelligence context");
  }
  return await res.json();
}
