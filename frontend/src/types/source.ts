export interface SourceResult {
  sourceId: string;
  status: 'SUCCESS' | 'FAILED';
  fetchedCount: number;
  normalizedCount: number;
  duplicateCount: number;
  error?: string | null;
}

export interface IngestionLog {
  id: string;
  batchId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  triggeredBy: 'SCHEDULER' | 'MANUAL' | 'SYSTEM';
  triggeredByEmail?: string | null;
  totalFetched: number;
  totalNormalized: number;
  totalDuplicates: number;
  totalFailed: number;
  sourceResults: SourceResult[];
  durationMs: number;
  startedAt: string;
  completedAt: string;
}

export interface TriggerIngestionResponse {
  batchId: string;
  status: string;
  totalFetched: number;
  totalNormalized: number;
  totalDuplicates: number;
  totalFailed: number;
  durationMs: number;
  sourceResults: SourceResult[];
}

