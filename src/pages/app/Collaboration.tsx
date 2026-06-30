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
import { Sprout } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { api } from "@/lib/api";
import { resolveTargetGoverned } from "@/lib/work-os/target-resolution";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
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
      return "A coworker's Twin";
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
    <div className="space-y-6">
      <PageHeader
        title="People & Collaboration"
        description="See the teammates in your org, then ask coworkers, coworker Twins, teams, and projects for help. Same-project / same-team work usually moves without ceremony; cross-team or sensitive work asks for approval at the right boundary. Otzar helps the right people stay connected to the right work — without the noise."
      />

      {/* Phase 1237 — Dandelion org-growth intelligence (admins). */}
      <DandelionGrowthCard />

      {/* Phase 1216 -- People directory at the top of the surface
          so the operator can see WHO they can collaborate with
          before opening the request form. */}
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

  useEffect(() => {
    if (prefill !== undefined && prefill.id.length > 0) {
      setWho(prefill.name);
      setLocked({ id: prefill.id, name: prefill.name });
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

  // Send through the governed rail. target_type stays EMPLOYEE; when no entity
  // is resolved we send NO id and let org policy route — that's Otzar's job,
  // never a human typing an entity/project/team id, never a fabricated target.
  function send(entityId: string | undefined): void {
    const body: CreateCollaborationRequestBody = {
      target_type: "EMPLOYEE",
      request_type: requestTypeFor(helpKey),
      safe_summary: safeSummary.trim(),
    };
    if (entityId !== undefined) body.target_entity_id = entityId;
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
      send(undefined);
      return;
    }
    // Prefilled from a person card — already resolved; skip the lookup.
    if (locked !== null && locked.name === name) {
      send(locked.id);
      return;
    }
    // Resolve the typed name through the governed (employee-safe) resolver.
    setResolving(true);
    const r = await resolveTargetGoverned(name);
    setResolving(false);
    if (
      (r.kind === "RESOLVED_HUMAN" ||
        r.kind === "RESOLVED_AI_AGENT" ||
        r.kind === "RESOLVED_TWIN") &&
      r.entityId !== undefined
    ) {
      send(r.entityId);
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

  return (
    <li
      className="rounded-md border border-border bg-card px-4 py-3"
      data-testid={`collab-row-${item.collaboration_id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{labelState(item.state)}</Badge>
        <Badge variant="outline">{labelTarget(item.target_type)}</Badge>
        <Badge variant="outline">{labelRequest(item.request_type)}</Badge>
        {item.blocked_reason && (
          <Badge variant="destructive">
            {labelBlocked(item.blocked_reason)}
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground">{item.safe_summary}</p>
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
// through existing pages. Hidden for non-admins; dismissals are
// local to the session (recommendations recompute server-side).
function DandelionGrowthCard(): JSX.Element | null {
  const { capabilities } = useAuthStore();
  const admin = isOrgAdmin(capabilities);
  const growth = useQuery({
    queryKey: ["otzar", "dandelion", "org-growth"],
    queryFn: () => api.otzar.dandelionOrgGrowth(),
    enabled: admin,
  });
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  if (!admin) return null;
  if (!growth.data || !growth.data.ok) return null;
  const view = growth.data.data.growth;
  const visible = view.recommendations.filter(
    (r) => !dismissed.has(r.title),
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
                key={rec.title}
                className="rounded border bg-card p-2"
                data-testid="dandelion-growth-item"
                data-kind={rec.kind}
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
                      setDismissed((prev) => new Set([...prev, rec.title]))
                    }
                    data-testid="dandelion-growth-dismiss"
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          Suggestions only — nothing happens without you. Private to your
          organization.
        </p>
      </CardContent>
    </Card>
  );
}
