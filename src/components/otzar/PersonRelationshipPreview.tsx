// FILE: PersonRelationshipPreview.tsx
// PURPOSE: Hover/focus preview for shared work and recent collaboration.
//          Plain language. Escape closes. Stays open when pointer enters panel.
// CONNECTS TO: PeopleDirectory badges.

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { WaitingOnItemView } from "@/lib/types/foundation";

type Mode = "projects" | "collabs";

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
  const [waitingOnThem, setWaitingOnThem] = useState<WaitingOnItemView[]>([]);
  const [pendingFromThem, setPendingFromThem] = useState<WaitingOnItemView[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
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
    if (!open || count === 0) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [w, colleagues] = await Promise.all([
        api.workOs.waitingOn(entityId),
        api.otzar.workProjects.colleagues(),
      ]);
      if (cancelled) return;
      if (w.ok && w.data.ok) {
        setWaitingOnThem(w.data.waiting_on_them ?? []);
        setPendingFromThem(w.data.pending_from_them ?? []);
      }
      // Colleagues payload may include shared project titles when available.
      if (colleagues.ok) {
        const raw = colleagues.data as {
          colleagues?: Array<{
            entity_id?: string;
            shared_projects?: Array<{ name?: string; title?: string }>;
          }>;
          people?: Array<{
            entity_id?: string;
            shared_projects?: Array<{ name?: string; title?: string }>;
          }>;
        };
        const list = raw.colleagues ?? raw.people ?? [];
        const row = list.find((c) => c.entity_id === entityId);
        const names = (row?.shared_projects ?? [])
          .map((p) => p.name ?? p.title ?? "")
          .filter((n) => n.length > 0)
          .slice(0, 5);
        setProjectNames(names);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, entityId, count]);

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
    ...waitingOnThem.map((w) => `Waiting on ${first}: ${w.title}`),
    ...pendingFromThem.map((w) => `${first} waiting on you: ${w.title}`),
  ].slice(0, 5);

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
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-lg"
          onMouseEnter={() => clearClose()}
          onMouseLeave={() => scheduleClose()}
        >
          <p className="text-[11px] font-semibold text-slate-800">
            {mode === "projects" ? "Shared projects" : "Recent work together"}
          </p>
          {count === 0 ? (
            <p className="mt-1 text-[11px] text-slate-500">No shared work yet.</p>
          ) : loading ? (
            <p className="mt-1 text-[11px] text-slate-500">Loading…</p>
          ) : mode === "projects" ? (
            projectNames.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {projectNames.map((n) => (
                  <li key={n} className="text-[11px] text-slate-700">
                    {n}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-slate-600">
                {count} shared project{count === 1 ? "" : "s"} with {first}.
              </p>
            )
          ) : collabLines.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {collabLines.map((line) => (
                <li key={line} className="text-[11px] text-slate-700">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-slate-600">
              {count} recent collaboration{count === 1 ? "" : "s"} with {first}.
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
