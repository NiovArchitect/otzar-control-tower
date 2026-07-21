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
import type {
  AssignmentTarget,
  OrgSeed,
  ZoomRecordingView,
} from "@/lib/types/foundation";
import { groupSeeds, type SeedGroup } from "@/lib/work-os/seed-grouping";
import { buildProposalHonestyView } from "@/lib/work-os/proposal-honesty";
import {
  classForSeedType,
  inventoryProposalClasses,
} from "@/lib/work-os/dandelion-proposal-classes";
import { DandelionProposalClassMatrix } from "@/components/otzar/DandelionProposalClassMatrix";

const SEED_TYPE_LABEL: Record<string, string> = {
  grant_tool_access: "Tool access needed",
  connector_setup: "Connector setup needed",
  confirm_or_activate_person: "Activate a person",
  resolve_identity: "Confirm who this is",
  add_project_membership: "Needs a first project",
  set_manager: "Needs a manager",
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
  const [syncBusy, setSyncBusy] = useState(false);
  const [growthHeadline, setGrowthHeadline] = useState<string | null>(null);
  const [structureGapCount, setStructureGapCount] = useState<number | null>(
    null,
  );
  const [managerGapCount, setManagerGapCount] = useState<number | null>(null);
  const [lastSyncNote, setLastSyncNote] = useState<string | null>(null);

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

  // Phase A — Discover → Seed bridge (structure scan lands in this queue).
  async function syncFromGrowth(): Promise<void> {
    setSyncBusy(true);
    setLastSyncNote(null);
    const r = await api.otzar.dandelionSeeds.syncFromGrowth();
    setSyncBusy(false);
    if (r.ok) {
      setSeeds(r.data.seeds);
      setGrowthHeadline(r.data.growth_headline);
      setStructureGapCount(r.data.members_without_project_count);
      setManagerGapCount(
        typeof r.data.members_without_manager_count === "number"
          ? r.data.members_without_manager_count
          : null,
      );
      setLastSyncNote(
        r.data.created === 0
          ? r.data.skipped_existing > 0
            ? `Signals already open (${r.data.skipped_existing}). Managers keep ambient placement; hierarchy waits for confirm.`
            : "No structure or hierarchy gaps — Otzar has nothing quiet to route."
          : `Landed ${r.data.created} signal${r.data.created === 1 ? "" : "s"} (project placement ambient · hierarchy needs your confirm).`,
      );
      setError(null);
    } else {
      setLastSyncNote(
        "code" in r ? `Could not discover structure (${String(r.code)}).` : "Could not discover structure.",
      );
    }
  }

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

  // [A.3] Admin exception: place person on a project when managers cannot /
  // should not (bootstrap, no manager, urgency). Default path stays ambient.
  async function assignToProject(id: string, projectId: string): Promise<void> {
    setBusy(id);
    const r = await api.otzar.dandelionSeeds.approve(id, {
      project_id: projectId,
    });
    setBusy(null);
    if (r.ok) await load();
  }

  // Phase B — admin confirms hierarchy proposal (or chooses another manager).
  async function confirmManager(id: string, managerEntityId: string): Promise<void> {
    setBusy(id);
    const r = await api.otzar.dandelionSeeds.approve(id, {
      manager_entity_id: managerEntityId,
    });
    setBusy(null);
    if (r.ok) await load();
  }

  // [T-3C] the admin's explicit identity decision for an external review
  // seed — link the chosen existing collaborator, or force a new record.
  async function decide(
    id: string,
    decision: "link_existing" | "track_new",
    linkId?: string,
  ): Promise<void> {
    setBusy(id);
    const r = await api.otzar.dandelionSeeds.approve(id, {
      decision,
      ...(linkId !== undefined ? { link_external_collaborator_id: linkId } : {}),
    });
    setBusy(null);
    if (r.ok) await load();
  }

  // Cluster duplicate suggestions for the same person/target into ONE card and
  // organize into root-first Dandelion queues (people → structure → tools).
  const grouped = groupSeeds(seeds ?? []);
  // E-01 — multi-class coverage inventory (people/roles/managers/teams/projects/externals).
  const classInventory = inventoryProposalClasses(seeds ?? []);

  return (
    <div className="space-y-6" data-testid="org-seeding-page" data-e01-surface="true">
      {/* Dandelion operational order: Listen → Discover → Seed → Govern → Grow */}
      <PageHeader
        title="Organization Seeding"
        description="Oversight only — Otzar already routes structure and work into the right people’s ambient Work OS. You hold, dismiss, or handle exceptions. People do not live here."
      />

      {/* E-01 — which proposal classes Dandelion has open right now. */}
      <DandelionProposalClassMatrix inventory={classInventory} />

      <Card data-testid="dandelion-order-strip">
        <CardContent className="space-y-3 py-4 text-sm">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Ambient path:</span>{" "}
            Otzar listens → discovers gaps → lands quiet work on the manager or
            lead → they act when it fits. This page is for policy signals (tools,
            identity, hold/dismiss), not daily placement.
          </p>
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-testid="dandelion-sync-growth"
              disabled={syncBusy || error === "OPERATION_NOT_PERMITTED"}
              onClick={() => void syncFromGrowth()}
            >
              {syncBusy ? "Scanning…" : "Refresh structure signals"}
            </Button>
            {structureGapCount !== null || managerGapCount !== null ? (
              <span className="text-xs text-muted-foreground" data-testid="dandelion-structure-gap-count">
                {structureGapCount !== null
                  ? `${structureGapCount} without a first project · managers notified ambiently`
                  : ""}
                {structureGapCount !== null && managerGapCount !== null ? " · " : ""}
                {managerGapCount !== null
                  ? `${managerGapCount} without a manager · confirm below`
                  : ""}
              </span>
            ) : null}
          </div>
          {growthHeadline !== null ? (
            <p className="text-xs text-foreground" data-testid="dandelion-growth-headline">
              {growthHeadline}
            </p>
          ) : null}
          {lastSyncNote !== null ? (
            <p className="text-xs text-muted-foreground" data-testid="dandelion-sync-note">
              {lastSyncNote}
            </p>
          ) : null}
        </CardContent>
      </Card>

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
            Nothing needs oversight right now. Structure and work route ambiently
            to managers and leads. Use{" "}
            <span className="font-medium text-foreground">Refresh structure signals</span>{" "}
            only when you want Otzar to re-scan — people do not live on this page.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6" data-testid="org-seeding-queues">
          <p className="text-xs text-muted-foreground">
            {grouped.pending_groups}{" "}
            {grouped.pending_groups === 1 ? "signal" : "signals"} in oversight
            {grouped.total_seeds !== grouped.total_groups
              ? ` · ${grouped.total_seeds} seeds in ${grouped.total_groups} groups`
              : ""}{" "}
            · policy exceptions first; placement already ambient to managers
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
                <SeedGroupCard
                  key={g.key}
                  group={g}
                  busy={busy}
                  onAct={(id, v) => void act(id, v)}
                  onDecide={(id, d, link) => void decide(id, d, link)}
                  onAssignProject={(id, projectId) =>
                    void assignToProject(id, projectId)
                  }
                  onConfirmManager={(id, managerId) =>
                    void confirmManager(id, managerId)
                  }
                />
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
  onDecide,
  onAssignProject,
  onConfirmManager,
}: {
  group: SeedGroup;
  busy: string | null;
  onAct: (id: string, v: "approve" | "reject" | "hold") => void;
  onDecide: (id: string, d: "link_existing" | "track_new", linkId?: string) => void;
  onAssignProject: (id: string, projectId: string) => void;
  onConfirmManager: (id: string, managerEntityId: string) => void;
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
        <SeedCard
          key={s.seed_id}
          seed={s}
          busy={busy === s.seed_id}
          onAct={(v) => onAct(s.seed_id, v)}
          onDecide={(d, link) => onDecide(s.seed_id, d, link)}
          onAssignProject={(projectId) => onAssignProject(s.seed_id, projectId)}
          onConfirmManager={(managerId) => onConfirmManager(s.seed_id, managerId)}
          actionable={isPending(s)}
        />
      ))}
    </div>
  );
}

function approveLabel(seedType: string): string {
  switch (seedType) {
    case "add_project_membership":
      return "Create assignment task";
    case "grant_tool_access":
    case "connector_setup":
      return "Approve setup";
    case "review_external_party":
      return "Track external party";
    case "confirm_or_activate_person":
      return "Activate person";
    default:
      return "Approve next step";
  }
}

function SeedCard({
  seed,
  busy,
  onAct,
  onDecide,
  onAssignProject,
  onConfirmManager,
  actionable,
}: {
  seed: OrgSeed;
  busy: boolean;
  onAct: (v: "approve" | "reject" | "hold") => void;
  onDecide: (d: "link_existing" | "track_new", linkId?: string) => void;
  onAssignProject: (projectId: string) => void;
  onConfirmManager: (managerEntityId: string) => void;
  actionable: boolean;
}): JSX.Element {
  // Structure: ambient manager path by default; admin may assign when needed.
  const isStructure = seed.seed_type === "add_project_membership";
  // Phase B — hierarchy propose + admin confirm.
  const isHierarchy = seed.seed_type === "set_manager";
  // E-02 — source, confidence, alternatives, authority-affecting honesty
  const honesty = buildProposalHonestyView(seed);
  const e01Class = classForSeedType(seed.seed_type);

  return (
    <Card
      data-testid="org-seed-card"
      data-seed-status={seed.status}
      data-seed-type={seed.seed_type}
      data-e01-class={e01Class ?? ""}
      data-e02-honesty="true"
      data-authority-affecting={honesty.authority_affecting ? "true" : "false"}
      data-requires-admin-confirm={honesty.requires_admin_confirm ? "true" : "false"}
      data-confidence={honesty.confidence}
      data-source-missing={honesty.source_missing ? "true" : "false"}
    >
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
        {/* E-02 source — always surface presence or honest absence */}
        {honesty.source !== null ? (
          <p className="text-[11px] italic text-muted-foreground" data-testid="org-seed-evidence">
            Source: “{honesty.source}”
          </p>
        ) : (
          <p
            className="text-[11px] text-amber-700 dark:text-amber-400"
            data-testid="org-seed-evidence-missing"
          >
            Source evidence is missing — review carefully before approving.
          </p>
        )}
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground"
          data-testid="org-seed-confidence"
          data-confidence={honesty.confidence}
        >
          <Badge variant="secondary" className="text-[10px] font-normal">
            {honesty.confidence_label}
          </Badge>
          {seed.risk_if_ignored ? <span>· If ignored: {seed.risk_if_ignored}</span> : null}
          {honesty.requires_admin_confirm ? (
            <span data-testid="org-seed-admin-confirm-required">
              · Admin must confirm (nothing auto-applies)
            </span>
          ) : null}
        </div>
        {honesty.authority_affecting ? (
          <p
            className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-900 dark:text-amber-200"
            data-testid="org-seed-authority-banner"
          >
            {honesty.honesty_summary}
          </p>
        ) : (
          <p
            className="text-[11px] text-muted-foreground"
            data-testid="org-seed-honesty-summary"
          >
            {honesty.honesty_summary}
          </p>
        )}
        {/* E-02 alternatives — always listed for pending authority/structure */}
        {actionable ? (
          <div
            className="rounded-md border border-border/50 bg-muted/15 px-2 py-1.5"
            data-testid="org-seed-alternatives"
            data-count={String(honesty.alternatives.length)}
          >
            <p className="text-[11px] font-medium text-foreground">Alternatives</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
              {honesty.alternatives.map((a) => (
                <li
                  key={a.id}
                  data-testid="org-seed-alternative"
                  data-alt-kind={a.kind}
                >
                  {a.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {seed.resulting_action ? (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{seed.resulting_action}</p>
        ) : null}
        {seed.rejection_reason ? (
          <p className="text-[11px] text-muted-foreground">Rejected: {seed.rejection_reason}</p>
        ) : null}
        {/* [T-3C] possible existing collaborators — the admin decides;
            Otzar never merges automatically. Labels only, no emails/ids. */}
        {actionable && seed.possible_matches !== undefined && seed.possible_matches.length > 0 ? (
          <div className="space-y-1.5 rounded-md border border-border/60 p-2" data-testid="org-seed-possible-matches">
            <p className="text-[11px] font-medium text-foreground">
              Possible existing collaborator — review before linking.
              <span className="font-normal text-muted-foreground"> Otzar will not merge this automatically.</span>
            </p>
            {seed.possible_matches.map((m) => (
              <div key={m.external_collaborator_id} className="flex flex-wrap items-center gap-2 text-[11px]" data-testid="org-seed-match">
                <span className="text-foreground">
                  {m.display_label}
                  {m.company_label !== undefined ? ` · ${m.company_label}` : ""}
                  {m.relationship_label !== undefined ? ` (${m.relationship_label})` : ""}
                </span>
                <span className="text-muted-foreground">— {m.reason}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onDecide("link_existing", m.external_collaborator_id)}
                  data-testid="org-seed-link-existing"
                >
                  Link to existing
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onDecide("track_new")}
              data-testid="org-seed-track-new"
            >
              Track as new
            </Button>
          </div>
        ) : null}
        {/* Structure: ambient default + admin exception assign when necessary. */}
        {actionable && isStructure ? (
          <StructureAdminException
            personLabel={seed.subject_name ?? "this person"}
            busy={busy}
            onAssign={onAssignProject}
            onHold={() => onAct("hold")}
            onDismiss={() => onAct("reject")}
          />
        ) : null}
        {/* Phase B — hierarchy: Otzar proposes; admin confirms. */}
        {actionable && isHierarchy ? (
          <HierarchyConfirm
            seed={seed}
            busy={busy}
            onConfirm={onConfirmManager}
            onHold={() => onAct("hold")}
            onDismiss={() => onAct("reject")}
          />
        ) : null}
        {actionable && !isStructure && !isHierarchy ? (
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" disabled={busy} onClick={() => onAct("approve")} data-testid="org-seed-approve">
              {approveLabel(seed.seed_type)}
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

/**
 * Phase B hierarchy seed: soft proposal + admin confirm.
 * Never writes without an explicit confirm click.
 */
function HierarchyConfirm({
  seed,
  busy,
  onConfirm,
  onHold,
  onDismiss,
}: {
  seed: OrgSeed;
  busy: boolean;
  onConfirm: (managerEntityId: string) => void;
  onHold: () => void;
  onDismiss: () => void;
}): JSX.Element {
  const proposedId = seed.proposed_manager_entity_id ?? "";
  const proposedName = seed.proposed_manager_name ?? null;
  const [managerId, setManagerId] = useState(proposedId);
  const [people, setPeople] = useState<
    Array<{ entity_id: string; display_name: string }> | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    void api.org.entities
      .list({ type: "PERSON", take: 250 })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          const list = (r.data.items ?? []) as Array<{
            entity_id: string;
            display_name: string;
          }>;
          setPeople(
            list
              .map((p) => ({
                entity_id: p.entity_id,
                display_name: p.display_name,
              }))
              .sort((a, b) => a.display_name.localeCompare(b.display_name)),
          );
        } else if (proposedId.length > 0) {
          setPeople([
            {
              entity_id: proposedId,
              display_name: proposedName ?? "Proposed manager",
            },
          ]);
        } else {
          setPeople([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeople(
            proposedId.length > 0
              ? [
                  {
                    entity_id: proposedId,
                    display_name: proposedName ?? "Proposed manager",
                  },
                ]
              : [],
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [proposedId, proposedName]);

  const subject = seed.subject_name ?? "this person";
  const subjectId = seed.subject_entity_id ?? "";

  return (
    <div
      className="space-y-2 rounded-md border border-border/50 bg-muted/15 p-2"
      data-testid="org-seed-hierarchy-confirm"
    >
      <p className="text-[11px] text-muted-foreground">
        Otzar proposes a reporting home for{" "}
        <span className="font-medium text-foreground">{subject}</span>
        {proposedName !== null ? (
          <>
            {" "}
            — suggested manager:{" "}
            <span className="font-medium text-foreground">{proposedName}</span>
          </>
        ) : (
          <> — pick a manager to confirm</>
        )}
        . Nothing is written until you confirm.
      </p>
      {people === null ? (
        <p className="text-[11px] text-muted-foreground">Loading people…</p>
      ) : (
        <select
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          data-testid="org-seed-manager-select"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
        >
          <option value="">Choose manager…</option>
          {people
            .filter((p) => p.entity_id !== subjectId)
            .map((p) => (
              <option key={p.entity_id} value={p.entity_id}>
                {p.display_name}
                {p.entity_id === proposedId ? " (suggested)" : ""}
              </option>
            ))}
        </select>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || managerId.length === 0}
          onClick={() => onConfirm(managerId)}
          data-testid="org-seed-confirm-manager"
        >
          {busy ? "Saving…" : "Confirm manager"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onHold}
          data-testid="org-seed-hold"
        >
          Hold oversight
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onDismiss}
          data-testid="org-seed-reject"
        >
          Dismiss signal
        </Button>
      </div>
    </div>
  );
}

/**
 * Structure seed controls: ambient path is default (manager already notified).
 * Admin may still assign to a project when necessary — exception, not homework.
 */
function StructureAdminException({
  personLabel,
  busy,
  onAssign,
  onHold,
  onDismiss,
}: {
  personLabel: string;
  busy: boolean;
  onAssign: (projectId: string) => void;
  onHold: () => void;
  onDismiss: () => void;
}): JSX.Element {
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<AssignmentTarget[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.org.assignmentTargets().then((r) => {
      if (cancelled) return;
      if (r.ok && r.data.ok) {
        setProjects((r.data.targets ?? []).filter((t) => t.kind === "project"));
      } else {
        setProjects([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="space-y-2 rounded-md border border-border/50 bg-muted/15 p-2"
      data-testid="org-seed-structure-ambient"
    >
      <p className="text-[11px] text-muted-foreground">
        Otzar already sent quiet work to their{" "}
        <span className="font-medium text-foreground">manager or project lead</span>
        . You can leave that ambient path, or assign{" "}
        <span className="font-medium text-foreground">{personLabel}</span> yourself when
        needed (no manager, bootstrap, urgency).
      </p>
      {projects === null ? (
        <p className="text-[11px] text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="text-[11px] text-muted-foreground" data-testid="org-seed-no-projects">
          No active projects yet.{" "}
          <Link
            to="/app/work-projects"
            className="font-medium underline-offset-2 hover:underline"
          >
            Create a project
          </Link>{" "}
          first, or leave it with their manager.
        </p>
      ) : (
        <select
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          data-testid="org-seed-project-select"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Choose project to assign…</option>
          {projects.map((p) => (
            <option key={p.target_id} value={p.target_id}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || projectId.length === 0}
          onClick={() => onAssign(projectId)}
          data-testid="org-seed-assign-project"
        >
          {busy ? "Assigning…" : "Assign to project"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onHold}
          data-testid="org-seed-hold"
        >
          Hold oversight
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onDismiss}
          data-testid="org-seed-reject"
        >
          Dismiss signal
        </Button>
      </div>
    </div>
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
