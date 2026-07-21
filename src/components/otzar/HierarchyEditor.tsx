// FILE: HierarchyEditor.tsx
// PURPOSE: F-02 — Admin hierarchy editor with stage → bulk confirm → undo,
//          keyboard parity (arrow focus + manager select), optional HTML5
//          drag-drop reparent, a11y. F-04 — hierarchy ≠ authority copy.
//          F-03 — relationship edge kind badges (sponsor / executive top /
//          needs manager / matrix hint).
// CONNECTS TO: Users.tsx, hierarchy-editor.ts, relationship-edges.ts.

import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  HIERARCHY_EDITOR_HEADLINE,
  HIERARCHY_NOT_AUTHORITY_COPY,
  HIERARCHY_VIRTUALIZE_THRESHOLD,
  buildUndoEntry,
  effectiveManager,
  labelPerson,
  managerMapFromEdges,
  moveFocusIndex,
  removeDraft,
  stageDraftChange,
  undoAsAssigns,
  wouldCreateCycle,
  windowSlice,
  type HierarchyDraftChange,
  type HierarchyEdge,
  type HierarchyPerson,
  type HierarchyUndoEntry,
} from "@/lib/org/hierarchy-editor";
import { classifyPersonRelationship } from "@/lib/org/relationship-edges";

export function HierarchyEditor({
  people,
  edges,
  onApplied,
}: {
  people: HierarchyPerson[];
  edges: HierarchyEdge[];
  onApplied: () => void;
}): JSX.Element {
  const managers = useMemo(() => managerMapFromEdges(edges), [edges]);
  const [drafts, setDrafts] = useState<HierarchyDraftChange[]>([]);
  const [undoStack, setUndoStack] = useState<HierarchyUndoEntry[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const [dragPersonId, setDragPersonId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...people].sort((a, b) =>
        a.display_name.localeCompare(b.display_name, undefined, {
          sensitivity: "base",
        }),
      ),
    [people],
  );

  const { start, end } = windowSlice(sorted.length, focusIndex);
  const visible = sorted.slice(start, end);

  const stageManager = useCallback(
    (personId: string, toManagerId: string | null) => {
      const from = managers.get(personId) ?? null;
      if (
        wouldCreateCycle(personId, toManagerId, managers, drafts)
      ) {
        setNotice({
          tone: "error",
          text: "That would create a reporting cycle — pick a different manager.",
        });
        return;
      }
      setDrafts((d) =>
        stageDraftChange(d, {
          person_entity_id: personId,
          from_manager_entity_id: from,
          to_manager_entity_id: toManagerId,
        }),
      );
      setNotice(null);
    },
    [managers, drafts],
  );

  async function confirmBulk(): Promise<void> {
    if (drafts.length === 0 || busy) return;
    setBusy(true);
    setNotice(null);
    const applied: HierarchyDraftChange[] = [];
    const auditIds: string[] = [];
    for (const d of drafts) {
      if (wouldCreateCycle(d.person_entity_id, d.to_manager_entity_id, managers, applied)) {
        setNotice({
          tone: "error",
          text: "Stopped: a staged change would create a cycle. Fix drafts and try again.",
        });
        setBusy(false);
        return;
      }
      const r = await api.org.hierarchy.assign({
        person_entity_id: d.person_entity_id,
        manager_entity_id: d.to_manager_entity_id,
      });
      if (!r.ok || !r.data.ok) {
        setNotice({
          tone: "error",
          text:
            !r.ok && r.code === "CYCLE"
              ? "Server rejected a cycle. Clear drafts and retry."
              : "Couldn't apply all changes. Partial apply may have saved — refresh hierarchy.",
        });
        setBusy(false);
        if (applied.length > 0) {
          setUndoStack((s) => [buildUndoEntry(applied, auditIds), ...s].slice(0, 10));
          setDrafts([]);
          onApplied();
        }
        return;
      }
      applied.push(d);
      if (r.data.audit_event_id) auditIds.push(r.data.audit_event_id);
    }
    setUndoStack((s) => [buildUndoEntry(applied, auditIds), ...s].slice(0, 10));
    setDrafts([]);
    setNotice({
      tone: "ok",
      text: `Applied ${applied.length} reporting change${applied.length === 1 ? "" : "s"}. Recorded in the audit trail.`,
    });
    setBusy(false);
    onApplied();
  }

  async function undoLast(): Promise<void> {
    const top = undoStack[0];
    if (!top || busy) return;
    setBusy(true);
    setNotice(null);
    const reverses = undoAsAssigns(top);
    for (const d of reverses) {
      const r = await api.org.hierarchy.assign({
        person_entity_id: d.person_entity_id,
        manager_entity_id: d.to_manager_entity_id,
      });
      if (!r.ok) {
        setNotice({
          tone: "error",
          text: "Undo partially failed. Refresh the hierarchy and re-check reporting lines.",
        });
        setBusy(false);
        onApplied();
        return;
      }
    }
    setUndoStack((s) => s.slice(1));
    setNotice({
      tone: "ok",
      text: `Undid ${reverses.length} reporting change${reverses.length === 1 ? "" : "s"}. Audit trail keeps history.`,
    });
    setBusy(false);
    onApplied();
  }

  function onKeyDownList(e: KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => moveFocusIndex(i, 1, sorted.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => moveFocusIndex(i, -1, sorted.length));
    }
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-4"
      data-testid="hierarchy-editor"
      data-f02="true"
      data-f03="true"
      data-hierarchy-not-authority="true"
      aria-label="Hierarchy editor"
    >
      <p className="text-sm font-medium" data-testid="hierarchy-editor-headline">
        {HIERARCHY_EDITOR_HEADLINE}
      </p>
      <p
        className="mt-1 text-xs text-muted-foreground"
        data-testid="hierarchy-not-authority-copy"
      >
        {HIERARCHY_NOT_AUTHORITY_COPY}
      </p>
      <p className="mt-1 text-xs text-muted-foreground" data-testid="hierarchy-f03-hint">
        F-03 edge kinds: solid reporting, contractor sponsor (manager), executive
        without manager, needs manager, and matrix/dotted-line hints from role
        labels. Keyboard: ↑/↓ · Manager · Stage · Confirm · Undo. Drag to reparent.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || drafts.length === 0}
          onClick={() => void confirmBulk()}
          data-testid="hierarchy-confirm-bulk"
        >
          {busy
            ? "Working…"
            : drafts.length === 0
              ? "Confirm all"
              : `Confirm all (${drafts.length})`}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || undoStack.length === 0}
          onClick={() => void undoLast()}
          data-testid="hierarchy-undo"
        >
          Undo last apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || drafts.length === 0}
          onClick={() => setDrafts([])}
          data-testid="hierarchy-clear-drafts"
        >
          Clear drafts
        </Button>
        <span
          className="self-center text-[11px] text-muted-foreground"
          data-testid="hierarchy-draft-count"
          data-count={String(drafts.length)}
        >
          {drafts.length} staged · {undoStack.length} undo level
          {undoStack.length === 1 ? "" : "s"}
        </span>
      </div>

      {drafts.length > 0 ? (
        <ul
          className="mt-2 max-h-24 space-y-0.5 overflow-y-auto rounded border border-border/60 bg-muted/20 p-2 text-[11px]"
          data-testid="hierarchy-draft-list"
        >
          {drafts.map((d) => (
            <li key={d.person_entity_id} data-testid="hierarchy-draft-row">
              {labelPerson(people, d.person_entity_id)} →{" "}
              {labelPerson(people, d.to_manager_entity_id)}{" "}
              <button
                type="button"
                className="text-muted-foreground underline"
                onClick={() => setDrafts((x) => removeDraft(x, d.person_entity_id))}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className="mt-3 max-h-80 overflow-y-auto rounded border border-border/50"
        role="listbox"
        aria-label="People hierarchy rows"
        tabIndex={0}
        onKeyDown={onKeyDownList}
        data-testid="hierarchy-people-list"
        data-virtualized={
          sorted.length > HIERARCHY_VIRTUALIZE_THRESHOLD ? "true" : "false"
        }
      >
        {start > 0 ? (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">
            … {start} above (scroll / arrow to reveal)
          </p>
        ) : null}
        {visible.map((p, vi) => {
          const index = start + vi;
          const focused = index === focusIndex;
          const eff = effectiveManager(p.entity_id, managers, drafts);
          const staged = drafts.some((d) => d.person_entity_id === p.entity_id);
          const rel = classifyPersonRelationship({
            entity_id: p.entity_id,
            display_name: p.display_name,
            manager_entity_id: eff,
            role_title: p.role_title ?? null,
            department: p.department ?? null,
          });
          const isContractor = rel.kind === "contractor_sponsor";
          return (
            <div
              key={p.entity_id}
              role="option"
              aria-selected={focused}
              data-testid="hierarchy-person-row"
              data-entity-id={p.entity_id}
              data-staged={staged ? "true" : "false"}
              data-f03-kind={rel.kind}
              data-f03-matrix-hint={rel.matrix_hint ? "true" : "false"}
              draggable
              onDragStart={() => setDragPersonId(p.entity_id)}
              onDragEnd={() => setDragPersonId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragPersonId && dragPersonId !== p.entity_id) {
                  stageManager(dragPersonId, p.entity_id);
                }
                setDragPersonId(null);
              }}
              onClick={() => setFocusIndex(index)}
              className={
                "flex flex-wrap items-center gap-2 border-b border-border/40 px-2 py-1.5 text-sm " +
                (focused ? "bg-primary/5 ring-1 ring-primary/30 " : "") +
                (staged ? "border-l-2 border-l-amber-500 " : "")
              }
            >
              <span className="min-w-[10rem] flex-1 truncate font-medium">
                {p.display_name}
                {p.email ? (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    {p.email}
                  </span>
                ) : null}
              </span>
              <span
                className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground"
                data-testid="hierarchy-edge-kind-badge"
                data-kind={rel.kind}
              >
                {rel.kind_label}
                {rel.matrix_hint ? " · matrix" : ""}
              </span>
              <label className="sr-only" htmlFor={`mgr-${p.entity_id}`}>
                {isContractor
                  ? `Sponsor for ${p.display_name}`
                  : `Manager for ${p.display_name}`}
              </label>
              <select
                id={`mgr-${p.entity_id}`}
                className="max-w-[14rem] rounded-md border border-input bg-background px-2 py-1 text-xs"
                value={eff ?? ""}
                aria-label={
                  isContractor
                    ? `Sponsor for ${p.display_name}`
                    : `Manager for ${p.display_name}`
                }
                data-testid="hierarchy-manager-select"
                data-f03-select={isContractor ? "sponsor" : "manager"}
                onChange={(e) => {
                  const v = e.target.value;
                  stageManager(p.entity_id, v.length === 0 ? null : v);
                }}
                onFocus={() => setFocusIndex(index)}
              >
                <option value="">
                  {rel.kind === "executive_no_manager" ||
                  rel.kind === "needs_manager"
                    ? "No manager (top level / executive OK)"
                    : "No manager (top level)"}
                </option>
                {people
                  .filter((x) => x.entity_id !== p.entity_id)
                  .map((x) => (
                    <option key={x.entity_id} value={x.entity_id}>
                      {isContractor ? "Sponsor: " : ""}
                      {x.display_name}
                      {x.email ? ` (${x.email})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          );
        })}
        {end < sorted.length ? (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">
            … {sorted.length - end} more below
          </p>
        ) : null}
      </div>

      {notice !== null ? (
        <p
          className={`mt-2 text-xs ${notice.tone === "ok" ? "text-emerald-600" : "text-destructive"}`}
          data-testid="hierarchy-editor-notice"
          role="status"
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
