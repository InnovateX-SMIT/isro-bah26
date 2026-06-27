export interface WorkflowStageDetail {
  name: string;
  status: "pending" | "waiting" | "running" | "completed" | "failed" | "blocked" | string;
  updated_at: string;
  duration_ms: number;
  error_summary: string | null;
  blocked_by: string | null;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  related_apis: string[];
  dependencies: string[];
}

export interface WorkflowTimelineItem {
  stage_name: string;
  event: string;
  timestamp: string;
  duration_ms: number | null;
}

export interface WorkflowLogEntry {
  timestamp: string;
  stage: string;
  event: string;
  status: string;
  severity: "INFO" | "WARNING" | "ERROR" | string;
}

export interface WorkflowResponse {
  session_id: string;
  current_stage: string;
  overall_progress: number;
  total_processing_time_ms: number;
  session_health: "HEALTHY" | "WARNING" | "DEGRADED" | "ERROR" | string;
  stages: WorkflowStageDetail[];
  timeline: WorkflowTimelineItem[];
  logs: WorkflowLogEntry[];
}
