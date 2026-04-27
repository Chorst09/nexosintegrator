import type { RequestScope, SaveAnalysisPayload, SavedAnalysisRecord } from "../types.js";

export interface SavedAnalysisRepository {
  list(scope: RequestScope): Promise<SavedAnalysisRecord[]>;
  getById(id: string, scope: RequestScope): Promise<SavedAnalysisRecord | null>;
  upsert(payload: SaveAnalysisPayload, scope: RequestScope): Promise<SavedAnalysisRecord>;
  remove(id: string, scope: RequestScope): Promise<boolean>;
}
