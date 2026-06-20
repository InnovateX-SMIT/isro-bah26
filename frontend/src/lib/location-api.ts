import { LocationContext } from "./types/location";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the location intelligence context of a registered dataset.
 * Triggers lazy generation on the backend if not already computed.
 */
export async function getDatasetLocationContext(datasetId: string): Promise<LocationContext> {
  const res = await fetch(`${API_URL}/api/v1/location/${datasetId}/context`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to resolve location intelligence context" }));
    throw new Error(errorData.detail || "Failed to resolve location intelligence context");
  }
  return await res.json();
}
