export type UserRole = 'ADMIN' | 'ENGINEER' | 'VIEWER';

export interface ModulePermission {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface RolePermissions {
  alarm?: ModulePermission;
  map?: ModulePermission;
  api?: ModulePermission;
  userManagement?: ModulePermission;
  [key: string]: ModulePermission | undefined;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: UserRole;
    permissions?: RolePermissions;
  } | string;
  isActive: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

