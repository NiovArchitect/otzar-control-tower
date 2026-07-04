// FILE: OrganizationSeeding.tsx
// PURPOSE: Admin "Organization Seeding" — the governed Dandelion seed queue. Otzar
//          turns real work evidence into setup/activation suggestions; the admin
//          reviews each one with its source evidence and approves / holds / rejects.
//          Nothing is applied automatically; "Approve setup" advances to a
//          setup-required action, it never grants access. Human language, no raw
//          IDs, no graph jargon, backend truth only.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { OrgSeed, ZoomRecordingView } from "@/lib/types/foundation";
import { groupSeeds, type SeedGroup } from "@/lib/work-os/seed-grouping";

const SEED_TYPE_LABEL: Record<string, string> = {
  grant_tool_access: "Tool access needed",
  connector_setup: "Connector setup needed",
  confirm_or_activate_person: "Activate a person",
  resolve_identity: "Confirm who this is",
  add_project_membership: "Project membership",
  add_team_membership: "Team membership",
  confirm_support_role: "Confirm support role",
  add_work_owner_edge: "Confirm work owner",
  // [T-2] Otzar noticed a possible external collaborator — review before
  // tracking; nothing is added automatically.
  review_external_party: "External collaborator review",
};
const STATUS_LABEL: Record<string, string> = {
  SEED_PROPOSED: "New suggestion",
  SEED_NEEDS_REVIEW: "Needs review",
  SEED_APPROVED: "Approved",
  SEED_REJECTED: "Rejected",
  SEED_HELD: "On hold",
  SEED_APPLIED: "Applied",
};
const seedTypeLabel = (t: string): string => SEED_TYPE_LABEL[t] ?? t.replace(/_/g, " ");
const statusLabel = (s: string): string => STATUS_LABEL[s] ?? s.replace(/^SEED_/, "").toLowerCase();
const isPending = (s: OrgSeed): boolean => s.status === "SEED_PROPOSED" || s.status === "SEED_NEEDS_REVIEW";

export function OrganizationSeedingPage(): JSX.Element {
  const [seeds, setSeeds] = useState<OrgSeed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.otzar.dandelionSeeds.list();
    if (r.ok) {
      setSeeds(r.data.seeds);
      setError(null);
    } else {
      setError(r.code);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, verb: "approve" | "reject" | "hold"): Promise<void> {
    setBusy(id);
    const r =
      verb === "approve"
        ? await api.otzar.dandelionSeeds.approve(id)
        : verb === "reject"
          ? await api.otzar.dandelionSeeds.reject(id)
          : await api.otzar.dandelionSeeds.hold(id);
    setBusy(null);
    if (r.ok) await load();
  }

  // Cluster duplicate suggestions for the same person/target into ONE card and
  // organize into prioritized, comprehensible queues (scales past a flat wall).
  const grouped = groupSeeds(seeds ?? []);

  return (
    <div className="space-y-6" data-testid="org-seeding-page">
      {/* PROD-MODEL-P3 §5 — Dandelion means DISCOVERY: Otzar listens to the
          organization's workstream and surfaces the people, tools, and
          structure it finds, like seeds landing from the air. Review before
          anything joins the organization. */}
      <PageHeader
        title="Organization Seeding"
        description="Otzar found people and context from your organization's workstream — meetings, conversations, and real work. Review each seed before it becomes part of your organization. Nothing is applied automatically."
      />

      {/* CX-SLICE-3 — the meeting door into discovery: pick an approved
          recording and Otzar reviews it for participants, commitments, and
          follow-ups through the ONE governed pipeline. */}
      <MeetingIngestCard />

      {error === "OPERATION_NOT_PERMITTED" ? (
        <Card>
          <CardContent className="py-6 text-sm" data-testid="org-seeding-denied">
            This area is for organization admins.
          </CardContent>
        </Card>
      ) : error !== null ? (
        <Card>
          <CardContent className="py-6 text-sm" data-testid="org-seeding-error">
            Couldn&apos;t load suggestions right now. Refresh to try again.
          </CardContent>
        </Card>
      ) : seeds === null ? (
        <p className="text-sm text-muted-foreground" data-testid="org-seeding-loading">
          Loading suggestions…
        </p>
      ) : seeds.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground" data-testid="org-seeding-empty">
            No suggestions yet. As Otzar processes conversations, setup and activation suggestions
            will appear here for your review.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6" data-testid="org-seeding-queues">
          <p className="text-xs text-muted-foreground">
            {grouped.pending_groups} {grouped.pending_groups === 1 ? "person/setup" : "people/setups"} to review
            {grouped.total_seeds !== grouped.total_groups ? ` · ${grouped.total_seeds} suggestions grouped into ${grouped.total_groups}` : ""}
          </p>
          {grouped.queues.map(({ def, groups }) => (
            <section key={def.id} className="space-y-2" data-testid={`org-seeding-queue-${def.id}`}>
              <div>
                <h3 className="text-sm font-medium">
                  {def.label} ({groups.length})
                </h3>
                <p className="text-xs text-muted-foreground">{def.description}</p>
              </div>
              {groups.map((g) => (
                <SeedGroupCard key={g.key} group={g} busy={busy} onAct={(id, v) => void act(id, v)} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// One grouped card per person/target: shows the subject + how many suggestions
// (and from how many conversations), then each individual governed suggestion as
// its own reviewable SeedCard (approve/hold/reject stay per-suggestion — nothing
// is bulk-applied without review).
function SeedGroupCard({
  group,
  busy,
  onAct,
}: {
  group: SeedGroup;
  busy: string | null;
  onAct: (id: string, v: "approve" | "reject" | "hold") => void;
}): JSX.Element {
  const title = group.subject_name ?? seedTypeLabel(group.seeds[0]!.seed_type);
  const multi = group.count > 1;
  return (
    <div data-testid="org-seed-group" data-subject-key={group.key} className="space-y-1.5">
      {multi ? (
        <div className="flex items-center gap-2 pl-0.5 text-xs">
          <span className="font-medium text-foreground">{title}</span>
          <span className="text-muted-foreground">
            · {group.count} suggestions{group.source_count > 1 ? ` from ${group.source_count} conversations` : ""}
          </span>
        </div>
      ) : null}
      {group.seeds.map((s) => (
        <SeedCard key={s.seed_id} seed={s} busy={busy === s.seed_id} onAct={(v) => onAct(s.seed_id, v)} actionable={isPending(s)} />
      ))}
    </div>
  );
}

function SeedCard({
  seed,
  busy,
  onAct,
  actionable,
}: {
  seed: OrgSeed;
  busy: boolean;
  onAct: (v: "approve" | "reject" | "hold") => void;
  actionable: boolean;
}): JSX.Element {
  return (
    <Card data-testid="org-seed-card" data-seed-status={seed.status}>
      <CardContent className="space-y-2 py-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{seedTypeLabel(seed.seed_type)}</span>
              {seed.subject_name ? <span className="text-xs text-muted-foreground">· {seed.subject_name}</span> : null}
            </div>
            <p className="text-muted-foreground">{seed.recommended_action}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {statusLabel(seed.status)}
          </Badge>
        </div>
        {seed.source_evidence ? (
          <p className="text-[11px] italic text-muted-foreground" data-testid="org-seed-evidence">
            Why: “{seed.source_evidence}”
          </p>
        ) : null}
        <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
          <span>Confidence: {seed.confidence}</span>
          {seed.risk_if_ignored ? <span>· If ignored: {seed.risk_if_ignored}</span> : null}
          {seed.approval_required ? <span>· Approval required</span> : null}
        </div>
        {seed.resulting_action ? (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{seed.resulting_action}</p>
        ) : null}
        {seed.rejection_reason ? (
          <p className="text-[11px] text-muted-foreground">Rejected: {seed.rejection_reason}</p>
        ) : null}
        {actionable ? (
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" disabled={busy} onClick={() => onAct("approve")} data-testid="org-seed-approve">
              Add to organization
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onAct("hold")} data-testid="org-seed-hold">
              Keep for later
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onAct("reject")} data-testid="org-seed-reject">
              Ignore
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// CX-SLICE-3 — "The meeting ended, and Otzar can turn it into organized work
// with my approval." Lists the org's Zoom cloud recordings (safe projection:
// topic/when/duration only) and offers ONE action per recording: Review for
// follow-ups. Consent is stated plainly; every failure is a sentence, never
// a code; Zoom-missing routes to Tools & Connections like every other
// setup-required state.
function MeetingIngestCard(): JSX.Element | null {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "not_connected" }
    | { kind: "unavailable" } // non-admin or org unresolved — render nothing
    | { kind: "ready"; recordings: ZoomRecordingView[] }
  >({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.connectorData.zoomRecordings({ page_size: 30 }).then((r) => {
      if (cancelled) return;
      if (r.ok) setState({ kind: "ready", recordings: r.data.recordings });
      else if (r.code === "NOT_CONNECTED" || r.code === "NOT_CONFIGURED") setState({ kind: "not_connected" });
      else setState({ kind: "unavailable" });
    }).catch(() => { if (!cancelled) setState({ kind: "unavailable" }); });
    return () => { cancelled = true; };
  }, []);

  async function ingest(meetingUuid: string, topic: string): Promise<void> {
    setBusyId(meetingUuid);
    setNotice(null);
    const r = await api.connectorData.ingestZoomRecording(meetingUuid);
    setBusyId(null);
    if (r.ok) {
      const items = r.data.result.work_items?.length ?? 0;
      const seeds = r.data.result.dandelion_seeds?.length ?? 0;
      setNotice({
        tone: "ok",
        text: `Otzar reviewed “${topic}” — ${items} work item${items === 1 ? "" : "s"} and ${seeds} new seed${seeds === 1 ? "" : "s"}. Look under the queues below, and in Team Work for routed follow-ups. Every step was recorded.`,
      });
      return;
    }
    setNotice({
      tone: "error",
      text:
        r.code === "NO_TRANSCRIPT" || r.code === "NOT_FOUND"
          ? `“${topic}” doesn't have a transcript Otzar can read yet — Zoom prepares transcripts a few minutes after a meeting ends.`
          : r.code === "NOT_CONFIGURED"
            ? "Zoom isn't connected for your organization yet."
            : r.code === "TRANSCRIPT_TOO_LARGE"
              ? `“${topic}” is too long to review in one pass.`
              : "Otzar couldn't review that recording right now. Try again in a moment.",
    });
  }

  if (state.kind === "unavailable") return null;
  return (
    <Card data-testid="meeting-ingest-card">
      <CardContent className="space-y-3 pt-4 text-sm">
        <div>
          <p className="font-medium">Review a meeting for follow-ups</p>
          <p className="text-xs text-muted-foreground">
            Otzar fetches the transcript using your organization&apos;s
            connected Zoom account, then reviews it for participants,
            commitments, and follow-ups. Nothing is sent externally, and
            every step is recorded.
          </p>
        </div>
        {state.kind === "loading" ? (
          <p className="text-xs text-muted-foreground">Checking your recordings…</p>
        ) : state.kind === "not_connected" ? (
          <p className="text-xs text-amber-700" data-testid="meeting-ingest-not-connected">
            Zoom isn&apos;t connected for your organization yet.{" "}
            <Link to="/tools-connections" className="underline">
              Connect it in Tools &amp; Connections
            </Link>{" "}
            and recordings will appear here.
          </p>
        ) : state.recordings.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="meeting-ingest-empty">
            No cloud recordings found in the last month.
          </p>
        ) : (
          <ul className="space-y-1.5" data-testid="meeting-ingest-list">
            {state.recordings.map((rec) => (
              <li
                key={rec.meeting_uuid}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                data-testid="meeting-ingest-row"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{rec.topic}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(rec.start_time).toLocaleString()} · {rec.duration_minutes} min
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId !== null}
                  onClick={() => void ingest(rec.meeting_uuid, rec.topic)}
                  data-testid="meeting-ingest-go"
                >
                  {busyId === rec.meeting_uuid ? "Reviewing…" : "Review for follow-ups"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {notice !== null ? (
          <p
            className={`text-xs ${notice.tone === "ok" ? "text-emerald-700" : "text-amber-700"}`}
            data-testid="meeting-ingest-notice"
          >
            {notice.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
