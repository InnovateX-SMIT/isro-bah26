import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Compass,
  FileText,
  Layers,
  Image as ImageIcon,
  Activity,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  CloudSun,
  Cpu,
  Sparkles
} from "lucide-react"
import { Dataset } from "@/lib/types/dataset"
import { DatasetMetadata } from "@/lib/types/dataset-metadata"

interface ViewerSidebarProps {
  dataset: Dataset
  metadata: DatasetMetadata | null
  mode: "dataset" | "cloud" | "temporal" | "reconstruction" | "confidence" | "comparison"
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

export default function ViewerSidebar({
  dataset,
  metadata,
  mode,
  isOpen = true,
  setIsOpen
}: ViewerSidebarProps) {
  const pathname = usePathname()
  const datasetId = dataset.dataset_id

  const datasetLinks = [
    { label: "Overview Hub", href: `/datasets/${datasetId}/viewer`, icon: Compass },
    { label: "RGB Composite", href: `/datasets/${datasetId}/viewer/rgb`, icon: ImageIcon },
    { label: "Spectral Bands", href: `/datasets/${datasetId}/viewer/bands`, icon: Layers },
    { label: "Metadata Registry", href: `/datasets/${datasetId}/viewer/metadata`, icon: FileText },
  ]

  const cloudLinks = [
    { label: "Cloud Workspace", href: `/datasets/${datasetId}/cloud`, icon: CloudSun },
    { label: "Detection Map", href: `/datasets/${datasetId}/cloud/detection`, icon: Activity },
    { label: "Classification", href: `/datasets/${datasetId}/cloud/classification`, icon: Layers },
    { label: "Projected Shadows", href: `/datasets/${datasetId}/cloud/shadows`, icon: Shield },
    { label: "Reconstruction Masks", href: `/datasets/${datasetId}/cloud/masks`, icon: Layers },
    { label: "Operational Analytics", href: `/datasets/${datasetId}/cloud/analytics`, icon: FileText },
  ]

  const temporalLinks = [
    { label: "Temporal Overview", href: `/datasets/${datasetId}/temporal`, icon: Clock },
    { label: "Historical Stack", href: `/datasets/${datasetId}/temporal/references`, icon: Layers },
    { label: "Chronological Orbit", href: `/datasets/${datasetId}/temporal/timeline`, icon: Clock },
    { label: "Temporal Metadata", href: `/datasets/${datasetId}/temporal/metadata`, icon: FileText },
  ]

  const reconstructionLinks = [
    { label: "Reconstruct Overview", href: `/datasets/${datasetId}/reconstruction`, icon: Cpu },
    { label: "Baseline Frame", href: `/datasets/${datasetId}/reconstruction/result`, icon: ImageIcon },
    { label: "Optimized Output", href: `/datasets/${datasetId}/reconstruction/optimized`, icon: Sparkles },
    { label: "Quality Scorecard", href: `/datasets/${datasetId}/reconstruction/evaluation`, icon: FileText },
    { label: "Reconstruct Metadata", href: `/datasets/${datasetId}/reconstruction/metadata`, icon: FileText },
  ]

  const confidenceLinks = [
    { label: "Confidence Overview", href: `/datasets/${datasetId}/confidence`, icon: Shield },
    { label: "Confidence Heatmap", href: `/datasets/${datasetId}/confidence/heatmap`, icon: ImageIcon },
    { label: "Confidence Overlay", href: `/datasets/${datasetId}/confidence/overlay`, icon: Layers },
    { label: "Reliability Map", href: `/datasets/${datasetId}/confidence/reliability`, icon: Activity },
    { label: "Confidence Analytics", href: `/datasets/${datasetId}/confidence/analytics`, icon: FileText },
    { label: "Confidence Report", href: `/datasets/${datasetId}/confidence/report`, icon: FileText },
  ]

  const comparisonLinks = [
    { label: "Comparison Hub", href: `/datasets/${datasetId}/comparison`, icon: Compass },
    { label: "Original vs Recon", href: `/datasets/${datasetId}/comparison/original-vs-reconstruction`, icon: ImageIcon },
    { label: "Cloud vs Recon", href: `/datasets/${datasetId}/comparison/cloud-vs-reconstruction`, icon: Activity },
    { label: "Reference vs Recon", href: `/datasets/${datasetId}/comparison/reference-vs-reconstruction`, icon: Clock },
    { label: "Confidence vs Recon", href: `/datasets/${datasetId}/comparison/confidence-vs-reconstruction`, icon: Shield },
    { label: "Analysis Workspace", href: `/datasets/${datasetId}/comparison/workspace`, icon: Sparkles },
  ]

  let links = datasetLinks
  if (mode === "cloud") links = cloudLinks
  else if (mode === "temporal") links = temporalLinks
  else if (mode === "reconstruction") links = reconstructionLinks
  else if (mode === "confidence") links = confidenceLinks
  else if (mode === "comparison") links = comparisonLinks

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen?.(true)}
        className="fixed bottom-6 right-6 p-3 bg-primary text-primary-foreground border border-primary/20 rounded-full shadow-[0_0_15px_-3px_rgba(6,182,212,0.5)] z-40 hover:bg-primary/95 transition-all"
        title="Open Workspace Sidebar"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="w-80 border-l border-border bg-card/20 flex flex-col shrink-0 font-mono text-[11px] overflow-y-auto">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <span className="text-[10px] text-primary font-bold tracking-widest uppercase">
          {mode === "dataset" && "DATASET VIEWER SIDEBAR"}
          {mode === "cloud" && "CLOUD INTEL SIDEBAR"}
          {mode === "temporal" && "TEMPORAL SIDEBAR"}
          {mode === "reconstruction" && "RECONSTRUCTION SIDEBAR"}
          {mode === "confidence" && "CONFIDENCE SIDEBAR"}
          {mode === "comparison" && "COMPARISON SIDEBAR"}
        </span>
        {setIsOpen && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border transition-all rounded-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Toggle Switch */}
      <div className="p-4 border-b border-border/40 grid grid-cols-2 gap-2 text-center text-[9px] uppercase font-bold tracking-wider">
        <Link
          href={`/datasets/${datasetId}/viewer`}
          className={`py-1.5 border rounded-sm transition-all ${
            mode === "dataset"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/20"
          }`}
        >
          Scene Info
        </Link>
        <Link
          href={`/datasets/${datasetId}/cloud`}
          className={`py-1.5 border rounded-sm transition-all ${
            mode === "cloud"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/20"
          }`}
        >
          Cloud Intel
        </Link>
        <Link
          href={`/datasets/${datasetId}/temporal`}
          className={`py-1.5 border rounded-sm transition-all ${
            mode === "temporal"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/20"
          }`}
        >
          Temporal
        </Link>
        <Link
          href={`/datasets/${datasetId}/reconstruction`}
          className={`py-1.5 border rounded-sm transition-all ${
            mode === "reconstruction"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/20"
          }`}
        >
          Reconstruct
        </Link>
        <Link
          href={`/datasets/${datasetId}/confidence`}
          className={`py-1.5 border rounded-sm transition-all ${
            mode === "confidence"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/20"
          }`}
        >
          Confidence
        </Link>
        <Link
          href={`/datasets/${datasetId}/comparison`}
          className={`py-1.5 border rounded-sm transition-all ${
            mode === "comparison"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/20"
          }`}
        >
          Comparison
        </Link>
      </div>

      {/* Internal Navigation links */}
      <div className="p-4 border-b border-border/40 space-y-1">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-2">
          Subpages Navigation
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-2.5 px-3 py-2 border transition-all rounded-sm ${
                isActive
                  ? "bg-primary/10 border-primary text-primary font-bold shadow-[0_0_8px_-2px_rgba(6,182,212,0.25)]"
                  : "border-transparent text-muted-foreground hover:bg-muted/10 hover:text-slate-100"
              }`}
            >
              <link.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="uppercase tracking-wide text-[10px]">{link.label}</span>
            </Link>
          )}
        )}
      </div>

      {/* Scene Metadata Stats */}
      <div className="p-4 flex-1 space-y-4">
        <div className="space-y-2">
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            Telemetry Metadata
          </div>
          <div className="bg-background/30 border border-border/40 p-3 rounded-sm space-y-2 text-[10px]">
            <div>
              <span className="text-muted-foreground block">DATASET NAME:</span>
              <span className="text-foreground uppercase truncate font-bold block" title={dataset.dataset_name}>
                {dataset.dataset_name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">RESOLUTION:</span>
              <span className="text-foreground font-semibold">
                {metadata && metadata.pixel_size_x !== null && metadata.pixel_size_y !== null
                  ? `${Math.abs(metadata.pixel_size_x).toFixed(2)}m x ${Math.abs(metadata.pixel_size_y).toFixed(2)}m`
                  : "NOT INGESTED"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">EPSG PROJECTION:</span>
              <span className="text-cyan-400 font-bold">
                {metadata?.epsg_code ? `EPSG:${metadata.epsg_code}` : "UNKNOWN"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">RASTER DIMENSIONS:</span>
              <span className="text-foreground">
                {metadata?.raster_width && metadata?.raster_height
                  ? `${metadata.raster_width} x ${metadata.raster_height} px`
                  : "UNKNOWN"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">ACQUISITION TIME:</span>
              <span className="text-pink-400 font-bold">
                {metadata?.acquisition_date || "UNKNOWN"}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Context alerts */}
        <div className="space-y-2">
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            Operational Level
          </div>
          <div className="border border-border/60 bg-muted/10 p-2.5 text-center text-slate-300">
            <span className="text-muted-foreground block text-[9px] uppercase">STATUS FEED</span>
            <span className="text-emerald-400 font-bold tracking-widest block uppercase text-[10px] mt-0.5">
              {dataset.dataset_status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
