"use client"

import React, { useEffect, useState } from "react";
import { Dataset } from "@/lib/types/dataset";
import { DatasetMetadata } from "@/lib/types/dataset-metadata";
import { GeospatialContext } from "@/lib/types/geospatial";
import { getRegisteredDatasets } from "@/lib/dataset-api";
import { getDatasetMetadata } from "@/lib/dataset-metadata-api";
import { getGeospatialContext } from "@/lib/geospatial-api";
import { getDatasetLocationContext } from "@/lib/location-api";
import { getGeospatialContextProfile } from "@/lib/geospatial-context-api";
import { LocationContext } from "@/lib/types/location";
import { GeospatialContextProfile } from "@/lib/types/geospatial-context";
import GeospatialMap from "@/components/geospatial/GeospatialMap";
import DatasetInfoPanel from "@/components/geospatial/DatasetInfoPanel";
import DatasetBoundsLayer from "@/components/geospatial/DatasetBoundsLayer";
import LocationIntelligencePanel from "@/components/location/LocationIntelligencePanel";
import GeospatialContextPanel from "@/components/context/GeospatialContextPanel";
import { RefreshCw, MapPin, Database, Loader2, Compass, AlertCircle } from "lucide-react";

export default function GeospatialPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [context, setContext] = useState<GeospatialContext | null>(null);
  const [location, setLocation] = useState<LocationContext | null>(null);
  const [profile, setProfile] = useState<GeospatialContextProfile | null>(null);

  // States
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);
  const [loadingContext, setLoadingContext] = useState<boolean>(false);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load registered datasets
  const fetchDatasets = async (showLoading = true) => {
    if (showLoading) setLoadingDatasets(true);
    try {
      const list = await getRegisteredDatasets();
      setDatasets(list);
      // Auto select the first dataset if available
      if (list.length > 0 && !selectedDataset) {
        handleSelectDataset(list[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch registered datasets from backend database.");
    } finally {
      if (showLoading) setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    fetchDatasets(true);
  }, []);

  const handleSelectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setMetadata(null);
    setContext(null);
    setLocation(null);
    setProfile(null);
    setLoadingContext(true);
    setLoadingLocation(true);
    setLoadingProfile(true);
    setError(null);

    try {
      // 1. Fetch metadata (essential for dimension / resolution calculation)
      try {
        const meta = await getDatasetMetadata(dataset.dataset_id);
        setMetadata(meta);
      } catch (metaErr: any) {
        // If metadata is 404/not extracted yet
        if (metaErr.message && metaErr.message.includes("404")) {
          setMetadata(null);
        } else {
          console.error("Metadata load error:", metaErr);
        }
      }

      // 2. Fetch Geospatial Context (calls lazy generator on backend)
      const geoContext = await getGeospatialContext(dataset.dataset_id);
      setContext(geoContext);

      // 3. Fetch Location Context (resolves administrative boundaries)
      try {
        const locContext = await getDatasetLocationContext(dataset.dataset_id);
        setLocation(locContext);
      } catch (locErr: any) {
        console.error("Location lock error:", locErr);
        setLocation(null);
      }

      // 4. Fetch Geospatial Context Profile (resolves environment details)
      try {
        const geoProfile = await getGeospatialContextProfile(dataset.dataset_id);
        setProfile(geoProfile);
      } catch (profErr: any) {
        console.error("Context profile error:", profErr);
        setProfile(null);
      }

      setSuccess(`Geospatial lock established on UTM zone EPSG:${geoContext.epsg}`);
      setTimeout(() => setSuccess(null), 4000);

    } catch (geoErr: any) {
      console.error("Geospatial context error:", geoErr);
      setContext(null);
      setError(geoErr.message || "Failed to resolve geospatial intelligence coordinates.");
    } finally {
      setLoadingContext(false);
      setLoadingLocation(false);
      setLoadingProfile(false);
    }
  };

  const handleRefresh = async () => {
    setError(null);
    setSuccess(null);
    await fetchDatasets(true);
    if (selectedDataset) {
      const updated = datasets.find(d => d.dataset_id === selectedDataset.dataset_id);
      if (updated) {
        await handleSelectDataset(updated);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border pb-4 font-mono">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-primary uppercase">
            GEOSPATIAL INTELLIGENCE RADAR
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
            Resolve geographical footprints, map bounds, and projection telemetry for satellite imagery
          </p>
        </div>
        <button
          disabled={loadingDatasets}
          onClick={handleRefresh}
          className="inline-flex items-center space-x-1.5 text-xs text-primary hover:underline uppercase disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingDatasets ? "animate-spin" : ""}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Top Banner Status */}
      {success && (
        <div className="border border-primary/30 bg-primary/5 px-4 py-2.5 text-primary font-mono text-xs flex items-center space-x-2 shadow-[0_0_10px_-5px_rgba(6,182,212,0.3)]">
          <Compass className="w-4 h-4 animate-spin-slow" />
          <span className="font-bold uppercase tracking-wider">{success}</span>
        </div>
      )}

      {error && !loadingContext && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-destructive font-mono text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-bold uppercase tracking-wider">{error}</span>
        </div>
      )}

      {/* Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Dataset Registry List Selection Panel */}
        <div className="lg:col-span-1 border border-border bg-card/25 p-4 space-y-4 relative overflow-hidden font-mono">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            REGISTRY // NODE
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Database className="w-4 h-4 text-primary" />
            Select Node Lock
          </h2>
          <p className="text-[10px] text-muted-foreground leading-normal">
            Select a dataset from the registered database to project bounds onto the visual surface.
          </p>

          {loadingDatasets ? (
            <div className="flex items-center justify-center space-x-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>SCANNING REGISTRY...</span>
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-[10px] text-amber-500 border border-amber-500/20 bg-amber-500/5 p-3 rounded-sm text-center uppercase">
              No datasets registered. Register a dataset in the Data Inventory first.
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
              {datasets.map((ds) => {
                const isSelected = selectedDataset?.dataset_id === ds.dataset_id;
                return (
                  <button
                    key={ds.dataset_id}
                    onClick={() => handleSelectDataset(ds)}
                    className={`w-full text-left p-2.5 border transition-all flex flex-col space-y-1 text-xs group ${
                      isSelected
                        ? "bg-primary/15 border-primary text-primary font-bold shadow-[0_0_8px_-2px_rgba(6,182,212,0.3)]"
                        : "border-border/60 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <span className="truncate uppercase font-bold text-foreground/90">{ds.dataset_name}</span>
                    </div>
                    <span className="text-[8px] opacity-75 truncate pl-5 select-all">{ds.dataset_id.substring(0, 8)}...</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Map Visualization Viewport */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-[550px] relative">
            <GeospatialMap
              context={context}
              loading={loadingContext}
              error={error}
            />
          </div>

          {/* Location Intelligence Panel */}
          <LocationIntelligencePanel 
            location={location} 
            loading={loadingLocation} 
          />

          {/* Corner coordinates helper display */}
          <DatasetBoundsLayer context={context} />
        </div>

        {/* HUD Telemetry Info Panel */}
        <div className="lg:col-span-1">
          <DatasetInfoPanel
            dataset={selectedDataset}
            metadata={metadata}
            context={context}
            loading={loadingContext}
          />
        </div>

      </div>

      {/* Full width Geospatial Context Intelligence Panel */}
      {selectedDataset && (
        <div className="border-t border-border/60 pt-6 space-y-4">
          <div className="font-mono text-xs font-bold text-primary uppercase tracking-widest">
            // GEOSPATIAL CONTEXT ENVIRONMENTAL INTELLIGENCE
          </div>
          <GeospatialContextPanel 
            profile={profile} 
            loading={loadingProfile} 
          />
        </div>
      )}
    </div>
  );
}
