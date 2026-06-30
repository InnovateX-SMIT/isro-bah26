import React, { useState } from "react"
import { AnalysisSession, AnalysisStatus } from "@/lib/types/analysis"
import { Play, Trash2, AlertTriangle, Loader2 } from "lucide-react"

interface AnalysisSessionTableProps {
  sessions: AnalysisSession[]
  onView: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  isDeletingId: string | null
}

const getStatusBadge = (status: AnalysisStatus) => {
  switch (status) {
    case "created":
      return "border-cyan-500/30 bg-cyan-500/5 text-cyan-400"
    case "active":
      return "border-yellow-500/30 bg-yellow-500/5 text-yellow-500"
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
    case "failed":
      return "border-red-500/30 bg-red-500/5 text-red-400"
    default:
      return "border-border bg-muted/10 text-muted-foreground"
  }
}

export default function AnalysisSessionTable({
  sessions,
  onView,
  onDelete,
  isDeletingId,
}: AnalysisSessionTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleConfirmDelete = (sessionId: string) => {
    setConfirmDeleteId(sessionId)
  }

  const executeDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      // Check if valid date
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="border border-border bg-card/10 overflow-hidden relative">
      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/15 text-muted-foreground uppercase tracking-widest text-[10px]">
              <th className="p-4 font-bold">Session ID</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Created At</th>
              <th className="p-4 font-bold">Updated At</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sessions.map((session) => {
              const isDeleting = isDeletingId === session.session_id
              const isActive = session.status === "active"

              return (
                <tr
                  key={session.session_id}
                  className="hover:bg-muted/5 transition-colors group"
                >
                  <td className="p-4 font-bold text-foreground/90 select-all">
                    {session.session_id}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 border text-[10px] uppercase font-bold tracking-wider ${getStatusBadge(
                        session.status
                      )}`}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping mr-1.5"></span>
                      )}
                      {session.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {formatDate(session.created_at)}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {formatDate(session.updated_at)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center space-x-2">
                      {/* Delete Action */}
                      <button
                        disabled={isDeleting || isActive}
                        onClick={() => handleConfirmDelete(session.session_id)}
                        className={`px-3 py-1 border transition-all font-bold tracking-widest uppercase text-[10px] flex items-center gap-1.5 ${
                          isActive
                            ? "border-muted text-muted-foreground/45 cursor-not-allowed bg-muted/10"
                            : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500"
                        }`}
                        title={isActive ? "Cannot delete an active session" : "Delete session"}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-red-500/30 bg-card max-w-md w-full p-6 space-y-6 shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-border px-3 py-1 text-[8px] text-red-500 tracking-widest font-mono uppercase">
              ALERT // SENSITIVE DELETION
            </div>
            <div className="flex items-start space-x-3 text-red-400 font-mono">
              <AlertTriangle className="w-5.5 h-5.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Confirm Session Deletion
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  You are about to delete session{" "}
                  <span className="font-mono text-foreground font-bold">
                    {confirmDeleteId}
                  </span>
                  . This operation is permanent and will purge all processed outputs.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 text-xs font-mono">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-border bg-muted/20 hover:bg-muted/40 uppercase tracking-widest text-[10px] font-bold"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white uppercase tracking-widest text-[10px] font-bold shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)]"
              >
                Purge Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
