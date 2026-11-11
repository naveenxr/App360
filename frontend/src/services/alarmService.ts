import apiClient from './api';
import { Alarm, AlarmFilters, RawAlarmPayload } from '../types/alarm';

export interface AlarmsListApiResponse {
  success: boolean;
  data: Alarm[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const alarmService = {
  async getAlarms(filters: AlarmFilters = {}): Promise<{ alarms: Alarm[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.siteId) params.append('siteId', filters.siteId);
    if (filters.deviceId) params.append('deviceId', filters.deviceId);
    if (filters.status) params.append('status', filters.status);
    if (filters.sourceId) params.append('sourceId', filters.sourceId);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get<AlarmsListApiResponse>(`/alarms?${params.toString()}`);
    return {
      alarms: response.data.data,
      total: response.data.meta?.total || response.data.data.length,
      totalPages: response.data.meta?.totalPages || 1
    };
  },

  async getAlarmById(id: string): Promise<Alarm> {
    const response = await apiClient.get<{ success: boolean; data: Alarm }>(`/alarms/${id}`);
    return response.data.data;
  },

  async getRawPayload(alarmId: string): Promise<RawAlarmPayload> {
    const response = await apiClient.get<{ success: boolean; data: RawAlarmPayload }>(`/alarms/${alarmId}/raw`);
    return response.data.data;
  },

  async getAlarmStats(): Promise<{
    totalAlarms: number;
    activeAlarms: number;
    acknowledgedAlarms: number;
    clearedAlarms: number;
    severityCounts: Record<string, number>;
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        totalAlarms: number;
        activeAlarms: number;
        acknowledgedAlarms: number;
        clearedAlarms: number;
        severityCounts: Record<string, number>;
      };
    }>('/alarms/stats');
    return response.data.data;
  }
};

export default alarmService;

