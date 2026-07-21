// FILE: PersonRelationshipPreview.tsx
// PURPOSE: Hover/focus preview for shared projects + recent collab with
//          real names and outcomes (RC2 PPL-1 / PPL-2). Never repeats the
//          count alone. Escape closes; panel stays open while pointer is in it.
// CONNECTS TO: PeopleDirectory, workProjects list/members, waitingOn.

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { WaitingOnItemView } from "@/lib/types/foundation";

type Mode = "projects" | "collabs";

type SharedProjectRow = {
  project_id: string;
  name: string;
  their_role: string | null;
  my_role: string | null;
};

function labelRole(r: string | null | undefined): string | null {
  if (!r) return null;
  const u = r.toUpperCase();
  if (u === "OWNER") return "Owner";
  if (u === "MEMBER") return "Member";
  if (u === "REVIEWER") return "Reviewer";
  return r.replace(/_/g, " ").toLowerCase();
}

export function PersonRelationshipPreview({
  entityId,
  displayName,
  mode,
  count,
  children,
}: {
  entityId: string;
  displayName: string;
  mode: Mode;
  count: number;
  children: React.ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [waitingOnThem, setWaitingOnThem] = useState<WaitingOnItemView[]>([]);
  const [pendingFromThem, setPendingFromThem] = useState<WaitingOnItemView[]>([]);
  const [projects, setProjects] = useState<SharedProjectRow[]>([]);
  const panelId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearClose(): void {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose(): void {
    clearClose();
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  }

  useEffect(() => {
    if (!open) return;
    if (count === 0) {
      setProjects([]);
      setWaitingOnThem([]);
      setPendingFromThem([]);
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    void (async () => {
      try {
        if (mode === "projects") {
          // Intersect projects the viewer is on with membership of this person.
          const list = await api.otzar.workProjects.list({
            state: "ACTIVE",
            take: 40,
          });
          if (cancelled) return;
          if (!list.ok) {
            setLoadFailed(true);
            setLoading(false);
            return;
          }
          const mine = list.data.projects ?? [];
          const found: SharedProjectRow[] = [];
          // Bound fan-out: check members in small parallel batches.
          for (let i = 0; i < mine.length && found.length < 6; i += 4) {
            const batch = mine.slice(i, i + 4);
            const rows = await Promise.all(
              batch.map(async (p) => {
                const m = await api.otzar.workProjects.members(p.project_id);
                if (!m.ok) return null;
                const them = m.data.members.find((x) => x.entity_id === entityId);
                if (!them) return null;
                return {
                  project_id: p.project_id,
                  name: p.name,
                  their_role: them.role ?? null,
                  my_role: p.my_role ?? null,
                } satisfies SharedProjectRow;
              }),
            );
            if (cancelled) return;
            for (const r of rows) {
              if (r) found.push(r);
              if (found.length >= 6) break;
            }
          }
          setProjects(found);
        } else {
          const w = await api.workOs.waitingOn(entityId);
          if (cancelled) return;
          if (w.ok && w.data.ok) {
            setWaitingOnThem(w.data.waiting_on_them ?? []);
            setPendingFromThem(w.data.pending_from_them ?? []);
          } else {
            setLoadFailed(true);
          }
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, entityId, count, mode]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const first = displayName.split(" ")[0] ?? displayName;
  const collabLines = [
    ...waitingOnThem.map((w) => ({
      key: `w-${w.ledger_entry_id}-${w.title}`,
      text: `Waiting on ${first}: ${w.title}`,
    })),
    ...pendingFromThem.map((w) => ({
      key: `p-${w.ledger_entry_id}-${w.title}`,
      text: `${first} waiting on you: ${w.title}`,
    })),
  ].slice(0, 6);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        clearClose();
        setOpen(true);
      }}
      onMouseLeave={() => scheduleClose()}
      onFocus={() => {
        clearClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
          scheduleClose();
        }
      }}
    >
      <button
        type="button"
        className="inline-flex"
        aria-describedby={open ? panelId : undefined}
        aria-expanded={open}
        data-testid={
          mode === "projects"
            ? "person-shared-projects-trigger"
            : "person-recent-collabs-trigger"
        }
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {open ? (
        <div
          id={panelId}
          role="tooltip"
          data-testid={
            mode === "projects"
              ? "person-shared-projects-preview"
              : "person-recent-collabs-preview"
          }
          className="absolute left-0 top-full z-50 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-lg"
          onMouseEnter={() => clearClose()}
          onMouseLeave={() => scheduleClose()}
        >
          <p className="text-[11px] font-semibold text-slate-800">
            {mode === "projects" ? "Shared projects" : "Recent work together"}
          </p>
          {count === 0 ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {mode === "projects"
                ? "No shared projects yet."
                : "No recent collaboration yet."}
            </p>
          ) : loading ? (
            <p className="mt-1 text-[11px] text-slate-500">Loading…</p>
          ) : loadFailed ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Couldn&apos;t load details right now.
            </p>
          ) : mode === "projects" ? (
            projects.length > 0 ? (
              <ul className="mt-1.5 space-y-2" data-testid="person-shared-projects-list">
                {projects.map((p) => (
                  <li
                    key={p.project_id}
                    className="rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5"
                    data-testid="person-shared-project-row"
                  >
                    <p className="text-[11px] font-medium text-slate-900">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      You: {labelRole(p.my_role) ?? "on this mission"}
                      {p.their_role
                        ? ` · ${first}: ${labelRole(p.their_role)}`
                        : ""}
                    </p>
                    <Link
                      to={`/app/work-projects?project=${encodeURIComponent(p.project_id)}&open=1`}
                      className="mt-1 inline-block text-[10px] font-semibold text-indigo-600 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      Open project
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                No shared projects yet.
              </p>
            )
          ) : collabLines.length > 0 ? (
            <ul className="mt-1.5 space-y-1.5" data-testid="person-recent-collabs-list">
              {collabLines.map((line) => (
                <li
                  key={line.key}
                  className="text-[11px] leading-snug text-slate-700"
                  data-testid="person-recent-collab-row"
                >
                  {line.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              No recent collaboration yet.
            </p>
          )}
          <Link
            to="/app/collaboration"
            className="mt-2 inline-block text-[11px] font-medium text-indigo-600 hover:underline"
            onClick={() => setOpen(false)}
          >
            Open People
          </Link>
        </div>
      ) : null}
    </span>
  );
}
