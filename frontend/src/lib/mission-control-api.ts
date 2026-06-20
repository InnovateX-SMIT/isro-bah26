import { MissionControlProfile } from "./types/mission-control";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the consolidated Geospatial Mission Control profile for a given dataset.
 * Triggers lazy generation on the backend for any missing calculation layers.
 */
export async function getMissionControlProfile(datasetId: string): Promise<MissionControlProfile> {
  const res = await fetch(`${API_URL}/api/v1/mission-control/${datasetId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to load Mission Control profile" }));
    throw new Error(errorData.detail || "Failed to load Mission Control profile");
  }
  return await res.json();
}
