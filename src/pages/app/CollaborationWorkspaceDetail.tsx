// FILE: CollaborationWorkspaceDetail.tsx
// PURPOSE: Phase 1221 — single workspace detail page. Sections:
//          Overview / People / Decisions / Commitments /
//          Follow-ups (linked actions) / Shared context / External
//          stakeholders / Audit summary.
//
// PRIVACY:
//   - Plain language only ("people / teammates / decisions /
//     commitments / shared context / private context").
//   - Forbidden in copy: payload, schema, DMW, COSMP, capsule_id,
//     binding, adapter, internal JSON.
//   - Never renders raw transcripts, payload internals, vectors,
//     embeddings, or external email bodies.
//
// SCOPE:
//   - Confirm a RESOLVED commitment → internal SEND_INTERNAL_NOTIFICATION.
//   - Track / invite / revoke external collaborators.
//   - Create internal follow-up reminder for an external commitment.
//   - NEVER sends external messages — that requires connector + policy
//     + approval (deferred to Phases 1225 / 1226).

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  CollaborationWorkspaceDetailResponse,
  CollaborationCommitmentView,
  WorkspaceExternalMembershipView,
  ExternalCommitmentSafeView,
  ExternalRelationshipType,
} from "@/lib/types/foundation";

type Detail = CollaborationWorkspaceDetailResponse;

export function CollaborationWorkspaceDetail(): JSX.Element {
  const params = useParams<{ workspace_id: string }>();
  const workspaceId = params.workspace_id ?? "";
  const [detail, setDetail] = useState<Detail | null>(null);
  const [externals, setExternals] = useState<WorkspaceExternalMembershipView[]>(
    [],
  );
  const [externalCommitments, setExternalCommitments] = useState<
    ExternalCommitmentSafeView[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCommitmentId, setBusyCommitmentId] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const [d, ex, exc] = await Promise.all([
      api.collaborationWorkspaces.detail(workspaceId),
      api.collaborationWorkspaces.listExternal(workspaceId),
      api.collaborationWorkspaces.listExternalCommitments(workspaceId),
    ]);
    if (d.ok) {
      setDetail(d.data);
      setError(null);
    } else {
      setError(d.code);
    }
    if (ex.ok) setExternals(ex.data.workspace_memberships);
    if (exc.ok) setExternalCommitments(exc.data.external_commitments);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId.length === 0) {
      setError("MISSING_WORKSPACE_ID");
      setLoading(false);
      return;
    }
    refresh();
  }, [workspaceId, refresh]);

  async function handleConfirm(c: CollaborationCommitmentView): Promise<void> {
    setBusyCommitmentId(c.commitment_id);
    const r = await api.collaborationWorkspaces.confirmCommitment(
      workspaceId,
      c.commitment_id,
      {},
    );
    setBusyCommitmentId(null);
    if (r.ok) {
      await refresh();
    } else {
      setError(r.code);
    }
  }

  async function handleExternalFollowup(
    ec: ExternalCommitmentSafeView,
  ): Promise<void> {
    setBusyCommitmentId(ec.external_commitment_id);
    const r = await api.collaborationWorkspaces.createExternalFollowup(
      workspaceId,
      ec.external_commitment_id,
      {},
    );
    setBusyCommitmentId(null);
    if (r.ok) {
      await refresh();
    } else {
      setError(r.code);
    }
  }

  if (loading) {
    return (
      <Card data-testid="collaboration-workspace-detail-loading">
        <CardContent className="py-4 text-xs text-muted-foreground">
          Loading workspace…
        </CardContent>
      </Card>
    );
  }

  if (error !== null || detail === null) {
    return (
      <Card
        className="border-rose-400/40 bg-rose-500/5"
        data-testid="collaboration-workspace-detail-error"
      >
        <CardContent className="py-3 text-xs">
          <AlertCircle className="mr-1 inline h-3 w-3" aria-hidden />
          Couldn't open this workspace ({error ?? "UNKNOWN"}).
          <div className="mt-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/collaboration-workspaces">
                <ArrowLeft className="mr-1 h-3 w-3" aria-hidden /> Back to
                workspaces
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group internal commitments by owner.
  const commitmentsByOwner = new Map<string, CollaborationCommitmentView[]>();
  for (const c of detail.commitments) {
    const key = c.owner_display_name || "(unresolved)";
    const arr = commitmentsByOwner.get(key) ?? [];
    arr.push(c);
    commitmentsByOwner.set(key, arr);
  }

  return (
    <div
      className="space-y-5"
      data-testid="collaboration-workspace-detail-page"
    >
      <PageHeader
        title={detail.workspace.title}
        description={
          detail.workspace.description ?? "A governed shared workspace."
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <Badge variant="outline">
          {detail.workspace.visibility === "EXTERNAL_ALLOWED"
            ? "External allowed"
            : "Internal only"}
        </Badge>
        <Badge variant="outline">{detail.workspace.status}</Badge>
        <Badge variant="outline">
          {detail.audit_summary.member_count} member
          {detail.audit_summary.member_count === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline">
          {detail.audit_summary.decision_count} decision
          {detail.audit_summary.decision_count === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline">
          {detail.audit_summary.commitment_count} commitment
          {detail.audit_summary.commitment_count === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline">
          {detail.audit_summary.action_count} action
          {detail.audit_summary.action_count === 1 ? "" : "s"}
        </Badge>
        <Button size="sm" variant="outline" asChild>
          <Link to="/app/collaboration-workspaces">
            <ArrowLeft className="mr-1 h-3 w-3" aria-hidden /> Back
          </Link>
        </Button>
      </div>

      {/* People & responsibilities */}
      <Card data-testid="collaboration-workspace-people-section">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" aria-hidden /> People & responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs">
            {detail.members.map((m) => (
              <li
                key={m.membership_id}
                className="flex items-start justify-between gap-2 rounded border bg-card p-2"
                data-testid="collaboration-workspace-member-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {m.member_display_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {m.role_label}
                    {m.responsibility_summary !== null
                      ? ` — ${m.responsibility_summary}`
                      : null}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px]">
                  {m.access_level}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Decisions */}
      <Card data-testid="collaboration-workspace-decisions-section">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.decisions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No decisions recorded yet.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.decisions.map((d) => (
                <li
                  key={d.decision_id}
                  className="rounded border bg-card p-2"
                  data-testid="collaboration-workspace-decision-row"
                >
                  <p>{d.text}</p>
                  {d.source_excerpt !== null ? (
                    <p className="mt-1 text-[10px] italic text-muted-foreground">
                      “{d.source_excerpt}”
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Commitments grouped by owner */}
      <Card data-testid="collaboration-workspace-commitments-section">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Commitments by owner</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.commitments.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No commitments yet. Attach a conversation or capture to extract
              them.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {Array.from(commitmentsByOwner.entries()).map(([owner, list]) => (
                <li key={owner} className="rounded border bg-card p-2">
                  <p className="text-[11px] font-medium">{owner}</p>
                  <ul className="mt-1 space-y-1">
                    {list.map((c) => (
                      <li
                        key={c.commitment_id}
                        className="rounded border bg-background p-2"
                        data-testid="collaboration-workspace-commitment-row"
                        data-status={c.status}
                        data-resolution-status={c.resolution_status}
                      >
                        <p>{c.text}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {c.assignment_reason}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[9px]">
                            {c.resolution_status}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">
                            confidence: {c.confidence}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">
                            {c.status}
                          </Badge>
                          {c.related_action_id !== null ? (
                            <Badge
                              variant="outline"
                              className="text-[9px]"
                            >
                              <CheckCircle2
                                className="mr-0.5 inline h-2.5 w-2.5 text-emerald-500"
                                aria-hidden
                              />{" "}
                              Action linked
                            </Badge>
                          ) : null}
                        </div>
                        {c.related_action_id === null &&
                        c.resolution_status === "RESOLVED" ? (
                          <Button
                            size="sm"
                            className="mt-2 h-6 text-[10px]"
                            onClick={() => handleConfirm(c)}
                            disabled={busyCommitmentId === c.commitment_id}
                            data-testid="collaboration-workspace-confirm-commitment"
                          >
                            {busyCommitmentId === c.commitment_id ? (
                              <Loader2
                                className="mr-1 h-3 w-3 animate-spin"
                                aria-hidden
                              />
                            ) : null}
                            Confirm follow-up
                          </Button>
                        ) : null}
                        {c.resolution_status !== "RESOLVED" &&
                        c.related_action_id === null ? (
                          <p className="mt-2 text-[10px] text-amber-500">
                            Set the owner before confirming this commitment.
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Linked actions */}
      <Card data-testid="collaboration-workspace-actions-section">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Follow-up actions</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.linked_actions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No actions created yet.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.linked_actions.map((a) => (
                <li
                  key={a.action_id}
                  className="flex items-center justify-between gap-2 rounded border bg-card p-2"
                  data-testid="collaboration-workspace-action-row"
                  data-action-status={a.status}
                >
                  <span>
                    {a.action_type} · {a.risk_tier}
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            See the full lifecycle in the{" "}
            <Link to="/app/action-center" className="underline">
              Action Center
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* External stakeholders */}
      <Card data-testid="collaboration-workspace-externals-section">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" aria-hidden /> External stakeholders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {externals.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No external stakeholders tracked here. External collaborators —
              clients, vendors, partners — can be tracked without giving them
              access to Otzar.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {externals.map((m) => {
                const ec = m.external_collaborator;
                return (
                  <li
                    key={m.workspace_external_membership_id}
                    className="rounded border bg-card p-2"
                    data-testid="collaboration-workspace-external-row"
                    data-status={m.status}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{ec.display_name}</p>
                      <Badge variant="outline" className="text-[9px]">
                        {ec.relationship_type}
                      </Badge>
                    </div>
                    {ec.company_name !== null ? (
                      <p className="text-[10px] text-muted-foreground">
                        {ec.company_name}
                      </p>
                    ) : null}
                    <div className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-2">
                      {ec.needs_from_us !== null ? (
                        <p className="text-[10px]">
                          <span className="font-medium">They need from us:</span>{" "}
                          {ec.needs_from_us}
                        </p>
                      ) : null}
                      {ec.we_need_from_them !== null ? (
                        <p className="text-[10px]">
                          <span className="font-medium">We need from them:</span>{" "}
                          {ec.we_need_from_them}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[9px]">
                        {m.status === "TRACKED_EXTERNAL"
                          ? "Tracked only"
                          : m.status === "INVITED_EXTERNAL"
                            ? "Invited"
                            : m.status === "ACTIVE_EXTERNAL"
                              ? "Active"
                              : m.status === "REVOKED_EXTERNAL"
                                ? "Revoked"
                                : "Blocked"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        Access: {m.access_level}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* External commitments split: They owe us / We owe them */}
      {externalCommitments.length > 0 ? (
        <Card data-testid="collaboration-workspace-external-commitments-section">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">External commitments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[10px] font-medium uppercase text-muted-foreground">
              They owe us
            </p>
            {externalCommitments.filter(
              (c) => c.direction === "EXTERNAL_OWES_INTERNAL",
            ).length === 0 ? (
              <p className="text-[10px] text-muted-foreground">None.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {externalCommitments
                  .filter((c) => c.direction === "EXTERNAL_OWES_INTERNAL")
                  .map((ec) => (
                    <li
                      key={ec.external_commitment_id}
                      className="rounded border bg-card p-2"
                      data-testid="collaboration-workspace-they-owe-us-row"
                    >
                      <p>{ec.text}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Waiting on {ec.external_collaborator_display_name}
                        {ec.external_collaborator_company_name !== null
                          ? ` (${ec.external_collaborator_company_name})`
                          : ""}
                      </p>
                      {ec.related_action_id === null ? (
                        <Button
                          size="sm"
                          className="mt-2 h-6 text-[10px]"
                          onClick={() => handleExternalFollowup(ec)}
                          disabled={
                            busyCommitmentId === ec.external_commitment_id
                          }
                          data-testid="collaboration-workspace-create-external-followup"
                        >
                          Create internal follow-up reminder
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">
                          Reminder sent to internal owner
                        </Badge>
                      )}
                    </li>
                  ))}
              </ul>
            )}
            <p className="text-[10px] font-medium uppercase text-muted-foreground">
              We owe them
            </p>
            {externalCommitments.filter(
              (c) => c.direction === "INTERNAL_OWES_EXTERNAL",
            ).length === 0 ? (
              <p className="text-[10px] text-muted-foreground">None.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {externalCommitments
                  .filter((c) => c.direction === "INTERNAL_OWES_EXTERNAL")
                  .map((ec) => (
                    <li
                      key={ec.external_commitment_id}
                      className="rounded border bg-card p-2"
                      data-testid="collaboration-workspace-we-owe-them-row"
                    >
                      <p>{ec.text}</p>
                      <p className="text-[10px] text-muted-foreground">
                        We owe {ec.external_collaborator_display_name}
                        {ec.external_collaborator_company_name !== null
                          ? ` (${ec.external_collaborator_company_name})`
                          : ""}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
            <p className="text-[10px] text-amber-500">
              External messages (email, Slack) require explicit connector setup
              + policy approval. Otzar never sends externally without
              authorization.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Shared context */}
      <Card data-testid="collaboration-workspace-shared-context-section">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Shared context</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.shared_context.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              Nothing shared into this workspace yet.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {detail.shared_context.map((s) => (
                <li
                  key={s.shared_context_id}
                  className="rounded border bg-card p-2"
                  data-testid="collaboration-workspace-shared-context-row"
                >
                  <p className="font-medium">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.summary}
                  </p>
                  <Badge variant="outline" className="mt-1 text-[9px]">
                    {s.sensitivity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Anything that isn't shared above stays private to your wallet.
          </p>
        </CardContent>
      </Card>

      {/* Audit summary */}
      <Card data-testid="collaboration-workspace-audit-section">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Audit record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground">
            Created {new Date(detail.audit_summary.created_at).toLocaleString()}{" "}
            · {detail.audit_summary.member_count} member
            {detail.audit_summary.member_count === 1 ? "" : "s"} ·{" "}
            {detail.audit_summary.decision_count} decision
            {detail.audit_summary.decision_count === 1 ? "" : "s"} ·{" "}
            {detail.audit_summary.commitment_count} commitment
            {detail.audit_summary.commitment_count === 1 ? "" : "s"} ·{" "}
            {detail.audit_summary.action_count} action
            {detail.audit_summary.action_count === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Every workspace event is recorded in Otzar's audit chain. No
            external messages were sent.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Re-exported helper for tests.
export type { ExternalRelationshipType };
