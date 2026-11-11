import apiClient from './api';
import { CorrelatedEvent, EventFilters, CorrelationStats, StatusHistoryEntry } from '../types/event';
import { Alarm } from '../types/alarm';

export interface EventsListApiResponse {
  success: boolean;
  data: CorrelatedEvent[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RelatedAlarmsResponse {
  eventId: string;
  siteId: string;
  deviceId: string;
  severity: string;
  status: string;
  correlationRule?: string;
  firstOccurredAt: string;
  lastOccurredAt: string;
  alarmCount: number;
  alarms: Alarm[];
  notes?: string;
  statusHistory?: StatusHistoryEntry[];
}

export const eventService = {
  async getEvents(filters: EventFilters = {}): Promise<{ events: CorrelatedEvent[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.siteId) params.append('siteId', filters.siteId);
    if (filters.deviceId) params.append('deviceId', filters.deviceId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await apiClient.get<EventsListApiResponse>(`/events?${params.toString()}`);
    return {
      events: response.data.data,
      total: response.data.meta?.total || response.data.data.length,
      totalPages: response.data.meta?.totalPages || 1
    };
  },

  async getEventById(id: string): Promise<CorrelatedEvent> {
    const response = await apiClient.get<{ success: boolean; data: CorrelatedEvent }>(`/events/${id}`);
    return response.data.data;
  },

  async getEventAlarms(id: string): Promise<RelatedAlarmsResponse> {
    const response = await apiClient.get<{ success: boolean; data: RelatedAlarmsResponse }>(`/events/${id}/alarms`);
    return response.data.data;
  },

  async acknowledgeEvent(id: string, notes?: string): Promise<CorrelatedEvent> {
    const response = await apiClient.post<{ success: boolean; data: CorrelatedEvent }>(
      `/events/${id}/acknowledge`,
      { notes: notes || '' }
    );
    return response.data.data;
  },

  async resolveEvent(id: string, notes?: string): Promise<CorrelatedEvent> {
    const response = await apiClient.post<{ success: boolean; data: CorrelatedEvent }>(
      `/events/${id}/resolve`,
      { notes: notes || '' }
    );
    return response.data.data;
  },

  async reopenEvent(id: string, notes?: string): Promise<CorrelatedEvent> {
    const response = await apiClient.post<{ success: boolean; data: CorrelatedEvent }>(
      `/events/${id}/reopen`,
      { notes: notes || '' }
    );
    return response.data.data;
  },

  async getCorrelationStats(): Promise<CorrelationStats> {
    const response = await apiClient.get<{ success: boolean; data: CorrelationStats }>('/correlation/stats');
    return response.data.data;
  }
};

export default eventService;

