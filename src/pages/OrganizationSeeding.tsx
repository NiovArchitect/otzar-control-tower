// FILE: OrganizationSeeding.tsx
// PURPOSE: Admin "Organization Seeding" — the governed Dandelion seed queue. Otzar
//          turns real work evidence into setup/activation suggestions; the admin
//          reviews each one with its source evidence and approves / holds / rejects.
//          Nothing is applied automatically; "Approve setup" advances to a
//          setup-required action, it never grants access. Human language, no raw
//          IDs, no graph jargon, backend truth only.

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { OrgSeed } from "@/lib/types/foundation";
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
      <PageHeader
        title="Organization Seeding"
        description="Suggestions Otzar found from real work — review and approve what should change. Nothing is applied automatically."
      />

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
              Approve setup
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onAct("hold")} data-testid="org-seed-hold">
              Hold
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onAct("reject")} data-testid="org-seed-reject">
              Reject
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
