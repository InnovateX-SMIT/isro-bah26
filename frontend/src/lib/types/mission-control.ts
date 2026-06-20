import { Dataset } from "./dataset";
import { DatasetMetadata } from "./dataset-metadata";
import { GeospatialContext } from "./geospatial";
import { LocationContext } from "./location";
import { GeospatialContextProfile } from "./geospatial-context";

export type IntelligenceLayerStatus = "available" | "missing" | "error";

export interface MissionControlStatus {
  metadata: IntelligenceLayerStatus;
  geospatial: IntelligenceLayerStatus;
  location: IntelligenceLayerStatus;
  context: IntelligenceLayerStatus;
  
  // Future compatibility indicators
  temporal?: IntelligenceLayerStatus;
  cloud?: IntelligenceLayerStatus;
  reconstruction?: IntelligenceLayerStatus;
  confidence?: IntelligenceLayerStatus;
}

export interface MissionControlProfile {
  dataset: Dataset;
  metadata: DatasetMetadata | null;
  geospatial: GeospatialContext | null;
  location: LocationContext | null;
  context: GeospatialContextProfile | null;
  status: MissionControlStatus;
  summary: string | null;

  // Future compatibility placeholders
  temporal?: Record<string, any> | null;
  cloud?: Record<string, any> | null;
  reconstruction?: Record<string, any> | null;
  confidence?: Record<string, any> | null;
}
