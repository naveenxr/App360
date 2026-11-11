import apiClient from './api';
import { Role, RolePermissions, PermissionsMatrixData } from '../types/rbac';

export const roleService = {
  async getRoles(): Promise<Role[]> {
    const res = await apiClient.get<{ success: boolean; data: Role[] }>('/roles');
    return res.data.data;
  },

  async getRoleById(id: string): Promise<Role> {
    const res = await apiClient.get<{ success: boolean; data: Role }>(`/roles/${id}`);
    return res.data.data;
  },

  async createRole(payload: {
    name: string;
    description?: string;
    permissions?: RolePermissions;
  }): Promise<Role> {
    const res = await apiClient.post<{ success: boolean; data: Role }>('/roles', payload);
    return res.data.data;
  },

  async updateRole(
    id: string,
    payload: {
      name?: string;
      description?: string;
      permissions?: RolePermissions;
    }
  ): Promise<Role> {
    const res = await apiClient.put<{ success: boolean; data: Role }>(`/roles/${id}`, payload);
    return res.data.data;
  },

  async updateRolePermissions(id: string, permissions: RolePermissions): Promise<Role> {
    const res = await apiClient.put<{ success: boolean; data: Role }>(
      `/roles/${id}/permissions`,
      { permissions }
    );
    return res.data.data;
  },

  async deleteRole(id: string): Promise<{ deleted: boolean; roleName: string }> {
    const res = await apiClient.delete<{ success: boolean; data: { deleted: boolean; roleName: string } }>(
      `/roles/${id}`
    );
    return res.data.data;
  },

  async getPermissionsMatrix(): Promise<PermissionsMatrixData> {
    const res = await apiClient.get<{ success: boolean; data: PermissionsMatrixData }>('/permissions');
    return res.data.data;
  }
};

export default roleService;

