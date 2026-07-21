// FILE: Collaboration.tsx
// PURPOSE: Phase 4D — employee-facing collaboration page consuming
//          the EDX-6 TwinCollaborationRequest substrate (PR Foundation
//          #276/#277/#278 + #283 project-membership gate + Phase 2
//          #285 org-policy integration).
//
// DESIGN INTENT (per FOUNDER-CLARITY Autonomous Flow):
//   - Reduce friction. Surface state + audit + revocation, NOT
//     bureaucratic approval queues for ordinary internal work.
//   - Show why a request is gated when it is — closed-vocab badges
//     (NEEDS_APPROVAL, BLOCKED, blocked_reason) so the employee knows
//     it's because of org policy / project membership / sensitive
//     context, not random friction.
//   - For same-project/same-team low-risk paths, the org policy
//     evaluator already routes to ALLOW (state=REQUESTED) — the UI
//     surfaces that as "auto-routed" rather than "needs approval".
//
// CONNECTS TO: api.otzar.collaboration.*

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PeopleDirectory } from "@/components/otzar/PeopleDirectory";
import { PeopleStructureGlance } from "@/components/otzar/PeopleStructureGlance";
import { AiCollabEnvelopeCard } from "@/components/otzar/AiCollabEnvelopeCard";
import { AiCollabLoadCard } from "@/components/otzar/AiCollabLoadCard";
import { Sprout } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { api } from "@/lib/api";
import { resolveTargetGoverned } from "@/lib/work-os/target-resolution";
import {
  classifyEnvelopeState,
  isAiToAiTarget,
  resolveCollabTarget,
} from "@/lib/work-os/ai-collab-envelope";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  AssignmentTarget,
  CollaborationRequestSafeView,
  CreateCollaborationRequestBody,
  TwinCollaborationBlockedReason,
  TwinCollaborationRequestType,
  TwinCollaborationState,
  TwinCollaborationTargetType,
} from "@/lib/types/foundation";

// [OTZAR-LIVE-6] Optional "kind of help" chips — human hints, never required.
// Each maps to an EXISTING TwinCollaborationRequestType (schema-honest: no
// invented enum value). Foundation has no distinct DECISION request_type, so a
// "Decision" routes as the nearest honest type (APPROVAL_REQUEST).
const HELP_CHIPS: ReadonlyArray<{
  key: string;
  label: string;
  requestType: TwinCollaborationRequestType;
}> = [
  { key: "STATUS", label: "Status", requestType: "STATUS_REQUEST" },
  { key: "REVIEW", label: "Review", requestType: "REVIEW_REQUEST" },
  { key: "APPROVAL", label: "Approval", requestType: "APPROVAL_REQUEST" },
  { key: "DECISION", label: "Decision", requestType: "APPROVAL_REQUEST" },
  { key: "BLOCKER", label: "Blocker", requestType: "BLOCKER_RESOLUTION" },
  { key: "QUESTION", label: "Question", requestType: "CONTEXT_REQUEST" },
];

function labelTarget(t: TwinCollaborationTargetType): string {
  switch (t) {
    case "EMPLOYEE":
      return "A coworker";
    case "EMPLOYEE_TWIN":
      return "A coworker's AI Teammate";
    case "TEAM":
      return "A team";
    case "PROJECT":
      return "A project";
    case "HIVE":
      return "A hive";
    case "WORKFLOW":
      return "A workflow";
  }
}

function labelRequest(t: TwinCollaborationRequestType): string {
  switch (t) {
    case "STATUS_REQUEST":
      return "Ask for status";
    case "REVIEW_REQUEST":
      return "Ask for review";
    case "BLOCKER_RESOLUTION":
      return "Resolve a blocker";
    case "FOLLOW_UP":
      return "Follow up";
    case "HANDOFF":
      return "Handoff";
    case "CONTEXT_REQUEST":
      return "Ask for context";
    case "APPROVAL_REQUEST":
      return "Ask for approval";
    case "PROJECT_COORDINATION":
      return "Coordinate inside project";
    case "CROSS_TEAM_COORDINATION":
      return "Coordinate across teams";
    case "WORKFLOW_COORDINATION":
      return "Coordinate workflow";
  }
}

function labelState(s: TwinCollaborationState): string {
  switch (s) {
    case "REQUESTED":
      return "Auto-routed";
    case "ACCEPTED":
      return "Accepted";
    case "NEEDS_APPROVAL":
      return "Needs approval";
    case "BLOCKED":
      return "Blocked";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    case "EXPIRED":
      return "Expired";
    case "CANCELED":
      return "Canceled";
  }
}

function labelBlocked(r: TwinCollaborationBlockedReason): string {
  switch (r) {
    case "CROSS_ORG_DENIED":
      return "Outside your org";
    case "MISSING_PROJECT_MEMBERSHIP":
      return "You aren't a member of that project";
    case "MISSING_TEAM_MEMBERSHIP":
      return "You aren't a member of that team";
    case "MISSING_DMW_SCOPE":
      return "Memory scope missing";
    case "MISSING_AUTHORITY_GRANT":
      return "Authority grant missing";
    case "POLICY_REQUIRES_APPROVAL":
      return "Org policy needs approval first";
    case "CONNECTOR_WRITE_NOT_AUTHORIZED":
      return "Connector write not authorized";
    case "SENSITIVE_CONTEXT_BLOCKED":
      return "Sensitive context blocked";
    case "TARGET_NOT_FOUND":
      return "Target not found";
  }
}

const TERMINAL_STATES: ReadonlySet<TwinCollaborationState> = new Set([
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
  "CANCELED",
]);

export function Collaboration() {
  const queryClient = useQueryClient();
  // Phase 1285 slice 2 — "Request help" from a person cockpit prefills the
  // form with that teammate (removes the manual target-id friction). We carry
  // the resolved id + display name so the form shows the human name and never
  // re-resolves or exposes the id.
  const [prefill, setPrefill] = useState<{ id: string; name: string } | null>(
    null,
  );
  const inbound = useQuery({
    queryKey: ["otzar", "collaboration", "inbound"],
    queryFn: () => api.otzar.collaboration.inbound(),
  });
  const outbound = useQuery({
    queryKey: ["otzar", "collaboration", "outbound"],
    queryFn: () => api.otzar.collaboration.outbound(),
  });

  function invalidateAll() {
    void queryClient.invalidateQueries({
      queryKey: ["otzar", "collaboration"],
    });
  }

  return (
    <div className="space-y-6" data-testid="collaboration-page" data-l01-surface="true">
      <PageHeader
        title="People & Collaboration"
        description="Who reports to whom, who you can work with, and how to ask for help — without org-wide noise."
      />

      {/* L-01 — AI↔AI collaboration is a governed, fail-closed envelope. */}
      <AiCollabEnvelopeCard />
      {/* L-02 — load / storm / loop protection beyond single envelope. */}
      <AiCollabLoadCard />

      {/* First-use one-shot: structure + people, then collab. Growth is secondary. */}
      <PeopleStructureGlance />

      <PeopleDirectory
        onRequestHelp={(id, name) => {
          setPrefill({ id, name });
          document.getElementById("collab-summary")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <CreateCollaborationForm
        onCreated={invalidateAll}
        {...(prefill !== null ? { prefill } : {})}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card data-testid="inbound-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Inbound — for you</CardTitle>
          </CardHeader>
          <CardContent>
            {inbound.isLoading && <Skeleton className="h-24 w-full" />}
            {inbound.data && inbound.data.ok && (
              <CollaborationList
                items={inbound.data.data.collaborations}
                side="inbound"
                onAction={invalidateAll}
              />
            )}
          </CardContent>
        </Card>
        <Card data-testid="outbound-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Outbound — from you</CardTitle>
          </CardHeader>
          <CardContent>
            {outbound.isLoading && <Skeleton className="h-24 w-full" />}
            {outbound.data && outbound.data.ok && (
              <CollaborationList
                items={outbound.data.data.collaborations}
                side="outbound"
                onAction={invalidateAll}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin growth suggestions — below the fold so first paint stays ADHD-safe. */}
      <details className="rounded-lg border border-border bg-card/40 p-3" data-testid="people-growth-details">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Organization growth suggestions
        </summary>
        <div className="mt-3">
          <DandelionGrowthCard />
        </div>
      </details>
    </div>
  );
}

function CreateCollaborationForm({
  onCreated,
  prefill,
}: {
  onCreated: () => void;
  prefill?: { id: string; name: string };
}) {
  const [safeSummary, setSafeSummary] = useState("");
  const [who, setWho] = useState("");
  const [helpKey, setHelpKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [clarification, setClarification] = useState<{
    question: string;
    candidates: Array<{ entityId: string; displayName: string }>;
  } | null>(null);
  // When "Request help" prefills a teammate from a person card we already have
  // their resolved entity_id + name — lock it so we never re-resolve or expose
  // the id. Editing the "Who" field breaks the lock and re-resolves by name.
  const [locked, setLocked] = useState<{ id: string; name: string } | null>(
    null,
  );
  // L-01 — explicit path: coworker's AI Teammate (EMPLOYEE_TWIN envelope).
  const [targetMode, setTargetMode] = useState<"human" | "ai_teammate">("human");

  useEffect(() => {
    if (prefill !== undefined && prefill.id.length > 0) {
      setWho(prefill.name);
      setLocked({ id: prefill.id, name: prefill.name });
      setTargetMode("human");
    }
  }, [prefill]);

  const create = useMutation({
    mutationFn: (body: CreateCollaborationRequestBody) =>
      api.otzar.collaboration.create(body),
    onSuccess: (result) => {
      if (result.ok) {
        setSafeSummary("");
        setWho("");
        setHelpKey(null);
        setLocked(null);
        setClarification(null);
        setError(null);
        onCreated();
      } else {
        setError(result.message);
      }
    },
  });

  function requestTypeFor(key: string | null): TwinCollaborationRequestType {
    return HELP_CHIPS.find((c) => c.key === key)?.requestType ?? "STATUS_REQUEST";
  }

  // Send through the governed rail. L-01: human vs AI Teammate targets use
  // different Foundation target_type fields; never fabricate ids.
  function send(
    entityId: string | undefined,
    kind: "human" | "ai_teammate" = targetMode,
  ): void {
    const resolved = resolveCollabTarget(
      entityId !== undefined ? { kind, entityId } : { kind },
    );
    const body: CreateCollaborationRequestBody = {
      target_type: resolved.target_type,
      request_type: requestTypeFor(helpKey),
      safe_summary: safeSummary.trim(),
    };
    if (resolved.target_entity_id !== undefined) {
      body.target_entity_id = resolved.target_entity_id;
    }
    if (resolved.target_twin_entity_id !== undefined) {
      body.target_twin_entity_id = resolved.target_twin_entity_id;
    }
    create.mutate(body);
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setClarification(null);
    const summary = safeSummary.trim();
    if (summary.length === 0) {
      setError("Tell Otzar what you need help with.");
      return;
    }
    const name = who.trim();
    // No teammate named — let Otzar find the right person by policy.
    if (name.length === 0) {
      send(undefined, targetMode);
      return;
    }
    // Prefilled from a person card — already resolved; skip the lookup.
    if (locked !== null && locked.name === name) {
      send(locked.id, targetMode);
      return;
    }
    // Resolve the typed name through the governed (employee-safe) resolver.
    setResolving(true);
    const r = await resolveTargetGoverned(name);
    setResolving(false);
    if (
      (r.kind === "RESOLVED_AI_AGENT" || r.kind === "RESOLVED_TWIN") &&
      r.entityId !== undefined
    ) {
      // Resolved to an AI Teammate identity → EMPLOYEE_TWIN envelope (L-01).
      send(r.entityId, "ai_teammate");
      return;
    }
    if (r.kind === "RESOLVED_HUMAN" && r.entityId !== undefined) {
      send(r.entityId, targetMode);
      return;
    }
    if (
      r.kind === "AMBIGUOUS" &&
      r.candidates !== undefined &&
      r.candidates.length > 0
    ) {
      setClarification({
        question: `More than one person matches "${name}". Who do you mean?`,
        candidates: r.candidates,
      });
      return;
    }
    // NOT_FOUND / RUNTIME_MISSING — could be a team/project phrase we can't
    // resolve to a person yet. Never expose an id; ask ONE focused question and
    // offer to let Otzar route it to the right owner.
    setClarification({
      question: `I couldn't find "${name}" as a person yet. Type a coworker's name, or let Otzar route it to the right owner.`,
      candidates: [],
    });
  }

  const pending = create.isPending || resolving;

  return (
    <Card data-testid="create-collaboration-form">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Ask for help</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void submit(e);
          }}
          className="space-y-4"
        >
          <Field label="What do you need help with?" id="collab-summary">
            <textarea
              id="collab-summary"
              data-testid="collab-summary"
              value={safeSummary}
              onChange={(e) => setSafeSummary(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="e.g. I need the launch window confirmed."
            />
          </Field>

          {/* Optional "kind of help" chips — hints, never required. */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Kind of help (optional)
            </span>
            <div
              className="flex flex-wrap gap-2"
              data-testid="collab-help-chips"
            >
              {HELP_CHIPS.map((c) => {
                const active = helpKey === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    data-testid={`collab-chip-${c.key.toLowerCase()}`}
                    aria-pressed={active}
                    onClick={() => setHelpKey(active ? null : c.key)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1" data-testid="collab-target-mode">
            <span className="text-xs font-medium text-muted-foreground">
              Route to (L-01 envelope)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="collab-target-human"
                aria-pressed={targetMode === "human"}
                onClick={() => setTargetMode("human")}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  targetMode === "human"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                Coworker (human)
              </button>
              <button
                type="button"
                data-testid="collab-target-ai-teammate"
                aria-pressed={targetMode === "ai_teammate"}
                onClick={() => setTargetMode("ai_teammate")}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  targetMode === "ai_teammate"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                Coworker&apos;s AI Teammate
              </button>
            </div>
            {targetMode === "ai_teammate" ? (
              <p className="text-[11px] text-muted-foreground" data-testid="collab-ai-target-hint">
                Twin-targeted requests use the AI↔AI envelope — policy, approval,
                and audit apply; never silent.
              </p>
            ) : null}
          </div>

          <Field label="Who should help? (optional)" id="collab-who">
            <input
              id="collab-who"
              data-testid="collab-who"
              value={who}
              onChange={(e) => {
                const next = e.target.value;
                setWho(next);
                // Editing breaks any prefilled lock — re-resolve by name.
                if (locked !== null && next.trim() !== locked.name) {
                  setLocked(null);
                }
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Name a coworker, or leave blank for Otzar to route it"
            />
          </Field>

          {clarification !== null && (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
              data-testid="collab-clarification"
            >
              <p className="text-sm text-amber-900">{clarification.question}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {clarification.candidates.map((c) => (
                  <Button
                    key={c.entityId}
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="collab-clarify-candidate"
                    onClick={() => {
                      setClarification(null);
                      send(c.entityId);
                    }}
                  >
                    {c.displayName}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="collab-clarify-route"
                  onClick={() => {
                    setClarification(null);
                    send(undefined);
                  }}
                >
                  Let Otzar route it
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" data-testid="collab-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending} data-testid="collab-submit">
            {pending ? "Asking Otzar…" : "Ask Otzar"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Otzar will find the right person when it can. If it needs one
            detail, it will ask. Same-team work usually moves without ceremony;
            cross-team or sensitive work asks for approval at the right
            boundary.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function CollaborationList({
  items,
  side,
  onAction,
}: {
  items: CollaborationRequestSafeView[];
  side: "inbound" | "outbound";
  onAction: () => void;
}) {
  if (items.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid={`${side}-empty`}
      >
        Nothing here yet.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-testid={`${side}-list`}>
      {items.map((it) => (
        <CollaborationRow
          key={it.collaboration_id}
          item={it}
          side={side}
          onAction={onAction}
        />
      ))}
    </ul>
  );
}

function CollaborationRow({
  item,
  side,
  onAction,
}: {
  item: CollaborationRequestSafeView;
  side: "inbound" | "outbound";
  onAction: () => void;
}) {
  const accept = useMutation({
    mutationFn: () => api.otzar.collaboration.accept(item.collaboration_id),
    onSuccess: onAction,
  });
  const reject = useMutation({
    mutationFn: () => api.otzar.collaboration.reject(item.collaboration_id),
    onSuccess: onAction,
  });
  const cancel = useMutation({
    mutationFn: () => api.otzar.collaboration.cancel(item.collaboration_id),
    onSuccess: onAction,
  });
  const complete = useMutation({
    mutationFn: () => api.otzar.collaboration.complete(item.collaboration_id),
    onSuccess: onAction,
  });

  const isOpen = !TERMINAL_STATES.has(item.state) && item.state !== "BLOCKED";
  const envelope = classifyEnvelopeState({
    state: item.state,
    blocked_reason: item.blocked_reason,
    requires_approval: item.requires_approval,
    requested_by_ai: item.requested_by_ai,
    has_target_twin: item.has_target_twin,
  });
  const aiToAi = isAiToAiTarget(item.target_type, item.has_target_twin);

  return (
    <li
      className="rounded-md border border-border bg-card px-4 py-3"
      data-testid={`collab-row-${item.collaboration_id}`}
      data-l01-envelope="true"
      data-envelope-outcome={envelope.outcome}
      data-fail-closed={envelope.fail_closed ? "true" : "false"}
      data-ai-to-ai={aiToAi ? "true" : "false"}
      data-requested-by-ai={item.requested_by_ai ? "true" : "false"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{labelState(item.state)}</Badge>
        <Badge variant="outline">{labelTarget(item.target_type)}</Badge>
        <Badge variant="outline">{labelRequest(item.request_type)}</Badge>
        {aiToAi ? (
          <Badge variant="outline" data-testid="collab-ai-to-ai-badge">
            AI Teammate envelope
          </Badge>
        ) : null}
        {item.blocked_reason && (
          <Badge variant="destructive">
            {labelBlocked(item.blocked_reason)}
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground">{item.safe_summary}</p>
      <p
        className="mt-1 text-[11px] text-muted-foreground"
        data-testid="collab-envelope-status"
      >
        {envelope.reason_label} · audited
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Created {formatRelativeTime(item.created_at)}
        {item.completed_at &&
          ` · completed ${formatRelativeTime(item.completed_at)}`}
      </p>
      {side === "inbound" && isOpen && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
            data-testid={`collab-accept-${item.collaboration_id}`}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={reject.isPending}
            onClick={() => reject.mutate()}
            data-testid={`collab-reject-${item.collaboration_id}`}
          >
            Reject
          </Button>
        </div>
      )}
      {side === "outbound" && isOpen && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={complete.isPending}
            onClick={() => complete.mutate()}
            data-testid={`collab-complete-${item.collaboration_id}`}
          >
            Mark complete
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
            data-testid={`collab-cancel-${item.collaboration_id}`}
          >
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}


// Phase 1237 — the Dandelion admin wow card: "Otzar found N ways to
// strengthen your organization this week." Governed recommendations
// only — nothing executes from here; each suggested step routes
// through existing pages. Hidden for non-admins.
// [PROD-UX-BUGD] Hiding a recommendation is SESSION-LOCAL (recommendations
// recompute server-side and reappear next visit) — the control is labeled
// "Hide for now" so it never reads as a durable dismiss. Keyed by the stable
// person id when the server provides one (duplicate-name safe), else title.
function growthRecKey(r: { kind: string; title: string; context?: { person_entity_id: string } }): string {
  return r.context !== undefined ? `${r.kind}:${r.context.person_entity_id}` : r.title;
}

// [PROD-UX-ASSIGN] Human copy for assignment failures — never a raw code.
function assignErrorCopy(code: string): string {
  switch (code) {
    case "PERSON_NOT_IN_ORG":
      return "That person isn't an active member of your organization anymore.";
    case "TARGET_NOT_FOUND":
      return "That project or workspace no longer exists.";
    case "TARGET_NOT_ACTIVE":
    case "PROJECT_ARCHIVED":
      return "That destination isn't active anymore — pick another one.";
    default:
      return "Otzar couldn't complete the assignment — please try again.";
  }
}

// [PROD-UX-ASSIGN] The in-place fix for a NEEDS_PROJECT_OR_WORKSPACE gap:
// pick an org project/workspace and assign the person through the governed
// rails. Uses STABLE ids end-to-end (person_entity_id from the server
// context; target_id from the admin picker feed). On success the growth
// query is invalidated and the card disappears only when the SERVER
// recompute drops it — the truth changed; nothing is hidden optimistically.
function AssignFromRecommendation({
  personEntityId,
  personLabel,
}: {
  personEntityId: string;
  personLabel: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const targets = useQuery({
    queryKey: ["org", "assignment-targets"],
    queryFn: () => api.org.assignmentTargets(),
    enabled: open,
  });
  const assign = useMutation({
    mutationFn: (input: { target_kind: "project" | "workspace"; target_id: string }) =>
      api.org
        .assign({ person_entity_id: personEntityId, ...input })
        .then((r) => {
          if (r.ok && r.data.ok) return r.data;
          throw new Error((!r.ok ? r.code : r.data.code) ?? "ASSIGN_FAILED");
        }),
    onSuccess: () => {
      // The truth changed — let the server recompute decide the card's fate.
      void queryClient.invalidateQueries({ queryKey: ["otzar", "dandelion", "org-growth"] });
    },
  });

  const rows: AssignmentTarget[] =
    targets.data?.ok === true && targets.data.data.ok ? (targets.data.data.targets ?? []) : [];
  const projects = rows.filter((t) => t.kind === "project");
  const workspaces = rows.filter((t) => t.kind === "workspace");

  if (assign.isSuccess) {
    return (
      <p
        className="mt-2 rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px]"
        data-testid="dandelion-assign-success"
      >
        ✓ Assigned. Recorded in your organization's audit trail — this
        recommendation will clear as Otzar updates the org picture.
      </p>
    );
  }

  return (
    <div className="mt-2">
      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          data-testid="dandelion-assign-open"
        >
          Assign project/workspace
        </Button>
      ) : (
        <div className="rounded border border-border bg-muted/30 p-2" data-testid="dandelion-assign-picker">
          <p className="text-[11px] font-medium">Choose where {personLabel} should start.</p>
          <p className="text-[10px] text-muted-foreground">
            Otzar will connect their work context and update this
            recommendation after assignment.
          </p>
          {targets.isLoading ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Loading projects and workspaces…</p>
          ) : rows.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground" data-testid="dandelion-assign-empty">
              No active projects or workspaces yet. Create or activate a
              project/workspace first.
            </p>
          ) : (
            <div className="mt-1 space-y-1">
              {projects.length > 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Projects</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {projects.map((t) => (
                      <Button
                        key={t.target_id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={assign.isPending}
                        onClick={() => assign.mutate({ target_kind: "project", target_id: t.target_id })}
                        data-testid="dandelion-assign-target"
                        data-target-kind="project"
                        data-target-id={t.target_id}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {workspaces.length > 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Workspaces</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {workspaces.map((t) => (
                      <Button
                        key={t.target_id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={assign.isPending}
                        onClick={() => assign.mutate({ target_kind: "workspace", target_id: t.target_id })}
                        data-testid="dandelion-assign-target"
                        data-target-kind="workspace"
                        data-target-id={t.target_id}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {assign.isPending ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Assigning…</p>
          ) : null}
          {assign.isError ? (
            <p
              className="mt-1 rounded border border-rose-400/40 bg-rose-500/5 p-1.5 text-[11px] text-rose-700 dark:text-rose-400"
              role="alert"
              data-testid="dandelion-assign-error"
            >
              {assignErrorCopy(assign.error instanceof Error ? assign.error.message : "")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DandelionGrowthCard(): JSX.Element | null {
  const { capabilities } = useAuthStore();
  const admin = isOrgAdmin(capabilities);
  const growth = useQuery({
    queryKey: ["otzar", "dandelion", "org-growth"],
    queryFn: () => api.otzar.dandelionOrgGrowth(),
    enabled: admin,
  });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [queueOpen, setQueueOpen] = useState(false);

  if (!admin) return null;
  if (!growth.data || !growth.data.ok) return null;
  const view = growth.data.data.growth;
  const visible = view.recommendations.filter(
    (r) => !hidden.has(growthRecKey(r)),
  );

  // [GAP-B] The truthful full setup queue. The card list is capped for calm;
  // the SCALE must never be. People with a card in the capped list (hidden or
  // not — "Hide for now" is session-local and never changes the truth) are
  // excluded from the overflow queue by stable id; everyone else with no
  // first project/workspace renders below, server-backed, with the same
  // real assign rail. No card count math — the uncapped signal is the truth.
  const cardPersonIds = new Set(
    view.recommendations
      .filter((r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE" && r.context !== undefined)
      .map((r) => r.context?.person_entity_id ?? ""),
  );
  const totalNeeds = view.signals.members_without_project_count;
  const queuePeople = (view.needs_first_project_people ?? []).filter(
    (p) => !cardPersonIds.has(p.person_entity_id),
  );

  return (
    <Card data-testid="dandelion-growth-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sprout className="h-4 w-4" aria-hidden /> Help your organization
          grow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p
          className="text-muted-foreground"
          data-testid="dandelion-growth-headline"
        >
          {view.headline}
        </p>
        {visible.length > 0 ? (
          <ul className="space-y-1" data-testid="dandelion-growth-list">
            {visible.map((rec) => (
              <li
                key={growthRecKey(rec)}
                className="rounded border bg-card p-2"
                data-testid="dandelion-growth-item"
                data-kind={rec.kind}
                data-person-entity-id={
                  rec.kind === "NEEDS_PROJECT_OR_WORKSPACE"
                    ? rec.context?.person_entity_id
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{rec.title}</p>
                    <p className="text-muted-foreground">{rec.why}</p>
                    <p className="mt-1 text-muted-foreground">
                      Next step: {rec.suggested_next_step}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setHidden((prev) => new Set([...prev, growthRecKey(rec)]))
                    }
                    data-testid="dandelion-growth-dismiss"
                  >
                    Hide for now
                  </Button>
                </div>
                {/* [PROD-UX-ASSIGN] Fix the gap IN PLACE: assign the person to
                    a project/workspace. Only on cards that name this gap AND
                    carry the stable person id. Assignment is a durable truth
                    change (the card disappears on server recompute); "Hide for
                    now" above stays the separate, session-local verb. */}
                {rec.kind === "NEEDS_PROJECT_OR_WORKSPACE" && rec.context !== undefined ? (
                  <AssignFromRecommendation
                    personEntityId={rec.context.person_entity_id}
                    personLabel={rec.people[0] ?? "this person"}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {queuePeople.length > 0 ? (
          <div className="rounded border border-border bg-muted/20 p-2">
            <p data-testid="dandelion-queue-copy">
              Showing {cardPersonIds.size} of {totalNeeds} people who need a
              first project or workspace.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-6 px-2 text-[11px]"
              onClick={() => setQueueOpen((o) => !o)}
              data-testid="dandelion-queue-toggle"
            >
              {queueOpen
                ? "Hide the rest"
                : `Show the ${queuePeople.length} more`}
            </Button>
            {queueOpen ? (
              <ul className="mt-1 space-y-1" data-testid="dandelion-queue">
                {queuePeople.map((p) => (
                  <li
                    key={p.person_entity_id}
                    className="rounded border bg-card p-2"
                    data-testid="dandelion-queue-item"
                    data-person-entity-id={p.person_entity_id}
                  >
                    <p className="font-medium text-foreground">
                      {p.display_name} needs a first project or workspace
                    </p>
                    <AssignFromRecommendation
                      personEntityId={p.person_entity_id}
                      personLabel={p.display_name}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          Suggestions only — nothing happens without you. Private to your
          organization.
        </p>
      </CardContent>
    </Card>
  );
}
