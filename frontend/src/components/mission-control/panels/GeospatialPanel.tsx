import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DatasetMetadata } from "@/lib/types/dataset-metadata";
import { GeospatialContext } from "@/lib/types/geospatial";
import { LocationContext } from "@/lib/types/location";
import { IntelligenceLayerStatus } from "@/lib/types/mission-control";
import { Globe, MapPin, Layers, Crosshair, AlertTriangle, ArrowRight } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface GeospatialPanelProps {
  datasetId: string;
  metadata: DatasetMetadata | null;
  geospatial: GeospatialContext | null;
  location: LocationContext | null;
  status: {
    geospatial: IntelligenceLayerStatus;
    location: IntelligenceLayerStatus;
  };
}

export default function GeospatialPanel({ datasetId, metadata, geospatial, location, status }: GeospatialPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            "carto-dark": {
              type: "raster",
              tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
              tileSize: 256,
              attribution: "&copy; OpenStreetMap &copy; CartoDB"
            }
          },
          layers: [
            {
              id: "carto-dark-layer",
              type: "raster",
              source: "carto-dark",
              minzoom: 0,
              maxzoom: 20
            }
          ]
        },
        center: [78.9629, 20.5937], // India center
        zoom: 3,
        attributionControl: false,
        interactive: false
      });

      map.on("load", () => {
        setMapLoaded(true);
      });

      mapRef.current = map;
    } catch (err) {
      console.error("Failed to initialize MapLibre GL:", err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !geospatial) return;

    const sourceId = "footprint-source";
    const layerId = "footprint-line";
    const fillLayerId = "footprint-fill";

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    if (geospatial.footprint && geospatial.footprint.length > 0) {
      const coordinates = geospatial.footprint.map(pt => [pt[1], pt[0]]);
      if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
        coordinates.push(coordinates[0]);
      }

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [coordinates]
          }
        }
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.15
        }
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#06b6d4",
          "line-width": 1.5,
          "line-dasharray": [2, 2]
        }
      });

      map.flyTo({
        center: [geospatial.center.lon, geospatial.center.lat],
        zoom: 7,
        essential: true,
        duration: 1500
      });
    }
  }, [geospatial, mapLoaded]);

  const hasGeo = status.geospatial === "available" && geospatial;
  const hasLoc = status.location === "available" && location;

  return (
    <div className="border border-border bg-card/20 p-4 font-mono space-y-4 relative overflow-hidden rounded-sm hover:border-primary/40 transition-colors flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
        INTEL // GEOSPATIAL
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
          <Globe className="w-4 h-4 text-primary" />
          Geospatial Coordinate Matrix
        </h2>

        {/* Interactive Telemetry Map Box */}
        <div className="relative border border-border bg-black/40 h-[140px] rounded-sm overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full" />
          {hasGeo && (
            <div className="absolute bottom-2 left-2 bg-black/85 border border-primary/20 p-1.5 text-[7.5px] text-primary space-y-0.5 rounded-sm">
              <div>CENTROID LAT: {geospatial.center.lat.toFixed(5)}</div>
              <div>CENTROID LON: {geospatial.center.lon.toFixed(5)}</div>
            </div>
          )}
        </div>

        {hasGeo ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-background/20 p-2 border border-border/30">
                <span className="text-[7.5px] text-muted-foreground block flex items-center gap-1">
                  <Layers className="w-3 h-3 text-primary/70" />
                  CRS PROJECTION
                </span>
                <span className="font-bold text-slate-200 uppercase truncate block">
                  {metadata?.coordinate_system || geospatial.crs || "UTM Projection"}
                </span>
              </div>
              <div className="bg-background/20 p-2 border border-border/30">
                <span className="text-[7.5px] text-muted-foreground block flex items-center gap-1">
                  <Layers className="w-3 h-3 text-primary/70" />
                  EPSG CODE
                </span>
                <span className="font-bold text-slate-200">
                  {metadata?.epsg_code ? `EPSG:${metadata.epsg_code}` : geospatial.epsg ? `EPSG:${geospatial.epsg}` : "EPSG:32643"}
                </span>
              </div>
            </div>

            {hasLoc ? (
              <div className="bg-background/30 p-2.5 border border-border/40 space-y-1.5 text-[9px]">
                <div className="text-[8px] text-primary font-bold tracking-widest uppercase flex items-center gap-1 border-b border-border/20 pb-1 mb-1">
                  <MapPin className="w-3 h-3" />
                  Administrative Lock Boundaries
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>COUNTRY:</span>
                  <span className="font-semibold text-slate-200">{location.country || "INDIA"}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>PROVINCE / STATE:</span>
                  <span className="font-semibold text-slate-200">{location.state || "UTTAR PRADESH"}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>DISTRICT / REGION:</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[130px]">
                    {location.district || "MATHURA"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-background/25 border border-border/35 p-2.5 text-center text-[9px] text-amber-500 font-bold uppercase">
                Location Geocoding Context Pending
              </div>
            )}

            {geospatial.bounds && (
              <div className="bg-background/20 p-2 border border-border/30 text-[8.5px] text-slate-400 space-y-0.5">
                <span className="text-[7.5px] text-muted-foreground uppercase tracking-widest block font-bold">Bounding box limits</span>
                <div className="flex justify-between">
                  <span>LATITUDE BOUNDS:</span>
                  <span className="font-mono text-slate-300">
                    {geospatial.bounds.south.toFixed(4)}°N to {geospatial.bounds.north.toFixed(4)}°N
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>LONGITUDE BOUNDS:</span>
                  <span className="font-mono text-slate-300">
                    {geospatial.bounds.west.toFixed(4)}°E to {geospatial.bounds.east.toFixed(4)}°E
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto animate-pulse" />
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Geospatial Limits Pending</div>
            <p className="text-[9px] text-muted-foreground leading-normal">
              No coordinates computed. Launch geospatial boundaries resolver on the registry subpage.
            </p>
          </div>
        )}
      </div>

      <Link href={`/mission-control/geospatial?dataset=${datasetId}`} className="inline-flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase transition-all mt-4">
        Open Geospatial Console
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
