export interface HealthResponse {
  success: boolean;
  message: string;
  status: string;
  timestamp: string;
}

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected';
