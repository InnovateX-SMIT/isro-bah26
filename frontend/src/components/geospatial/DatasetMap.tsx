"use client"

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, Globe, Maximize2, Minimize2 } from "lucide-react";

interface DatasetMapProps {
  centerLat?: number;
  centerLon?: number;
  footprintCoords?: number[][]; // [[lon, lat], ...]
  bbox?: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
  };
  crs?: string;
  epsg?: number;
  loading?: boolean;
  error?: string | null;
}

export default function DatasetMap({
  centerLat,
  centerLon,
  footprintCoords,
  bbox,
  crs,
  epsg,
  loading = false,
  error = null
}: DatasetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Map
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
              tiles: [
                "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              ],
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
        center: [78.9629, 20.5937], // Center of India
        zoom: 4.5,
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      
      map.on("load", () => {
        setMapLoaded(true);
      });

      mapRef.current = map;
    } catch (err) {
      console.error("Failed to initialize MapLibre map:", err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map features when coordinates or bounds change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // 1. Clear previous marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // 2. Clear previous footprint layers
    const sourceId = "dataset-footprint";
    const fillLayerId = "footprint-fill";
    const strokeLayerId = "footprint-stroke";

    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    const hasCenter = centerLat !== undefined && centerLon !== undefined;
    const hasFootprint = footprintCoords && footprintCoords.length > 0;
    const hasBbox = bbox !== undefined;

    if (!hasCenter || !hasFootprint || !hasBbox) {
      // Reset view to national scale if dataset deselected
      map.flyTo({ center: [78.9629, 20.5937], zoom: 4.5 });
      return;
    }

    try {
      // 3. Set Map boundaries
      const bounds: [number, number, number, number] = [
        bbox.min_lon,
        bbox.min_lat,
        bbox.max_lon,
        bbox.max_lat
      ];
      map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 1500 });

      // 4. Render footprint polygon
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [footprintCoords]
          },
          properties: {}
        }
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        layout: {},
        paint: {
          "fill-color": "rgb(6, 182, 212)",
          "fill-opacity": 0.15
        }
      });

      map.addLayer({
        id: strokeLayerId,
        type: "line",
        source: sourceId,
        layout: {},
        paint: {
          "line-color": "rgb(6, 182, 212)",
          "line-width": 2,
          "line-dasharray": [2, 2]
        }
      });

      // 5. Draw center point pulse marker
      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center";
      el.style.width = "24px";
      el.style.height = "24px";

      // Glowing outer ring
      const ring = document.createElement("div");
      ring.className = "absolute w-full h-full rounded-full border-2 border-primary animate-ping opacity-75";
      ring.style.borderColor = "#06b6d4";
      
      // Core center dot
      const dot = document.createElement("div");
      dot.className = "w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_#06b6d4]";
      dot.style.backgroundColor = "#06b6d4";

      el.appendChild(ring);
      el.appendChild(dot);

      // Detail popup
      const popup = new maplibregl.Popup({ 
        offset: 15, 
        closeButton: false,
        className: "custom-telemetry-popup"
      }).setHTML(`
        <div style="font-family: monospace; font-size: 10px; color: #e2e8f0; background: #070a13; border: 1px solid #1e293b; padding: 8px; border-radius: 4px; box-shadow: 0 0 10px rgba(6,182,212,0.3)">
          <div style="font-weight: bold; color: #06b6d4; border-bottom: 1px solid rgba(6,182,212,0.3); padding-bottom: 4px; margin-bottom: 4px; text-transform: uppercase;">Node Lock Center</div>
          <div>CRS: ${crs || "N/A"}</div>
          <div>EPSG: ${epsg || "N/A"}</div>
          <div>LAT: ${centerLat?.toFixed(6)}</div>
          <div>LON: ${centerLon?.toFixed(6)}</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([centerLon!, centerLat!])
        .setPopup(popup)
        .addTo(map);

      // Auto open popup after flight completion
      const popupTimeoutId = setTimeout(() => {
        if (mapRef.current && marker) {
          marker.togglePopup();
        }
      }, 1600);

      markerRef.current = marker;

      return () => clearTimeout(popupTimeoutId);
    } catch (err) {
      console.error("Error applying geospatial footprint layers:", err);
    }
  }, [centerLat, centerLon, footprintCoords, bbox, crs, epsg, mapLoaded]);

  // Toggle fullscreen capability
  const toggleFullscreen = () => {
    const mapContainer = mapContainerRef.current?.parentElement;
    if (!mapContainer) return;

    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => mapRef.current?.resize(), 200);
      }).catch((err) => {
        console.error(`Fullscreen failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => mapRef.current?.resize(), 200);
      });
    }
  };

  // Sync fullscreen change by ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapRef.current?.resize(), 200);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div className="relative w-full h-full border border-border bg-card/25 overflow-hidden">
      {/* HUD Telemetry Overlay */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        <button
          onClick={toggleFullscreen}
          className="p-2 border border-border bg-card/80 text-muted-foreground hover:text-primary transition-all duration-200"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Radar Map"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Grid Scanline Overlay for Sci-Fi Aesthetics */}
      <div className="absolute inset-0 pointer-events-none border border-primary/10 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] z-5" />

      {/* Map Mounting Target */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "320px" }} />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20 space-y-3 font-mono">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs uppercase text-muted-foreground tracking-widest animate-pulse-slow">Locking Telemetry Coordinates...</span>
        </div>
      )}

      {/* Error / Offline State */}
      {error && (
        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4 font-mono">
          <Globe className="w-12 h-12 text-destructive animate-pulse-slow" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-destructive uppercase tracking-widest">Geospatial Sync Failed</h4>
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Bottom Telemetry HUD */}
      {centerLat !== undefined && centerLon !== undefined && (
        <div className="absolute bottom-4 left-4 z-10 bg-card/90 border border-border/80 px-3 py-2 font-mono text-[9px] text-muted-foreground space-y-1 backdrop-blur-sm pointer-events-none">
          <div><span className="text-primary font-bold">RADAR LOCK:</span> ACTIVE</div>
          <div><span className="text-slate-300">LAT:</span> {centerLat.toFixed(6)} N</div>
          <div><span className="text-slate-300">LON:</span> {centerLon.toFixed(6)} E</div>
        </div>
      )}
    </div>
  );
}
