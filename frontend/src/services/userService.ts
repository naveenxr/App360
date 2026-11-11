import apiClient from './api';
import { ManagedUser } from '../types/rbac';

export interface UserListParams {
  search?: string;
  roleId?: string;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: ManagedUser[];
  total: number;
  page: number;
  totalPages: number;
}

export const userService = {
  async getUsers(params: UserListParams = {}): Promise<UserListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.roleId) query.append('roleId', params.roleId);
    if (typeof params.isActive !== 'undefined' && params.isActive !== '') {
      query.append('isActive', String(params.isActive));
    }
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const res = await apiClient.get<{
      success: boolean;
      data: ManagedUser[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`/users?${query.toString()}`);

    return {
      users: res.data.data,
      total: res.data.meta?.total || res.data.data.length,
      page: res.data.meta?.page || 1,
      totalPages: res.data.meta?.totalPages || 1
    };
  },

  async getUserById(id: string): Promise<ManagedUser> {
    const res = await apiClient.get<{ success: boolean; data: ManagedUser }>(`/users/${id}`);
    return res.data.data;
  },

  async createUser(payload: {
    name: string;
    email: string;
    password: string;
    roleId: string;
  }): Promise<ManagedUser> {
    const res = await apiClient.post<{ success: boolean; data: ManagedUser }>('/users', payload);
    return res.data.data;
  },

  async updateUser(
    id: string,
    payload: {
      name?: string;
      email?: string;
      roleId?: string;
      password?: string;
    }
  ): Promise<ManagedUser> {
    const res = await apiClient.put<{ success: boolean; data: ManagedUser }>(`/users/${id}`, payload);
    return res.data.data;
  },

  async updateUserStatus(id: string, isActive: boolean): Promise<ManagedUser> {
    const res = await apiClient.patch<{ success: boolean; data: ManagedUser }>(
      `/users/${id}/status`,
      { isActive }
    );
    return res.data.data;
  }
};

export default userService;

