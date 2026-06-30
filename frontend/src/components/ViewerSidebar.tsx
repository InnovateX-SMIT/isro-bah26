import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Compass,
  FileText,
  Layers,
  Image as ImageIcon,
  Activity,
  Shield,
  Clock,
  CloudSun,
  Cpu,
  Sparkles,
  GitCompare
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

  // Module tabs (Level 1)
  const modules = [
    { key: "dataset" as const, label: "Scene Info", href: `/datasets/${datasetId}/viewer`, icon: Compass },
    { key: "cloud" as const, label: "Cloud Intelligence", href: `/datasets/${datasetId}/cloud`, icon: CloudSun },
    { key: "temporal" as const, label: "Temporal", href: `/datasets/${datasetId}/temporal`, icon: Clock },
    { key: "reconstruction" as const, label: "Reconstruction", href: `/datasets/${datasetId}/reconstruction`, icon: Cpu },
    { key: "confidence" as const, label: "Confidence", href: `/datasets/${datasetId}/confidence`, icon: Shield },
    { key: "comparison" as const, label: "Comparison", href: `/datasets/${datasetId}/comparison`, icon: GitCompare },
  ]

  // Subpage tabs (Level 2) per module
  const subpages: Record<string, { label: string; href: string; icon: any }[]> = {
    dataset: [
      { label: "Overview", href: `/datasets/${datasetId}/viewer`, icon: Compass },
      { label: "RGB Composite", href: `/datasets/${datasetId}/viewer/rgb`, icon: ImageIcon },
      { label: "Spectral Bands", href: `/datasets/${datasetId}/viewer/bands`, icon: Layers },
      { label: "Metadata", href: `/datasets/${datasetId}/viewer/metadata`, icon: FileText },
    ],
    cloud: [
      { label: "Overview", href: `/datasets/${datasetId}/cloud`, icon: CloudSun },
      { label: "Detection", href: `/datasets/${datasetId}/cloud/detection`, icon: Activity },
      { label: "Classification", href: `/datasets/${datasetId}/cloud/classification`, icon: Layers },
      { label: "Shadow Mask", href: `/datasets/${datasetId}/cloud/shadows`, icon: Shield },
      { label: "Cloud Mask", href: `/datasets/${datasetId}/cloud/masks`, icon: Layers },
      { label: "Analytics", href: `/datasets/${datasetId}/cloud/analytics`, icon: FileText },
    ],
    temporal: [
      { label: "Overview", href: `/datasets/${datasetId}/temporal`, icon: Clock },
      { label: "Cloud Comparison", href: `/datasets/${datasetId}/temporal/cloud-comparison`, icon: GitCompare },
      { label: "References", href: `/datasets/${datasetId}/temporal/references`, icon: Layers },
      { label: "Timeline", href: `/datasets/${datasetId}/temporal/timeline`, icon: Clock },
      { label: "Metadata", href: `/datasets/${datasetId}/temporal/metadata`, icon: FileText },
    ],
    reconstruction: [
      { label: "Overview", href: `/datasets/${datasetId}/reconstruction`, icon: Cpu },
      { label: "Baseline", href: `/datasets/${datasetId}/reconstruction/result`, icon: ImageIcon },
      { label: "Optimized", href: `/datasets/${datasetId}/reconstruction/optimized`, icon: Sparkles },
      { label: "Quality", href: `/datasets/${datasetId}/reconstruction/evaluation`, icon: FileText },
      { label: "Metadata", href: `/datasets/${datasetId}/reconstruction/metadata`, icon: FileText },
    ],
    confidence: [
      { label: "Overview", href: `/datasets/${datasetId}/confidence`, icon: Shield },
      { label: "Heatmap", href: `/datasets/${datasetId}/confidence/heatmap`, icon: ImageIcon },
      { label: "Reliability", href: `/datasets/${datasetId}/confidence/reliability`, icon: Activity },
      { label: "Overlay", href: `/datasets/${datasetId}/confidence/overlay`, icon: Layers },
      { label: "Analytics", href: `/datasets/${datasetId}/confidence/analytics`, icon: FileText },
      { label: "Report", href: `/datasets/${datasetId}/confidence/report`, icon: FileText },
    ],
    comparison: [
      { label: "Overview", href: `/datasets/${datasetId}/comparison`, icon: GitCompare },
      { label: "Historical Cloud-Free", href: `/datasets/${datasetId}/comparison/historical-cloud-free`, icon: Clock },
      { label: "Original vs Recon", href: `/datasets/${datasetId}/comparison/original-vs-reconstruction`, icon: ImageIcon },
      { label: "Cloud vs Recon", href: `/datasets/${datasetId}/comparison/cloud-vs-reconstruction`, icon: Activity },
      { label: "Reference vs Recon", href: `/datasets/${datasetId}/comparison/reference-vs-reconstruction`, icon: Clock },
      { label: "Confidence vs Recon", href: `/datasets/${datasetId}/comparison/confidence-vs-reconstruction`, icon: Shield },
      { label: "Workspace", href: `/datasets/${datasetId}/comparison/workspace`, icon: Sparkles },
    ],
  }

  const currentSubpages = subpages[mode] || []

  return (
    <div className="w-full border-b border-border bg-card/15 font-mono shrink-0">
      {/* Level 1: Module Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 overflow-x-auto">
        {modules.map((mod) => {
          const isActive = mod.key === mode
          return (
            <Link
              key={mod.key}
              href={mod.href}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-t-lg border border-b-0 transition-all whitespace-nowrap ${
                isActive
                  ? "bg-background border-border text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
              }`}
            >
              <mod.icon className="w-3.5 h-3.5" />
              {mod.label}
            </Link>
          )
        })}
      </div>

      {/* Level 2: Subpage Tabs */}
      {currentSubpages.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto bg-background/50 border-t border-border/40">
          {currentSubpages.map((sub) => {
            const isActive = pathname === sub.href
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/10 border border-transparent"
                }`}
              >
                <sub.icon className="w-3 h-3" />
                {sub.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
