import React from "react"
import Link from "next/link"
import { ChevronRight, Database, Eye } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface ViewerBreadcrumbProps {
  datasetName: string
  datasetId: string
  items: BreadcrumbItem[]
}

export default function ViewerBreadcrumb({ datasetName, datasetId, items }: ViewerBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-[10px] font-mono text-muted-foreground uppercase py-2">
      <Link
        href="/datasets"
        className="hover:text-primary transition-colors flex items-center gap-1.5"
      >
        <Database className="w-3.5 h-3.5" />
        <span>Inventory</span>
      </Link>
      <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
      
      <span className="text-slate-400 font-bold select-all truncate max-w-[120px] md:max-w-[200px]" title={datasetName}>
        {datasetName}
      </span>
      <ChevronRight className="w-3 h-3 text-muted-foreground/50" />

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        if (isLast || !item.href) {
          return (
            <span key={idx} className="text-primary font-bold flex items-center gap-1">
              {idx === 0 && <Eye className="w-3.5 h-3.5 text-primary" />}
              <span>{item.label}</span>
            </span>
          )
        }
        return (
          <React.Fragment key={idx}>
            <Link href={item.href} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          </React.Fragment>
        )
      })}
    </nav>
  )
}
