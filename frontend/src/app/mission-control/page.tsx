"use client"

import React, { useEffect, useState } from "react";
import { Dataset } from "@/lib/types/dataset";
import { MissionControlProfile } from "@/lib/types/mission-control";
import { WorkflowResponse } from "@/lib/types/workflow";
import { getRegisteredDatasets } from "@/lib/dataset-api";
import { getMissionControlProfile } from "@/lib/mission-control-api";
import { getWorkflowStatus } from "@/lib/workflow-api";
import MissionControlHeader from "@/components/mission-control/MissionControlHeader";
import MissionControlWorkspace from "@/components/mission-control/MissionControlWorkspace";
import { Loader2, Globe, Database, HelpCircle, AlertCircle } from "lucide-react";

export default function MissionControlPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [profile, setProfile] = useState<MissionControlProfile | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);

  // Loading States
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState<boolean>(false);
  
  // Errors
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Registered Datasets
  const fetchDatasets = async (autoSelectId?: string) => {
    setLoadingDatasets(true);
    setError(null);
    try {
      const list = await getRegisteredDatasets();
      setDatasets(list);
      
      if (list.length > 0) {
        // Auto select specified or first dataset
        const target = autoSelectId 
          ? list.find(d => d.dataset_id === autoSelectId) || list[0]
          : list[0];
        
        setSelectedDataset(target);
        await handleLoadProfile(target.dataset_id);
      } else {
        setSelectedDataset(null);
        setProfile(null);
        setWorkflow(null);
      }
    } catch (err: any) {
      console.error("Failed to load registered datasets:", err);
      setError("Failed to fetch registered datasets from platform database.");
    } finally {
      setLoadingDatasets(false);
    }
  };

  // 2. Fetch Consolidated Mission Control Profile & Workflow
  const handleLoadProfile = async (datasetId: string) => {
    setLoadingProfile(true);
    setLoadingWorkflow(true);
    setError(null);
    try {
      const data = await getMissionControlProfile(datasetId);
      setProfile(data);
      
      if (data.dataset?.analysis_session_id) {
        try {
          const wfData = await getWorkflowStatus(data.dataset.analysis_session_id);
          setWorkflow(wfData);
        } catch (wfErr) {
          console.error("Failed to load workflow state:", wfErr);
        }
      }
    } catch (err: any) {
      console.error("Failed to load Mission Control profile:", err);
      setError(err.message || "Failed to consolidate Mission Control profile.");
    } finally {
      setLoadingProfile(false);
      setLoadingWorkflow(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleSelectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    await handleLoadProfile(dataset.dataset_id);
  };

  const handleSyncTelemetry = async () => {
    if (selectedDataset) {
      await handleLoadProfile(selectedDataset.dataset_id);
    } else {
      await fetchDatasets();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header component */}
      <MissionControlHeader
        datasetName={selectedDataset ? selectedDataset.dataset_name : "NO NODE LOCK"}
        datasetId={selectedDataset ? selectedDataset.dataset_id : "N/A"}
        onRefresh={handleSyncTelemetry}
        isLoading={loadingProfile || loadingWorkflow}
      />

      {/* 2. Top level selection selector row */}
      <div className="border border-border bg-card/25 p-4 font-mono space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
          ORBITAL // ACTIVE NODES
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Database className="w-4 h-4 text-primary" />
          ACTIVE SATELLITE IMAGE NODE REGISTRY FEED
        </div>
        
        {loadingDatasets ? (
          <div className="flex items-center space-x-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Scanning registered image nodes...</span>
          </div>
        ) : datasets.length === 0 ? (
          <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center rounded-sm">
            <HelpCircle className="w-8 h-8 text-amber-500 mx-auto mb-1 animate-pulse" />
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">No Node Registers Found</h4>
            <p className="text-[9px] text-muted-foreground max-w-sm mx-auto mt-1 leading-normal">
              Register a demo or custom LISS-IV scene in the Data Inventory panel to mount the workspace console.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 max-h-[80px] overflow-y-auto pr-1">
            {datasets.map((ds) => {
              const isSelected = selectedDataset?.dataset_id === ds.dataset_id;
              return (
                <button
                  key={ds.dataset_id}
                  onClick={() => handleSelectDataset(ds)}
                  className={`px-3 py-2 border font-mono text-[10px] tracking-wide transition-all duration-300 rounded-sm ${
                    isSelected
                      ? "bg-primary/20 border-primary text-primary font-bold shadow-[0_0_8px_-2px_rgba(6,182,212,0.3)]"
                      : "border-border/60 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary animate-pulse" : "bg-muted-foreground/45"}`} />
                    <span className="uppercase">{ds.dataset_name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Diagnostic general errors display */}
      {error && !loadingProfile && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive font-mono text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">MISSION CONTROL LINK FAILURE</span>
            <span className="text-[10px] text-muted-foreground">{error}</span>
          </div>
        </div>
      )}

      {/* 4. Dashboard loading overlay */}
      {loadingProfile || loadingWorkflow ? (
        <div className="border border-border bg-card/15 min-h-[450px] flex flex-col items-center justify-center p-6 space-y-4 font-mono">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="space-y-1 text-center">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest animate-pulse">Aggregating Satellite Intelligence...</h4>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Compiling metadata and executing lazy GIS resolving layers</p>
          </div>
        </div>
      ) : profile ? (
        /* 5. Operational workspace display */
        <MissionControlWorkspace 
          profile={profile} 
          workflow={workflow}
          loadingWorkflow={loadingWorkflow}
          onRefresh={handleSyncTelemetry} 
        />
      ) : (
        /* Empty viewport fallback */
        !loadingDatasets && datasets.length > 0 && (
          <div className="border border-border bg-card/15 min-h-[450px] flex flex-col items-center justify-center font-mono">
            <Globe className="w-12 h-12 text-muted-foreground/35 animate-spin-slow mb-3" />
            <span className="text-xs uppercase text-muted-foreground tracking-widest">Awaiting Orbital Node Selection...</span>
          </div>
        )
      )}
    </div>
  );
}
