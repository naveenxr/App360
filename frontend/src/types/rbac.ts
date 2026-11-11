export interface ActionPermissions {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard?: ActionPermissions;
  alarm?: ActionPermissions;
  event?: ActionPermissions;
  map?: ActionPermissions;
  api?: ActionPermissions;
  user?: ActionPermissions;
  role?: ActionPermissions;
  settings?: ActionPermissions;
  audit?: ActionPermissions;
  [module: string]: ActionPermissions | undefined;
}

export interface Role {
  id: string;
  _id?: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystemRole?: boolean;
  assignedUserCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagedUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  roleId: Role | string;
  role?: Role | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  _id?: string;
  actorId?: { _id: string; name: string; email: string } | string;
  actorName: string;
  actorEmail: string;
  action:
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_ACTIVATED'
    | 'USER_DEACTIVATED'
    | 'ROLE_ASSIGNED'
    | 'ROLE_CREATED'
    | 'ROLE_UPDATED'
    | 'PERMISSION_CHANGED';
  targetType: 'USER' | 'ROLE' | 'PERMISSION';
  targetId?: string | null;
  targetName?: string;
  previousValues?: Record<string, unknown> | null;
  updatedValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

export interface PermissionsMatrixData {
  modules: string[];
  actions: ('create' | 'read' | 'update' | 'delete')[];
  roles: Role[];
}

