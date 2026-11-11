import apiClient from './api';
import { Site, Device, NodeLiveAlarmsResponse, TopologySummary, TopologyFilters } from '../types/topology';

export interface SiteDetailResponse {
  site: Site;
  devices: Device[];
  activeAlarmCount: number;
  activeAlarms: unknown[];
  activeEvents: unknown[];
}

export const topologyService = {
  async getSites(filters: TopologyFilters = {}): Promise<Site[]> {
    const params = new URLSearchParams();
    if (filters.region) params.append('region', filters.region);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.status) params.append('status', filters.status);

    const response = await apiClient.get<{ success: boolean; data: Site[] }>(`/topology/sites?${params.toString()}`);
    return response.data.data;
  },

  async getSiteById(siteId: string): Promise<SiteDetailResponse> {
    const response = await apiClient.get<{ success: boolean; data: SiteDetailResponse }>(`/topology/sites/${siteId}`);
    return response.data.data;
  },

  async getNodes(filters: TopologyFilters = {}): Promise<Device[]> {
    const params = new URLSearchParams();
    if (filters.siteId) params.append('siteId', filters.siteId);
    if (filters.type) params.append('type', filters.type);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.status) params.append('status', filters.status);

    const response = await apiClient.get<{ success: boolean; data: Device[] }>(`/topology/nodes?${params.toString()}`);
    return response.data.data;
  },

  async getNodeLiveAlarms(deviceId: string): Promise<NodeLiveAlarmsResponse> {
    const response = await apiClient.get<{ success: boolean; data: NodeLiveAlarmsResponse }>(
      `/topology/nodes/${deviceId}/alarms`
    );
    return response.data.data;
  },

  async getTopologySummary(): Promise<TopologySummary> {
    const response = await apiClient.get<{ success: boolean; data: TopologySummary }>('/topology/summary');
    return response.data.data;
  }
};

export default topologyService;
