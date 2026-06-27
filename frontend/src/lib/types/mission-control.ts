import { Dataset } from "./dataset";
import { DatasetMetadata } from "./dataset-metadata";
import { GeospatialContext } from "./geospatial";
import { LocationContext } from "./location";
import { GeospatialContextProfile } from "./geospatial-context";
import { TemporalContextResponse } from "./temporal-context";

export type IntelligenceLayerStatus = "available" | "missing" | "error";

export interface MissionControlStatus {
  metadata: IntelligenceLayerStatus;
  geospatial: IntelligenceLayerStatus;
  location: IntelligenceLayerStatus;
  context: IntelligenceLayerStatus;
  
  // Extended Indicators
  temporal?: IntelligenceLayerStatus;
  cloud?: IntelligenceLayerStatus;
  reconstruction?: IntelligenceLayerStatus;
  temporal_fusion?: IntelligenceLayerStatus;
  confidence?: IntelligenceLayerStatus;
  reliability?: IntelligenceLayerStatus;
  confidence_heatmap?: IntelligenceLayerStatus;
  confidence_analytics?: IntelligenceLayerStatus;
}

export interface MissionControlProfile {
  dataset: Dataset;
  metadata: DatasetMetadata | null;
  geospatial: GeospatialContext | null;
  location: LocationContext | null;
  context: GeospatialContextProfile | null;
  status: MissionControlStatus;
  summary: string | null;
  timestamp: string;

  // Extended Data Placeholders
  temporal?: TemporalContextResponse | null;
  cloud?: Record<string, any> | null;
  reconstruction?: Record<string, any> | null;
  temporal_fusion?: Record<string, any> | null;
  confidence?: Record<string, any> | null;
  reliability?: Record<string, any> | null;
  confidence_heatmap?: Record<string, any> | null;
  confidence_analytics?: Record<string, any> | null;
}
