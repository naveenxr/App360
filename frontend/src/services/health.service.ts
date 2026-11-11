import apiClient from './api';
import { HealthResponse } from '../types/health';

export const checkBackendHealth = async (): Promise<HealthResponse> => {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
};
