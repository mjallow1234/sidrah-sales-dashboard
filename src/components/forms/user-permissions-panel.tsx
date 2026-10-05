'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthQuery } from '@/lib/hooks/queries';
import { usePermissionCatalogQuery, useUserPermissionsQuery } from '@/lib/hooks/userQueries';
import type { PermissionCatalogEntry } from '@/lib/types/permissions';

interface UserPermissionsPanelProps {
  role: string;
  userId?: string;
  onOverridesChange: (overrides: Array<{ permission_key: string; effect: 'deny' }>) => void;
}

function title(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function setsEqual(left: Set<string>, right: Set<string>) {
  return left.size === right.size && Array.from(left).every(value => right.has(value));
}

export function UserPermissionsPanel({ role, userId, onOverridesChange }: UserPermissionsPanelProps) {
  const auth = useAuthQuery();
  const canManageTarget = !!auth.data && (auth.data.role === 'super_admin' || role !== 'super_admin');
  const selfEdit = !!userId && userId === auth.data?.userId;
  const catalog = usePermissionCatalogQuery(role, canManageTarget);
  const current = useUserPermissionsQuery(userId ?? '', !!userId && canManageTarget && !selfEdit);
  const [denied, setDenied] = useState<Set<string>>(new Set());
  const emittedOverrides = useRef('');
  const entries = catalog.data ?? [];
  const availableKeys = useMemo(() => new Set(entries.filter(item => item.available).map(item => item.permission_key)), [entries]);
  const effectiveDenied = useMemo(() => new Set(Array.from(denied).filter(key => availableKeys.has(key))), [denied, availableKeys]);

  useEffect(() => {
    if (current.data) {
      setDenied(previous => {
        const next = new Set(current.data.permissions.filter(item => item.effect === 'deny').map(item => item.permission_key));
        return setsEqual(previous, next) ? previous : next;
      });
    }
  }, [current.data]);

  useEffect(() => {
    const signature = Array.from(effectiveDenied).sort().join('|');
    if (signature === emittedOverrides.current) return;
    emittedOverrides.current = signature;
    onOverridesChange(Array.from(effectiveDenied).map(permission_key => ({ permission_key, effect: 'deny' as const })));
  }, [effectiveDenied, onOverridesChange]);

  const groups = useMemo(() => {
    const grouped = new Map<string, PermissionCatalogEntry[]>();
    for (const entry of entries) grouped.set(entry.module, [...(grouped.get(entry.module) ?? []), entry]);
    return Array.from(grouped.entries());
  }, [entries]);

  const setModuleState = (module: string, enabled: boolean) => {
    const keys = entries.filter(item => item.module === module && item.available).map(item => item.permission_key);
    setDenied(previous => {
      const next = new Set(previous);
      for (const key of keys) enabled ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Access &amp; Permissions</h2>
        <p className="mt-1 text-sm text-slate-500">Available access is limited by the selected role. Unchecked options restrict access; they never grant authority beyond the role.</p>
      </div>
      {selfEdit ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">You cannot change your own permissions.</p> : null}
      {!canManageTarget ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Only a Super Admin can configure a Super Admin account.</p> : null}
      {canManageTarget && (catalog.isLoading || (userId && current.isLoading)) ? <p className="text-sm text-slate-500">Loading permissions…</p> : null}
      {canManageTarget && (catalog.error || current.error) ? <p className="text-sm text-rose-600">Unable to load permissions.</p> : null}
      <div className="grid gap-3">
        {groups.map(([module, moduleEntries]) => {
          const available = moduleEntries.filter(item => item.available);
          const allEnabled = available.length > 0 && available.every(item => !effectiveDenied.has(item.permission_key));
          return (
            <details key={module} open className="rounded-2xl border border-slate-200 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-900">
                <span>{title(module)}</span>
                <span className="flex items-center gap-2 text-xs font-normal text-slate-500">
                  {available.length ? <button type="button" className="underline" disabled={selfEdit || !canManageTarget} onClick={(event) => { event.preventDefault(); setModuleState(module, true); }}>Select all</button> : null}
                  {available.length ? <button type="button" className="underline" disabled={selfEdit || !canManageTarget} onClick={(event) => { event.preventDefault(); setModuleState(module, false); }}>Clear all</button> : null}
                  {available.length ? (allEnabled ? 'All enabled' : `${available.filter(item => !effectiveDenied.has(item.permission_key)).length}/${available.length}`) : 'Not available'}
                </span>
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {moduleEntries.map(item => {
                  const enabled = item.available && !effectiveDenied.has(item.permission_key);
                  return (
                    <label key={item.permission_key} className={`flex gap-3 rounded-xl border p-3 text-sm ${item.available ? 'border-slate-200' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                      <input type="checkbox" checked={enabled} disabled={!item.available || selfEdit || !canManageTarget} onChange={(event) => setDenied(previous => { const next = new Set(previous); event.target.checked ? next.delete(item.permission_key) : next.add(item.permission_key); return next; })} />
                      <span><span className="block font-medium">{item.display_name}</span><span className="block text-xs text-slate-500">{item.available ? item.description : 'Not available for this role.'}</span></span>
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
