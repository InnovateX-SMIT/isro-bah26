"use client";

import React, { useEffect, useState } from "react";
import { getOverviewAnalytics } from "@/lib/analytics-api";
import { AnalyticsOverviewResponse, TrendItem } from "@/lib/types/analytics";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Database,
  Cpu,
  Cloud,
  Layers,
  Activity,
  HardDrive,
  Calendar
} from "lucide-react";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const [trendType, setTrendType] = useState<"volume" | "completion" | "cloud" | "confidence">("volume");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOverviewAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load dashboard metrics:", err);
      setError(err.message || "Failed to retrieve database analytics overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-6 space-y-4 font-mono">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div className="space-y-1 text-center">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest animate-pulse">
            Compiling Mission Analytics...
          </h4>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            Executing SQL aggregations and analyzing historical sessions
          </p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 px-4 py-4 text-destructive font-mono text-xs space-y-3">
        <div className="flex items-center space-x-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">ANALYTICS ENGINE FAILURE</span>
            <span className="text-[10px] text-muted-foreground">{error || "Failed to load details"}</span>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-3 py-1 bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 text-destructive font-bold text-[9px] tracking-wider uppercase transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { executive, datasets, workflow, cloud, reconstruction, confidence, temporal, system_health, trends } = analytics;

  // Format bytes helper
  const formatGB = (bytes: number) => {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // SVG Line Chart Drawer Helper
  const getTrendData = (): TrendItem[] => {
    switch (trendType) {
      case "completion":
        return trends.daily_completion;
      case "cloud":
        return trends.daily_cloud;
      case "confidence":
        return trends.daily_confidence;
      case "volume":
      default:
        return trends.daily_volume;
    }
  };

  const trendData = getTrendData();

  // Draw SVG Path points
  const drawLinePath = (data: TrendItem[], width: number, height: number) => {
    if (data.length === 0) return "";
    const maxX = data.length - 1;
    const maxY = Math.max(...data.map(d => d.count), 1);
    
    return data.map((d, i) => {
      const x = maxX > 0 ? (i / maxX) * width : 0;
      const y = height - (d.count / maxY) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  };

  const drawAreaPath = (data: TrendItem[], width: number, height: number) => {
    if (data.length === 0) return "";
    const linePath = drawLinePath(data, width, height);
    const maxX = data.length - 1;
    const endX = maxX > 0 ? width : 0;
    return `${linePath} L ${endX} ${height} L 0 ${height} Z`;
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-wider text-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            OPERATIONAL INTELLIGENCE ANALYTICS
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Performance scorecards, workflow execution speeds, and database telemetry trends
          </p>
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded-sm overflow-hidden text-[9px] font-bold">
            {(["7d", "30d", "all"] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 transition-colors uppercase ${timeRange === range ? "bg-primary text-background" : "bg-card/30 text-slate-400 hover:bg-muted/10"}`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-bold text-[9px] tracking-wider uppercase transition-all hover:bg-primary/20"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* 1. Executive overview stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions Run", val: executive.total_sessions, sub: `Active: ${executive.active_sessions} | Fail: ${executive.failed_sessions}`, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Workflow Completion", val: `${executive.workflow_completion_rate}%`, sub: `Processed: ${executive.successful_datasets}`, icon: Cpu, color: "text-primary" },
          { label: "Avg Processing Speed", val: `${executive.avg_processing_time_ms.toFixed(0)} ms`, sub: `Inpainting runs: ${reconstruction.total_runs}`, icon: Activity, color: "text-amber-400" },
          { label: "Cache Efficiency", val: `${(system_health.cache_hit_rate * 100).toFixed(0)}%`, sub: `DB Link: CONNECTED`, icon: Database, color: "text-purple-400" },
        ].map((stat, i) => (
          <div key={i} className="border border-border bg-card/25 p-4 rounded-sm relative overflow-hidden flex flex-col justify-between h-24 hover:border-primary/40 transition-colors">
            <div className="absolute top-0 right-0 bg-primary/5 border-l border-b border-border/20 px-1 text-[7px] text-slate-500 font-bold">
              SYS_METRIC_0{i+1}
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xl font-bold tracking-wider text-slate-100">{stat.val}</div>
              <p className="text-[7.5px] text-muted-foreground uppercase tracking-widest">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Interactive SVG trends charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Panel */}
        <div className="border border-border bg-card/20 p-5 rounded-sm lg:col-span-2 relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            ENGINE // HISTORICAL_TRENDS
          </div>

          <div className="flex justify-between items-center border-b border-border/30 pb-3">
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LineChartIcon className="w-4 h-4 text-primary" />
                Orbital Processing Trends
              </h2>
              <span className="text-[8px] text-muted-foreground uppercase">Dynamic historical telemetry over active timeline</span>
            </div>

            <div className="flex border border-border/60 rounded-sm overflow-hidden text-[7.5px] font-bold">
              {(["volume", "completion", "cloud", "confidence"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTrendType(type)}
                  className={`px-2 py-0.5 transition-colors uppercase ${trendType === type ? "bg-primary text-background" : "bg-transparent text-slate-400 hover:bg-muted/10"}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Trend drawing */}
          <div className="relative h-[160px] bg-black/40 border border-border/35 rounded-sm p-4 flex items-center justify-center">
            {trendData.length > 0 ? (
              <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area Fill */}
                <path d={drawAreaPath(trendData, 500, 150)} fill="url(#gradient-fill)" />
                {/* Line Path */}
                <path d={drawLinePath(trendData, 500, 150)} fill="none" stroke="#06b6d4" strokeWidth="2" />
              </svg>
            ) : (
              <span className="text-[9px] text-muted-foreground uppercase animate-pulse">Gathering pipeline logs...</span>
            )}

            {/* Float Date Markers */}
            {trendData.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[7px] text-slate-500 font-bold select-none">
                <span>START // {trendData[0].date}</span>
                <span>END // {trendData[trendData.length - 1].date}</span>
              </div>
            )}
          </div>
        </div>

        {/* System Storage & Health */}
        <div className="border border-border bg-card/20 p-5 rounded-sm relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-border px-2 py-0.5 text-[8px] text-primary tracking-widest uppercase">
            MONITOR // STORAGE_HEALTH
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/30 pb-3">
              <HardDrive className="w-4 h-4 text-primary" />
              Platform Node Health
            </h2>

            {/* Storage Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] text-slate-400 font-bold">
                <span>DISK SPACE ALLOCATION</span>
                <span>USED: {formatGB(system_health.storage_used_bytes)}</span>
              </div>
              <div className="w-full bg-slate-900 border border-border/30 h-3 rounded-sm overflow-hidden flex">
                <div
                  className="bg-primary h-full"
                  style={{ width: `${(system_health.storage_used_bytes / (system_health.storage_used_bytes + system_health.storage_free_bytes)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[7.5px] text-slate-500">
                <span>TOTAL SPACE AVAILABLE</span>
                <span>FREE: {formatGB(system_health.storage_free_bytes)}</span>
              </div>
            </div>

            {/* Micro Health Indicator light list */}
            <div className="bg-background/45 border border-border/35 p-3 space-y-2 rounded-sm text-[9.5px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">FASTAPI PORT STATE:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">SQLITE STORAGE NODE:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CONNECTED
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">CACHE STATUS ENVELOPE:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  OPTIMIZED
                </span>
              </div>
            </div>
          </div>

          <div className="text-[7.5px] text-slate-500 border-t border-border/20 pt-2 uppercase text-center select-none font-mono">
            HOST // SQLITE_LOCAL_FS_POOL
          </div>
        </div>
      </div>

      {/* 3. Workflow, Dataset & Cloud Analytics Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Stage completion metrics list */}
        <div className="border border-border bg-card/20 p-4 rounded-sm space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1 border-b border-border/30 pb-2">
              <Layers className="w-4 h-4 text-primary" />
              Workflow Node Loadings
            </h3>
            
            <div className="space-y-2 text-[9px] max-h-[220px] overflow-y-auto pr-1">
              {Object.entries(workflow.stage_completion_rates).map(([stage, rate]) => (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>{stage.toUpperCase()}</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="w-full bg-slate-900 border border-border/25 h-1.5 rounded-sm overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cloud & Temporal Metrics */}
        <div className="border border-border bg-card/20 p-4 rounded-sm space-y-4 hover:border-primary/40 transition-colors flex flex-col justify-between">
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1 border-b border-border/30 pb-2">
              <Cloud className="w-4 h-4 text-primary" />
              Cloud & Temporal Overlays
            </h3>

            {/* Cloud stats list */}
            <div className="space-y-2 text-[9.5px]">
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">AVG CLOUD DENSITY:</span>
                <span className="font-bold text-slate-200">{cloud.avg_coverage_percent}%</span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">MEAN CLOUD PROBABILITY:</span>
                <span className="font-bold text-slate-200">{(cloud.avg_probability * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">THICK VS THIN CLOUD RATIO:</span>
                <span className="font-bold text-slate-200">{cloud.thick_vs_thin_ratio}x</span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">SHADOW MASK COVERAGE:</span>
                <span className="font-bold text-slate-200">{cloud.avg_shadow_percent}%</span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">DISCOVERED TEMPORAL REFS:</span>
                <span className="font-bold text-emerald-400">{temporal.avg_references_discovered} references</span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">AVG TEMPORAL DISTANCE:</span>
                <span className="font-bold text-slate-200">{temporal.avg_temporal_distance_days} days offset</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reconstruction & Confidence Metrics */}
        <div className="border border-border bg-card/20 p-4 rounded-sm space-y-4 hover:border-primary/40 transition-colors flex flex-col justify-between">
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1 border-b border-border/30 pb-2">
              <PieChartIcon className="w-4 h-4 text-primary" />
              Reconstruction & Confidence Ratings
            </h3>

            {/* Reconstruction and confidence stats list */}
            <div className="space-y-2 text-[9.5px]">
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">RECONSTRUCTION STRATEGY:</span>
                <span className="font-bold text-slate-200">
                  {Object.keys(reconstruction.strategy_distribution).join(", ") || "cv2.INPAINT_TELEA"}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">MEAN RELIABILITY SCORE:</span>
                <span className="font-bold text-emerald-400">{confidence.mean_confidence_score}%</span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">RELIABILITY TIER RATINGS:</span>
                <span className="font-bold text-slate-200">
                  {Object.entries(confidence.reliability_tier_distribution)
                    .map(([tier, count]) => `${tier}: ${count}`)
                    .join(" | ")}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">UNRESTORED LOW tier REGIONS:</span>
                <span className="font-bold text-slate-200">{confidence.low_confidence_area_percent}%</span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">RECONSTRUCTION RUNS SUCCESS:</span>
                <span className="font-bold text-emerald-400">
                  {reconstruction.successful_runs} / {reconstruction.total_runs} (100%)
                </span>
              </div>
              <div className="flex justify-between border-b border-border/10 pb-1">
                <span className="text-slate-400">BAND REGISTER CONFIGS:</span>
                <span className="font-bold text-slate-200">
                  {Object.entries(datasets.band_distribution)
                    .map(([bands, count]) => `${bands} bands [x${count}]`)
                    .join(", ") || "3 bands"}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
