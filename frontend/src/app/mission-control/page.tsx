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
import MissionControlSkeleton from "@/components/mission-control/MissionControlSkeleton";
import { Loader2, Globe, Database, HelpCircle, AlertCircle, X } from "lucide-react";

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

  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

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
        onRefresh={handleSyncTelemetry}
        isLoading={loadingProfile || loadingWorkflow}
      />

      {/* 2. Active Satellite Image Registry Feed & Selector Trigger */}
      <div className="border border-border bg-card/25 p-5 font-mono flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg">
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-4 h-4 text-primary" />
            ACTIVE SATELLITE IMAGE REGISTRY FEED
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-black text-foreground uppercase">
              {selectedDataset ? selectedDataset.dataset_name : "NO ACTIVE DATASET LOCKED"}
            </span>
            {selectedDataset && (
              <>
                <span className="text-muted-foreground/45">|</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px] select-all">
                  {selectedDataset.dataset_id}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsPopupOpen(true)}
          className="px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/80 text-primary transition-all text-xs font-bold uppercase tracking-wider rounded-md"
        >
          Select Active Node
        </button>
      </div>

      {/* 2.5. Centered Dataset Selection Modal Popup */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-3xl h-[60vh] flex flex-col rounded-lg overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 font-mono">
              <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Select Satellite Dataset Node
              </span>
              <button 
                onClick={() => setIsPopupOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-grow font-mono space-y-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-relaxed">
                Choose a registered LISS-IV scene context profile to mount to the Geospatial Mission Control workspace.
              </p>
              
              {loadingDatasets ? (
                <div className="flex items-center space-x-2 py-8 text-xs text-muted-foreground justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Scanning registered image nodes...</span>
                </div>
              ) : datasets.length === 0 ? (
                <div className="border border-amber-500/20 bg-amber-500/5 p-8 text-center rounded-lg">
                  <HelpCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-pulse" />
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">No Node Registers Found</h4>
                  <p className="text-[10px] text-muted-foreground max-w-sm mx-auto mt-2 leading-normal">
                    Register a demo or custom LISS-IV scene in the Data Inventory panel to mount the workspace console.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {datasets.map((ds) => {
                    const isSelected = selectedDataset?.dataset_id === ds.dataset_id;
                    return (
                      <button
                        key={ds.dataset_id}
                        onClick={() => {
                          handleSelectDataset(ds);
                          setIsPopupOpen(false);
                        }}
                        className={`p-4 border font-mono text-[11px] tracking-wide text-left transition-all duration-300 rounded-lg flex flex-col justify-between gap-2 ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-[0_0_8px_-2px_rgba(6,182,212,0.3)]"
                            : "border-border/60 hover:border-primary/50 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="uppercase text-foreground text-xs font-black truncate">{ds.dataset_name}</span>
                          <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary animate-pulse" : "bg-muted-foreground/35"}`} />
                        </div>
                        <div className="text-[9px] text-muted-foreground/80 flex flex-col space-y-0.5 font-normal uppercase">
                          <span>ID: {ds.dataset_id.substring(0, 12)}...</span>
                          <span>TYPE: {ds.dataset_type}</span>
                          <span>STATUS: {ds.dataset_status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end bg-muted/10">
              <button 
                onClick={() => setIsPopupOpen(false)}
                className="px-4 py-2 border border-border/80 hover:border-border bg-transparent text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-wider transition-all rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Diagnostic general errors display */}
      {error && !loadingProfile && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive font-mono text-xs flex items-center space-x-2.5 rounded-lg">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">MISSION CONTROL LINK FAILURE</span>
            <span className="text-[10px] text-muted-foreground">{error}</span>
          </div>
        </div>
      )}

      {/* 4. Dashboard loading overlay */}
      {loadingProfile || loadingWorkflow ? (
        <MissionControlSkeleton />
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
          <div className="border border-border bg-card/15 min-h-[450px] flex flex-col items-center justify-center font-mono rounded-lg">
            <Globe className="w-12 h-12 text-muted-foreground/35 animate-spin-slow mb-3" />
            <span className="text-xs uppercase text-muted-foreground tracking-widest">Awaiting Orbital Node Selection...</span>
          </div>
        )
      )}
    </div>
  );
}
