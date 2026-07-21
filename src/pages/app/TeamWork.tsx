// FILE: TeamWork.tsx
// PURPOSE: Phase 1279 cockpit + Phase 1285-G waiting-on panel — the manager/
//          founder view of durable team work. Reads GET /api/v1/work-os/
//          team-work. The "Waiting on team" panel surfaces directional
//          relationship state (who is waiting on whom) from REAL Work Ledger
//          records — owner/requester names, source-message proof, status, age
//          — never faked from memory or collaboration counts. Honest blocker
//          when the caller lacks team authority (TEAM_SCOPE_NOT_CONFIGURED).
// CONNECTS TO: api.workOs.teamWork, WorkLedgerItem, route /app/team-work.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  Entity,
  EntityMembership,
  ExternalRelationshipsSummaryView,
  TeamClarityHealthView,
  WorkLedgerEntryView,
} from "@/lib/types/foundation";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { bucketFor, BUCKET_ORDER } from "@/lib/work-os/work-buckets";
import { buildTeamRollup } from "@/lib/work-os/team-rollup";
import { useAuthStore } from "@/lib/stores/auth";
import { GlassPanel } from "@/components/ambient/GlassPanel";
import { isWaitingOnItem, groupWaitingByOwner, ageOf } from "@/lib/work-os/team-waiting-on";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { useWorkStateChanged } from "@/lib/events/work-state";

// [T-4] the external section renders only when something needs attention —
// an absent block or all-zero counts stay silent.
function externalActive(
  ext: ExternalRelationshipsSummaryView | undefined,
): ext is ExternalRelationshipsSummaryView {
  return (
    ext !== undefined &&
    (ext.waiting_on_external_count > 0 ||
      ext.internal_commitments_to_external_count > 0 ||
      ext.overdue_external_count > 0 ||
      ext.external_review_pending_count > 0 ||
      ext.external_ownership_unclear_count > 0 ||
      ext.repeated_external_ambiguity_count > 0)
  );
}

export function TeamWork(): JSX.Element {
  const [items, setItems] = useState<WorkLedgerEntryView[] | null>(null);
  // PROD-UX-SCALE — server pagination (mirrors My Work).
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  // [CE-4B] exception summary — counts + labels only; null renders nothing.
  const [health, setHealth] = useState<TeamClarityHealthView | null>(null);

  // Reload — used on mount AND after any status change so completion by an
  // owner clears the item from the team waiting-on panel without a restart.
  async function reload(): Promise<void> {
    const r = await api.workOs.teamWork();
    if (r.ok) {
      setItems(r.data.entries ?? r.data.items ?? []);
      setHasMore(r.data.has_more === true);
    }
    else if (r.code === "TEAM_SCOPE_NOT_CONFIGURED") setBlocked(true);
    else setFailed(true);
    // Exception summary is best-effort — a failure renders silence, never
    // an error state (the work list is the page's job; this is seasoning).
    const h = await api.workOs.teamClarityHealth();
    if (h.ok) setHealth(h.data);
  }

  async function loadMore(): Promise<void> {
    if (items === null) return;
    setLoadingMore(true);
    const r = await api.workOs.teamWork({ skip: items.length, take: 300 });
    setLoadingMore(false);
    if (r.ok) {
      const next = r.data.entries ?? r.data.items ?? [];
      const seen = new Set(items.map((i) => i.ledger_entry_id));
      setItems([...items, ...next.filter((i) => !seen.has(i.ledger_entry_id))]);
      setHasMore(r.data.has_more === true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.workOs
      .teamWork()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setItems(r.data.entries ?? r.data.items ?? []);
          setHasMore(r.data.has_more === true);
        }
        else if (r.code === "TEAM_SCOPE_NOT_CONFIGURED") setBlocked(true);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    // [CE-4B] best-effort exception summary — failure renders silence.
    api.workOs
      .teamClarityHealth()
      .then((h) => {
        if (!cancelled && h.ok) setHealth(h.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Additive cross-surface sync (Phase 1285-H): when a task is completed /
  // tracked anywhere, the team waiting-on panel refreshes without a manual
  // reload — alongside the existing onChanged callback path.
  useWorkStateChanged(
    ["TASK_COMPLETED", "LEDGER_UPDATED", "SIGNAL_TRACKED", "WAITING_ON_CHANGED"],
    () => void reload(),
  );

  // CX-SLICE-1 — the manager's operating-state rollup. Hierarchy + people
  // load alongside (this page is already manager-gated); a 403/absence
  // degrades to the no-manager fallback (no invented reports).
  const callerEmail = useAuthStore((s) => s.entity?.email ?? null);
  const [hier, setHier] = useState<{ org: string; memberships: EntityMembership[] } | null>(null);
  const [people, setPeople] = useState<Entity[]>([]);
  useEffect(() => {
    let cancelled = false;
    void api.org.hierarchy.get().then((r) => {
      if (!cancelled && r.ok) setHier({ org: r.data.org_entity_id, memberships: r.data.memberships });
    }).catch(() => undefined);
    void api.org.entities.list({ type: "PERSON", take: 250 }).then((r) => {
      if (!cancelled && r.ok) setPeople(r.data.items);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const rollup = items === null ? null : buildTeamRollup({
    entries: items,
    callerEmail,
    people,
    memberships: hier?.memberships ?? [],
    orgEntityId: hier?.org ?? null,
    hasMore,
  });

  // Directional waiting-on items grouped by owner (the person being waited on).
  const waitingOn = items === null ? [] : items.filter(isWaitingOnItem);
  const ownerGroups = groupWaitingByOwner(waitingOn);

  return (
    <div className="space-y-4" data-testid="team-work-page">
      <div>
        <h1 className="text-lg font-semibold">Team Work</h1>
        <p className="text-xs text-muted-foreground">
          Durable work across your team — who is waiting on whom, what's
          pending, what's stale, and what needs attention.
        </p>
      </div>

      {/* [CE-4B] clarity exceptions — ONE calm box, rendered only when a
          count is non-zero (silence otherwise). Patterns, never a feed:
          counts + org-internal labels; no source excerpts, no per-event
          rows, no red badges. [T-4] external relationship exceptions share
          the same box as one additional calm section. */}
      {health !== null &&
      (health.unresolved_clarifications_count > 0 ||
        health.overdue_clarifications_count > 0 ||
        health.ownership_unclear_count > 0 ||
        externalActive(health.external_relationships)) ? (
        <div
          className="rounded-md border border-border p-3 text-xs"
          data-testid="team-clarity-health"
        >
          {health.top_exception !== undefined ? (
            <p className="font-medium text-foreground">
              {health.top_exception.label}
              <span className="font-normal text-muted-foreground">
                {" — "}
                {health.top_exception.reason}
              </span>
            </p>
          ) : null}
          <div className="mt-1 space-y-0.5 text-muted-foreground">
            {health.unresolved_clarifications_count > 0 ? (
              <p>
                {health.unresolved_clarifications_count} clarification request
                {health.unresolved_clarifications_count === 1 ? "" : "s"} waiting.
              </p>
            ) : null}
            {health.ownership_unclear_count > 0 ? (
              <p>
                {health.ownership_unclear_count} item
                {health.ownership_unclear_count === 1 ? " needs" : "s need"} ownership
                clarity.
              </p>
            ) : null}
            {health.repeated_ambiguity_topics.map((t) => (
              <p key={t.label}>
                {t.label} has repeated clarifications ({t.count}).
              </p>
            ))}
          </div>
          {/* [T-4] external relationship exceptions — governed counts +
              account labels only. Silence when absent/zero; no feed, no
              badges, no CRM vocabulary. */}
          {externalActive(health.external_relationships) ? (
            <div
              className="mt-2 border-t border-border pt-2"
              data-testid="team-external-exceptions"
            >
              {health.external_relationships!.top_external_exception !== undefined ? (
                <p className="font-medium text-foreground">
                  {health.external_relationships!.top_external_exception.label}
                  <span className="font-normal text-muted-foreground">
                    {" — "}
                    {health.external_relationships!.top_external_exception.reason}
                  </span>
                </p>
              ) : null}
              <div className="mt-1 space-y-0.5 text-muted-foreground">
                {health.external_relationships!.waiting_on_external_count > 0 ? (
                  <p>
                    {health.external_relationships!.waiting_on_external_count} item
                    {health.external_relationships!.waiting_on_external_count === 1
                      ? " is"
                      : "s are"}{" "}
                    waiting on{" "}
                    {health.external_relationships!.external_topics.length === 1
                      ? health.external_relationships!.external_topics[0]!.label
                      : "external parties"}
                    .
                  </p>
                ) : null}
                {health.external_relationships!.internal_commitments_to_external_count > 0 ? (
                  <p>
                    {health.external_relationships!.internal_commitments_to_external_count}{" "}
                    commitment
                    {health.external_relationships!.internal_commitments_to_external_count === 1
                      ? ""
                      : "s"}{" "}
                    to external parties in flight.
                  </p>
                ) : null}
                {health.external_relationships!.external_ownership_unclear_count > 0 ? (
                  <p>
                    {health.external_relationships!.external_ownership_unclear_count} external
                    commitment
                    {health.external_relationships!.external_ownership_unclear_count === 1
                      ? " needs"
                      : "s need"}{" "}
                    an internal owner.
                  </p>
                ) : null}
                {health.external_relationships!.external_review_pending_count > 0 ? (
                  <p>
                    {health.external_relationships!.external_review_pending_count} external
                    part
                    {health.external_relationships!.external_review_pending_count === 1
                      ? "y needs"
                      : "ies need"}{" "}
                    review in Organization setup.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {blocked ? (
        <div
          className="rounded-md border border-border p-3 text-xs text-muted-foreground"
          data-testid="team-work-blocked"
        >
          Team scope is not configured or your role cannot view team work.
        </div>
      ) : failed ? (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="team-work-error"
        >
          Couldn't load team work right now. Refresh to try again.
        </div>
      ) : items === null ? (
        <p className="text-xs text-muted-foreground">Loading team work…</p>
      ) : (
        <>
          {/* CX-SLICE-1 — the operating state of your team, before any list.
              Real counts from the loaded entries + real manager edges; the
              coverage note states exactly what the numbers cover. */}
          {rollup !== null &&
          (rollup.directReports !== null ||
            rollup.unownedOrEscalated + rollup.blockedOrSetup + rollup.approvalsNeeded + rollup.recentlyCompleted > 0) ? (
            <GlassPanel intensity="working" label="Your team right now" testId="team-rollup">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" data-testid="team-rollup-counts">
                <span data-testid="team-rollup-approvals">
                  <span className="font-medium text-amber-700">{rollup.approvalsNeeded}</span> waiting on approval
                </span>
                <span data-testid="team-rollup-blocked">
                  <span className="font-medium text-rose-700">{rollup.blockedOrSetup}</span> blocked or need setup
                </span>
                <span data-testid="team-rollup-unowned">
                  <span className="font-medium text-amber-700">{rollup.unownedOrEscalated}</span> unowned or escalated
                </span>
                <span data-testid="team-rollup-completed">
                  <span className="font-medium text-emerald-700">{rollup.recentlyCompleted}</span> recently completed
                </span>
              </div>
              {rollup.directReports !== null ? (
                <div className="mt-2 space-y-0.5" data-testid="team-rollup-reports">
                  {rollup.directReports.map((r) => (
                    <p key={r.entity_id} className="text-xs text-slate-700" data-testid="team-rollup-report">
                      <span className="font-medium">{r.name}</span> · {r.open} open
                      {r.blocked > 0 ? ` · ${r.blocked} blocked` : ""}
                      {r.approvals > 0 ? ` · ${r.approvals} waiting on approval` : ""}
                    </p>
                  ))}
                </div>
              ) : null}
              {rollup.coverage !== null ? (
                <p className="mt-1 text-[10px] text-muted-foreground" data-testid="team-rollup-coverage">
                  {rollup.coverage}
                </p>
              ) : null}
            </GlassPanel>
          ) : null}

          {/* Phase 1285-G — Waiting on team: directional relationship state
              from durable Work Ledger records. */}
          <section className="space-y-1.5" data-testid="team-work-waiting-on">
            <h2 className="text-xs font-medium text-muted-foreground">
              Waiting on team ({waitingOn.length})
            </h2>
            {waitingOn.length === 0 ? (
              <div
                className="rounded-md border border-border p-3 text-xs text-muted-foreground"
                data-testid="team-work-waiting-on-empty"
              >
                Nothing tracked as waiting on the team right now.
              </div>
            ) : (
              ownerGroups.map((group) => (
                <div key={group.owner_entity_id} className="space-y-1" data-testid="team-work-waiting-on-owner">
                  <div className="text-[11px] font-medium text-amber-600">
                    Waiting on {group.name} ({group.items.length})
                  </div>
                  {group.items.map((e) => (
                    <div key={e.ledger_entry_id} className="ml-2">
                      <div className="text-[11px] text-muted-foreground">
                        requested by {entityLabel(e.requester_display_name)}
                        {" · "}
                        {e.status.replace(/_/g, " ").toLowerCase()}
                        {" · "}
                        {ageOf(e.created_at)}
                        {e.due_at !== null ? ` · due ${e.due_at.slice(0, 10)}` : ""}
                      </div>
                      <WorkLedgerItem entry={e} onChanged={() => void reload()} />
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>

          {/* Full team work, grouped by status bucket (unchanged). */}
          {items.length === 0 ? (
            <div
              className="rounded-md border border-border p-3 text-xs text-muted-foreground"
              data-testid="team-work-empty"
            >
              No open team work right now.
            </div>
          ) : (
            BUCKET_ORDER.map((bucket) => {
              const group = items.filter((e) => bucketFor(e) === bucket);
              if (group.length === 0) return null;
              return (
                <section key={bucket} className="space-y-1.5" data-testid="team-work-group">
                  <h2 className="text-xs font-medium text-muted-foreground">
                    {bucket} ({group.length})
                  </h2>
                  {group.map((e) => (
                    <WorkLedgerItem key={e.ledger_entry_id} entry={e} onChanged={() => void reload()} />
                  ))}
                </section>
              );
            })
          )}
          {hasMore ? (
            <button
              type="button"
              className="w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground"
              data-testid="team-work-load-more"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading…" : "Show more team work"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
