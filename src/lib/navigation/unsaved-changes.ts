// FILE: unsaved-changes.ts
// PURPOSE: [APP-NAV-CONTINUITY] A tiny shared registry of "this form has
//          unsaved edits" so the NavigationGuard can warn before ANY in-app
//          navigation (sidebar, Back button, programmatic redirect) and arm
//          the browser's native beforeunload prompt for reload/close.
// CONNECTS TO: NavigationGuard.tsx (reader + guard), any input-bearing page
//              (writer via useUnsavedChanges), src/components/Layout.tsx +
//              employee/EmployeeLayout.tsx (host the guard).
//
// SECURITY (non-negotiable): this module tracks only a per-form BOOLEAN — "is
// there unsaved input right now" — keyed by a stable string. It NEVER reads,
// serializes, or persists the form's actual values, and it writes NOTHING to
// localStorage / sessionStorage / cookies. No enterprise content is custodied
// client-side as a "convenience". Durable drafts, if ever wanted, are a
// Foundation-backed feature (see the gap ledger) — deliberately NOT built here.

import { useEffect } from "react";
import { create } from "zustand";

interface UnsavedChangesState {
  /** Stable keys of forms that currently hold unsaved edits. */
  dirtyKeys: Set<string>;
  register: (key: string) => void;
  unregister: (key: string) => void;
}

const useUnsavedChangesStore = create<UnsavedChangesState>((set) => ({
  dirtyKeys: new Set<string>(),
  register: (key) =>
    set((s) => {
      if (s.dirtyKeys.has(key)) return s;
      const next = new Set(s.dirtyKeys);
      next.add(key);
      return { dirtyKeys: next };
    }),
  unregister: (key) =>
    set((s) => {
      if (!s.dirtyKeys.has(key)) return s;
      const next = new Set(s.dirtyKeys);
      next.delete(key);
      return { dirtyKeys: next };
    }),
}));

/** True when ANY registered form currently holds unsaved edits. */
export function useHasUnsavedChanges(): boolean {
  return useUnsavedChangesStore((s) => s.dirtyKeys.size > 0);
}

/** Non-reactive read — used by the imperative beforeunload arming path/tests. */
export function hasUnsavedChanges(): boolean {
  return useUnsavedChangesStore.getState().dirtyKeys.size > 0;
}

/** Test/edge escape hatch — clear the registry (e.g. on hard logout). */
export function clearUnsavedChanges(): void {
  useUnsavedChangesStore.setState({ dirtyKeys: new Set<string>() });
}

/**
 * Register a form's dirty state under a STABLE, unique `key`. While `isDirty`
 * is true the key is tracked; the NavigationGuard blocks navigation while any
 * key is tracked. The cleanup always unregisters, so a form that unmounts
 * (e.g. after the user chooses "Leave") never leaves a stale block behind.
 */
export function useUnsavedChanges(key: string, isDirty: boolean): void {
  const register = useUnsavedChangesStore((s) => s.register);
  const unregister = useUnsavedChangesStore((s) => s.unregister);
  useEffect(() => {
    if (isDirty) register(key);
    else unregister(key);
    return () => unregister(key);
  }, [key, isDirty, register, unregister]);
}
