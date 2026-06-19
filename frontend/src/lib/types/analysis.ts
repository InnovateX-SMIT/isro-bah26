export type AnalysisStatus = "created" | "active" | "completed" | "failed";

export interface AnalysisSession {
  session_id: string;
  status: AnalysisStatus;
  created_at: string;
  updated_at: string;
}

export type SessionResponse = AnalysisSession;
export type SessionCreateResponse = AnalysisSession;
