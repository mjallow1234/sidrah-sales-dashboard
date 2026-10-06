'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppUser } from '@/lib/types';
import type { PermissionCatalogEntry, UserPermissionView } from '@/lib/types/permissions';
import { useAuthQuery } from './queries';

async function fetchAppUsers() {
  return fetch('/api/appusers').then(async (res) => {
    if (!res.ok) {
      throw new Error('Unable to load users');
    }
    const json = await res.json();
    return json.data;
  });
}

async function fetchAppUser(userId: string) {
  return fetch(`/api/appusers/${encodeURIComponent(userId)}`).then(async (res) => {
    if (!res.ok) {
      throw new Error('Unable to load user');
    }
    const json = await res.json();
    return json.data;
  });
}

async function createAppUser(payload: Record<string, unknown>) {
  return fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || 'Unable to create user');
    }
    return res.json();
  });
}

async function updateAppUser(userId: string, payload: Record<string, unknown>) {
  return fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || 'Unable to update user');
    }
    return res.json();
  });
}

export function useAppUsersQuery(enabled = true) {
  return useQuery<AppUser[]>({
    queryKey: ['appUsers'],
    queryFn: () => fetchAppUsers(),
    enabled,
  });
}

async function fetchPermissionCatalog(role: string) {
  return fetch(`/api/permissions/catalog?role=${encodeURIComponent(role)}`).then(async (res) => {
    if (!res.ok) throw new Error('Unable to load permission catalog');
    const json = await res.json();
    return json.data?.permissions as PermissionCatalogEntry[];
  });
}

async function fetchUserPermissions(userId: string) {
  return fetch(`/api/users/${encodeURIComponent(userId)}/permissions`).then(async (res) => {
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || 'Unable to load user permissions');
    }
    const json = await res.json();
    return json.data as UserPermissionView;
  });
}

async function saveUserPermissions(userId: string, overrides: Array<{ permission_key: string; effect: 'allow' | 'deny'; reason?: string | null }>) {
  return fetch(`/api/users/${encodeURIComponent(userId)}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
  }).then(async (res) => {
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || 'Unable to save user permissions');
    }
    return res.json();
  });
}

export function useAppUserQuery(userId: string) {
  return useQuery<AppUser>({
    queryKey: ['appUser', userId],
    queryFn: () => fetchAppUser(userId),
    enabled: !!userId,
  });
}

export function useCreateAppUserMutation() {
  const queryClient = useQueryClient();
  return useMutation<AppUser, Error, Record<string, unknown>>({
    mutationFn: createAppUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
    },
  });
}

export function useUpdateAppUserMutation() {
  const queryClient = useQueryClient();
  return useMutation<AppUser, Error, { id: string; payload: Record<string, unknown> }>({
    mutationFn: ({ id, payload }) => updateAppUser(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
      queryClient.invalidateQueries({ queryKey: ['appUser', variables.id] });
    },
  });
}

export function usePermissionCatalogQuery(role: string, enabled = true) {
  return useQuery<PermissionCatalogEntry[]>({
    queryKey: ['permissionCatalog', role],
    queryFn: () => fetchPermissionCatalog(role),
    enabled: enabled && !!role,
  });
}

export function useUserPermissionsQuery(userId: string, enabled = true) {
  return useQuery<UserPermissionView>({
    queryKey: ['userPermissions', userId],
    queryFn: () => fetchUserPermissions(userId),
    enabled: enabled && !!userId,
  });
}

export function useSaveUserPermissionsMutation() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { userId: string; overrides: Array<{ permission_key: string; effect: 'allow' | 'deny'; reason?: string | null }> }>({
    mutationFn: ({ userId, overrides }) => saveUserPermissions(userId, overrides),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPermissions', variables.userId] });
    },
  });
}

export function useEffectivePermissionQuery(permissionKey: string, enabled = true) {
  const authQuery = useAuthQuery();
  const userId = authQuery.data?.userId;
  const role = authQuery.data?.role;
  const queryEnabled = enabled && !!userId && !!role;

  return useQuery<boolean>({
    queryKey: ['effectivePermission', userId, role, permissionKey],
    queryFn: async () => {
      const response = await fetch(`/api/permissions/me?permissionKey=${encodeURIComponent(permissionKey)}`);
      if (!response.ok) return false;
      const json = await response.json();
      return Boolean(json.data?.allowed);
    },
    enabled: queryEnabled,
    staleTime: 60 * 1000,
  });
}
