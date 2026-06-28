"use client"

import React, { useEffect, useState } from "react";
import { Dataset } from "@/lib/types/dataset";
import { getRegisteredDatasets } from "@/lib/dataset-api";
import { getMissionControlProfile } from "@/lib/mission-control-api";
import ExportPanel from "@/components/mission-control/panels/ExportPanel";
import ReportExportPanel from "@/components/mission-control/panels/ReportExportPanel";
import PackageExportPanel from "@/components/mission-control/panels/PackageExportPanel";
import { Loader2, Database, Download, FileDown, ShieldAlert, X } from "lucide-react";

export default function ExportPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [isSessionCompleted, setIsSessionCompleted] = useState<boolean>(false);
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal open states
  const [activeModal, setActiveModal] = useState<"raster" | "report" | "package" | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    setError(null);
    try {
      const list = await getRegisteredDatasets();
      setDatasets(list);
      if (list.length > 0) {
        setSelectedDataset(list[0]);
        await loadDatasetProfile(list[0].dataset_id);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch registered datasets.");
    } finally {
      setLoadingDatasets(false);
    }
  };

  const loadDatasetProfile = async (datasetId: string) => {
    setLoadingProfile(true);
    try {
      const profile = await getMissionControlProfile(datasetId);
      setSessionId(profile.dataset?.analysis_session_id || "");
      setIsSessionCompleted(profile.status?.reconstruction === "available");
    } catch (err) {
      console.error(err);
      setSessionId("");
      setIsSessionCompleted(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSelectDataset = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dsId = e.target.value;
    const ds = datasets.find(d => d.dataset_id === dsId) || null;
    setSelectedDataset(ds);
    if (ds) {
      await loadDatasetProfile(ds.dataset_id);
    }
  };

  return (
    <div className="space-y-8 font-mono text-slate-100 pb-12 select-none">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-wider text-primary uppercase flex items-center gap-2">
          <Download className="w-5.5 h-5.5 text-primary" />
          GEOSPATIAL EXPORT STATION
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
          Configure and compile raster composites, metadata reports, and consolidated analysis packages for GIS integration.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive font-mono text-xs flex items-center space-x-2.5 rounded-lg">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">EXPORT API FAILURE</span>
            <span className="text-[10px] text-muted-foreground">{error}</span>
          </div>
        </div>
      )}

      {/* Dataset Selection */}
      <div className="border border-border bg-card/25 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label htmlFor="active-node-selector" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-4 h-4 text-primary" />
            SELECT DATASET NODE FOR EXPORT
          </label>
          {loadingDatasets ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Scanning available datasets...</span>
            </div>
          ) : (
            <select
              id="active-node-selector"
              value={selectedDataset?.dataset_id || ""}
              onChange={handleSelectDataset}
              className="bg-black/60 border border-border/80 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary uppercase rounded font-bold tracking-wide mt-1"
            >
              {datasets.map(ds => (
                <option key={ds.dataset_id} value={ds.dataset_id}>
                  {ds.dataset_name} ({ds.dataset_type})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedDataset && (
          <div className="text-[9.5px] text-muted-foreground/80 flex flex-col space-y-0.5 md:text-right uppercase">
            <span>SESSION: {sessionId ? sessionId.substring(0, 16) + "..." : "NONE"}</span>
            <span>PIPELINE READINESS: {loadingProfile ? "CHECKING..." : isSessionCompleted ? "COMPLETED" : "INCOMPLETE / PENDING"}</span>
          </div>
        )}
      </div>

      {/* Primary Export Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Module 1: Raster Export */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Raster Export
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export reconstructed composites, cloud masks, or confidence maps in GeoTIFF, PNG, or JPG formats.
            </p>
          </div>
          <button
            onClick={() => setActiveModal("raster")}
            disabled={!sessionId}
            className="inline-flex items-center justify-center w-full bg-primary text-background hover:bg-primary-hover disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed border border-primary px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Configure Raster Export
          </button>
        </div>

        {/* Module 2: Report Export */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <FileDown className="w-4 h-4 text-primary" />
              Report Export
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compile comprehensive PDF reports containing geospatial metadata, cloud statistics, and quality audit findings.
            </p>
          </div>
          <button
            onClick={() => setActiveModal("report")}
            disabled={!sessionId}
            className="inline-flex items-center justify-center w-full bg-primary text-background hover:bg-primary-hover disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed border border-primary px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Configure Report Export
          </button>
        </div>

        {/* Module 3: Analysis Package Export */}
        <div className="border border-border bg-card/25 p-6 rounded-lg space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors duration-300">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Analysis Package Export
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compile a zipped archive containing all rasters, JSON metadata, PDF reports, and processing logs.
            </p>
          </div>
          <button
            onClick={() => setActiveModal("package")}
            disabled={!sessionId}
            className="inline-flex items-center justify-center w-full bg-primary text-background hover:bg-primary-hover disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed border border-primary px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all rounded-md mt-2"
          >
            Configure Package Export
          </button>
        </div>

      </div>

      {/* Modal Overlay occupying 60% viewport width/height */}
      {activeModal && selectedDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-4xl h-[70vh] flex flex-col rounded-lg overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 font-mono">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                {activeModal === "raster" && "Raster Export Configuration"}
                {activeModal === "report" && "Report Compilation Configuration"}
                {activeModal === "package" && "Analysis Package Compression"}
              </span>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-grow overflow-y-auto p-6">
              {activeModal === "raster" && (
                <ExportPanel
                  sessionId={sessionId}
                  datasetId={selectedDataset.dataset_id}
                  datasetName={selectedDataset.dataset_name}
                  isSessionCompleted={isSessionCompleted}
                />
              )}
              {activeModal === "report" && (
                <ReportExportPanel
                  sessionId={sessionId}
                  datasetId={selectedDataset.dataset_id}
                  datasetName={selectedDataset.dataset_name}
                  isSessionCompleted={isSessionCompleted}
                />
              )}
              {activeModal === "package" && (
                <PackageExportPanel
                  sessionId={sessionId}
                  datasetId={selectedDataset.dataset_id}
                  datasetName={selectedDataset.dataset_name}
                  isSessionCompleted={isSessionCompleted}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end bg-muted/10">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-border/80 hover:border-border bg-transparent text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-wider transition-all rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
