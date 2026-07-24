'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppUser } from '@/lib/types';

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

export function useAppUsersQuery() {
  return useQuery({
    queryKey: ['appUsers'],
    queryFn: () => fetchAppUsers(),
  });
}

export function useAppUserQuery(userId: string) {
  return useQuery({
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
