// FILE: hierarchy-editor.ts
// PURPOSE: F-02 — Admin hierarchy editor model: draft reparents, bulk
//          confirm, undo stack, cycle safety, keyboard-parity (drag-drop
//          optional). F-04 — hierarchy ≠ RBAC/TAR/tool authority.
// CONNECTS TO: Users page HierarchyEditor, api.org.hierarchy.assign.

export interface HierarchyPerson {
  entity_id: string;
  display_name: string;
  email?: string | null;
  /** Optional role/department for F-03 edge-kind classification. */
  role_title?: string | null;
  department?: string | null;
}

/** Current reporting edge for a person (null manager = top-level). */
export interface HierarchyEdge {
  person_entity_id: string;
  manager_entity_id: string | null;
}

export interface HierarchyDraftChange {
  person_entity_id: string;
  from_manager_entity_id: string | null;
  to_manager_entity_id: string | null;
  /** Optional role/department patches carried with assign. */
  role_title?: string;
  department?: string;
}

export interface HierarchyUndoEntry {
  /** Changes applied in the last bulk confirm (reverse for undo). */
  applied: HierarchyDraftChange[];
  audit_event_ids: string[];
  at: string;
}

export const HIERARCHY_NOT_AUTHORITY_COPY =
  "Reporting hierarchy is who reports to whom — not access control, " +
  "RBAC, TAR permissions, or tool authority. Those stay on Access Control.";

export const HIERARCHY_EDITOR_HEADLINE =
  "Hierarchy editor — stage reporting changes, confirm in bulk, undo last apply.";

/** Build manager map from edges. */
export function managerMapFromEdges(
  edges: ReadonlyArray<HierarchyEdge>,
): Map<string, string | null> {
  const m = new Map<string, string | null>();
  for (const e of edges) {
    m.set(e.person_entity_id, e.manager_entity_id);
  }
  return m;
}

/**
 * Would assigning person → manager create a cycle?
 * Walk manager chain from proposed manager; if we hit person, cycle.
 */
export function wouldCreateCycle(
  personId: string,
  newManagerId: string | null,
  managers: ReadonlyMap<string, string | null>,
  /** Pending drafts applied on top of managers for preview. */
  pending?: ReadonlyArray<HierarchyDraftChange>,
): boolean {
  if (newManagerId === null) return false;
  if (newManagerId === personId) return true;
  const effective = new Map(managers);
  if (pending) {
    for (const p of pending) {
      effective.set(p.person_entity_id, p.to_manager_entity_id);
    }
  }
  effective.set(personId, newManagerId);
  let cur: string | null | undefined = newManagerId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === personId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    cur = effective.get(cur) ?? null;
  }
  return false;
}

/** Stage or replace a draft change for a person. */
export function stageDraftChange(
  drafts: ReadonlyArray<HierarchyDraftChange>,
  change: HierarchyDraftChange,
): HierarchyDraftChange[] {
  // No-op if same as from
  if (change.from_manager_entity_id === change.to_manager_entity_id) {
    return drafts.filter((d) => d.person_entity_id !== change.person_entity_id);
  }
  const rest = drafts.filter((d) => d.person_entity_id !== change.person_entity_id);
  return [...rest, change];
}

export function removeDraft(
  drafts: ReadonlyArray<HierarchyDraftChange>,
  personId: string,
): HierarchyDraftChange[] {
  return drafts.filter((d) => d.person_entity_id !== personId);
}

/** Clear all drafts. */
export function clearDrafts(): HierarchyDraftChange[] {
  return [];
}

/**
 * Build undo entry from successfully applied changes (store reverse edges).
 * Undo re-assigns each person to from_manager.
 */
export function buildUndoEntry(
  applied: ReadonlyArray<HierarchyDraftChange>,
  auditEventIds: ReadonlyArray<string>,
  at: string = new Date().toISOString(),
): HierarchyUndoEntry {
  return {
    applied: applied.map((c) => ({ ...c })),
    audit_event_ids: [...auditEventIds],
    at,
  };
}

/** Reverse changes for undo API calls. */
export function undoAsAssigns(
  entry: HierarchyUndoEntry,
): HierarchyDraftChange[] {
  return entry.applied.map((c) => ({
    person_entity_id: c.person_entity_id,
    from_manager_entity_id: c.to_manager_entity_id,
    to_manager_entity_id: c.from_manager_entity_id,
  }));
}

export function labelPerson(
  people: ReadonlyArray<HierarchyPerson>,
  id: string | null,
): string {
  if (id === null) return "No manager (top level)";
  const p = people.find((x) => x.entity_id === id);
  if (!p) return id;
  return p.email ? `${p.display_name} (${p.email})` : p.display_name;
}

/** Effective manager after drafts. */
export function effectiveManager(
  personId: string,
  managers: ReadonlyMap<string, string | null>,
  drafts: ReadonlyArray<HierarchyDraftChange>,
): string | null {
  const d = drafts.find((x) => x.person_entity_id === personId);
  if (d) return d.to_manager_entity_id;
  return managers.get(personId) ?? null;
}

/**
 * Keyboard parity action: move selection focus among person ids.
 * direction -1 = previous, +1 = next. Wraps.
 */
export function moveFocusIndex(
  current: number,
  direction: -1 | 1,
  length: number,
): number {
  if (length <= 0) return 0;
  return (current + direction + length) % length;
}

/** Max rows rendered before scroll virtualization cue (simple window). */
export const HIERARCHY_VIRTUALIZE_THRESHOLD = 40;

export function windowSlice(
  length: number,
  focusIndex: number,
  windowSize: number = HIERARCHY_VIRTUALIZE_THRESHOLD,
): { start: number; end: number } {
  if (length <= windowSize) return { start: 0, end: length };
  const half = Math.floor(windowSize / 2);
  let start = Math.max(0, focusIndex - half);
  let end = start + windowSize;
  if (end > length) {
    end = length;
    start = Math.max(0, end - windowSize);
  }
  return { start, end };
}
