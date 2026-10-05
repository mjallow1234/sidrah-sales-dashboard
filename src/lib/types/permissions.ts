export type PermissionEffect = 'allow' | 'deny';

export interface PermissionCatalogEntry {
  permission_key: string;
  module: string;
  section: string | null;
  action: string;
  display_name: string;
  description: string | null;
  active: boolean;
  available?: boolean;
}

export interface UserPermissionEntry extends PermissionCatalogEntry {
  available: boolean;
  effect: PermissionEffect | null;
  enabled: boolean;
}

export interface UserPermissionView {
  role: string;
  permissions: UserPermissionEntry[];
}
