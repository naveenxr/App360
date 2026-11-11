import apiClient from './api';
import { AuditLogItem } from '../types/rbac';

export interface AuditLogParams {
  action?: string;
  targetType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const auditService = {
  async getAuditLogs(params: AuditLogParams = {}): Promise<AuditLogResponse> {
    const query = new URLSearchParams();
    if (params.action) query.append('action', params.action);
    if (params.targetType) query.append('targetType', params.targetType);
    if (params.search) query.append('search', params.search);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const res = await apiClient.get<{
      success: boolean;
      data: AuditLogItem[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`/audit-logs?${query.toString()}`);

    return {
      logs: res.data.data,
      total: res.data.meta?.total || res.data.data.length,
      page: res.data.meta?.page || 1,
      totalPages: res.data.meta?.totalPages || 1
    };
  }
};

export default auditService;

