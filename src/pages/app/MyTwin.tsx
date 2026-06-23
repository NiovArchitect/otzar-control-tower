// FILE: MyTwin.tsx
// PURPOSE: Employee "My Twin" surface -- the caller's own aligned AI
//          teammate identity from GET /otzar/my-twin (self-scoped,
//          read-only). Product-safe projection only: it never renders
//          the raw twin_id, role_template body, capability flags, bridge
//          ids, or any memory/capsule/vector data.
// CONNECTS TO: api.otzar.myTwin, conversation label helpers.
//
// The query fn returns the ApiResult as-is (never throws) so the page
// can branch on status/code: 404 TWIN_NOT_FOUND -> empty state, 403 ->
// not permitted, otherwise -> retryable error. 401 is handled globally
// (api.ts onUnauthorized -> logout).

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleScopeProfilePanel } from "@/components/employee/RoleScopeProfilePanel";
import { TwinScopePanel } from "@/components/employee/TwinScopePanel";
import { MyTwinSidecarsPanel } from "@/components/employee/MyTwinSidecarsPanel";
import { api } from "@/lib/api";
import type { ApiResult } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  labelAutonomyMode,
  labelConversationStatus,
} from "@/lib/labels/conversation";
import type {
  MyTwinResponse,
  ConversationMessageResponse,
  SemanticRetrievalResultView,
} from "@/lib/types/foundation";
import { classifyAskTwin, COLLABORATION_ROUTE } from "@/lib/work-os/ask-twin";
import { entityLabel } from "@/lib/identity/canonical-entity";

export function MyTwin() {
  const query = useQuery({
    queryKey: ["otzar", "my-twin"],
    queryFn: () => api.otzar.myTwin(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Twin"
        description="Your aligned AI teammate. Its identity, behavior mode, and the skills it can use on your behalf."
      />

      {(query.isLoading || query.data === undefined) && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {query.data && !query.data.ok && (
        <MyTwinError
          result={query.data}
          onRetry={() => void query.refetch()}
        />
      )}

      {query.data && query.data.ok && <MyTwinPanel data={query.data.data} />}
    </div>
  );
}

function MyTwinError({
  result,
  onRetry,
}: {
  result: ApiResult<MyTwinResponse>;
  onRetry: () => void;
}) {
  if (result.ok) return null;
  if (result.status === 404 || result.code === "TWIN_NOT_FOUND") {
    return (
      <Card>
        <CardContent
          className="py-6 text-sm text-muted-foreground"
          data-testid="my-twin-empty"
        >
          No AI teammate assigned yet.
        </CardContent>
      </Card>
    );
  }
  if (result.status === 403 || result.code === "OPERATION_NOT_PERMITTED") {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          You don't have access to an AI teammate view.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-3 py-6 text-sm">
        <p className="text-destructive">{result.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function MyTwinPanel({ data }: { data: MyTwinResponse }) {
  const t = data.twin;
  return (
    <div className="space-y-4">
      {data.has_multiple_twins && (
        <div
          className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          role="note"
        >
          You have multiple assigned AI teammates. This page currently shows
          your primary teammate.
        </div>
      )}

      <Card data-testid="my-twin-card">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{t.display_name}</CardTitle>
            <Badge>{labelConversationStatus(t.status)}</Badge>
          </div>
          {t.role_title && (
            <p className="text-sm text-muted-foreground">{t.role_title}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Behavior mode" value={labelAutonomyMode(t.autonomy_mode)} />
            <Field
              label="Team coordination setting"
              value={t.swarm_enabled ? "Enabled" : "Not enabled"}
            />
            {t.approver && (
              <Field label="Approver" value={t.approver.display_name} />
            )}
            <Field label="Added" value={formatRelativeTime(t.created_at)} />
            <Field
              label="Last updated"
              value={formatRelativeTime(t.updated_at)}
            />
          </dl>

          <p className="text-xs text-muted-foreground">
            Team collaboration is not active yet.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Skills</p>
            {t.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skills assigned yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" data-testid="my-twin-skills">
                {t.skills.map((s) => (
                  <span
                    key={`${s.name}-${s.category}`}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                  >
                    {s.name} · {s.category}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AskYourTwin />

      <RoleScopeProfilePanel profile={t.role_scope_profile ?? null} />

      {/* [OTZAR-V1-LIVE-2B] The governed "what your Twin can — and cannot — do"
          scope view, sourced from Foundation's context-health. */}
      <TwinScopePanel />

      <MyTwinSidecarsPanel twin={t} />
    </div>
  );
}

// WHAT: the "Ask your Twin" box (Phase 1285-R). Self-scoped, governed, honest.
//   - A known Work OS question routes to its durable surface (no LLM).
//   - A question aimed at someone else's Twin is disabled-honest (Otzar will
//     not answer for or impersonate another person's Twin; offers Collaboration).
//   - A genuine self question calls the EXISTING governed conductSession
//     endpoint (COE permission-scoped + audited) and renders the answer with
//     scoped-context labeling + transparency + provenance. No frontend-only LLM.
type AskState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "answered"; data: ConversationMessageResponse; question: string }
  | { phase: "other_twin"; target: string | null }
  | { phase: "error"; message: string };

function AskYourTwin(): JSX.Element {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [state, setState] = useState<AskState>({ phase: "idle" });

  async function ask(): Promise<void> {
    const question = text.trim();
    if (question.length === 0) return;
    // Clear the input immediately on submit so the box doesn't keep the
    // just-sent text sitting in it. The answer view renders state.question.
    setText("");
    const classified = classifyAskTwin(question);

    if (classified.kind === "WORK_OS_ROUTE") {
      // Deterministic: known Work OS question goes to its real surface.
      navigate(classified.route);
      return;
    }
    if (classified.kind === "OTHER_TWIN") {
      // Disabled-honest: never answer for or impersonate someone else's Twin.
      setState({ phase: "other_twin", target: classified.target });
      return;
    }

    // Self question: governed backend over the caller's own scoped context.
    setState({ phase: "loading" });
    const result = await api.otzar.conversation.message({ message: question });
    if (!result.ok) {
      if (import.meta.env.DEV) {
        console.debug(
          "[AskYourTwin] conversation.message failed",
          result.code,
          result.status,
        );
      }
      setState({ phase: "error", message: humanizeAskError(result.code) });
      return;
    }
    setState({ phase: "answered", data: result.data, question });
  }

  return (
    <Card data-testid="ask-your-twin">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ask your Twin</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your Twin acts under your authority. It can answer from your allowed
          context and route governed work to teammates or their Twins under
          company policy.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask();
            }}
            placeholder="Ask your Twin about your work..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            data-testid="ask-your-twin-input"
          />
          <Button
            type="button"
            onClick={() => void ask()}
            disabled={state.phase === "loading" || text.trim().length === 0}
            data-testid="ask-your-twin-submit"
          >
            {state.phase === "loading" ? "Asking..." : "Ask"}
          </Button>
        </div>

        {state.phase === "loading" ? (
          <p className="text-sm text-muted-foreground" data-testid="ask-your-twin-loading">
            Your Twin is checking your governed context...
          </p>
        ) : null}

        {state.phase === "other_twin" ? (
          <div
            className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm"
            data-testid="ask-your-twin-other"
          >
            <p className="text-amber-700 dark:text-amber-400">
              Otzar will not answer for{" "}
              {state.target !== null ? `${state.target}'s` : "someone else's"} Twin
              or speak on their behalf. You can ask Otzar to create a governed
              request instead.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(COLLABORATION_ROUTE)}
              data-testid="ask-your-twin-collaboration"
            >
              Go to Collaboration
            </Button>
          </div>
        ) : null}

        {state.phase === "error" ? (
          <p
            className="rounded-md border border-rose-400/40 bg-rose-500/5 p-3 text-sm text-rose-700 dark:text-rose-400"
            role="alert"
            data-testid="ask-your-twin-error"
          >
            {state.message}
          </p>
        ) : null}

        {state.phase === "answered" ? (
          <>
            <AskAnswer data={state.data} />
            <RelatedWorkPanel query={state.question} autoFind={isLowContext(state.data)} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

// WHAT: a non-blocking, button-triggered "Find related work" panel rendered
//   UNDER a governed self-Ask answer. It calls the Foundation-scoped semantic
//   retrieval (Phase 1285-W) — Foundation assembles + validates the candidates;
//   Python only reranks the allowed set. Read-only: creates nothing, sends
//   nothing, approves nothing. The governed answer above is never replaced. No
//   raw UUID as a primary label.
type RelatedState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "loaded"; results: SemanticRetrievalResultView[]; advisory: boolean; status: string }
  | { phase: "error" };

// WHAT: did the governed answer come back with little/no scoped memory?
// WHY: Phase 1287-C — when the Twin found nothing (or one item), we AUTO-run the
//      scoped, Foundation-validated related-work retrieval so the Twin does not
//      feel unaware of recent product/work state. Honest: this never fakes the
//      governed answer; it only surfaces related scoped work that exists.
function isLowContext(data: ConversationMessageResponse): boolean {
  const t = data.transparency;
  if (t === undefined) return true;
  return t.retrieval_status === "NO_MATCHES" || t.context_items_used <= 1;
}

function RelatedWorkPanel({ query, autoFind = false }: { query: string; autoFind?: boolean }): JSX.Element {
  const navigate = useNavigate();
  const [state, setState] = useState<RelatedState>({ phase: "idle" });

  async function find(): Promise<void> {
    setState({ phase: "loading" });
    const r = await api.workOs.semanticRetrievalQuery({ query, limit: 5 });
    if (!r.ok) {
      setState({ phase: "error" });
      return;
    }
    const env = r.data.envelope;
    const advisory =
      env?.authority === "FOUNDATION_VALIDATED" && (env?.provenance ?? "").startsWith("python:");
    setState({
      phase: "loaded",
      results: r.data.results ?? [],
      advisory,
      status: env?.status ?? "UNKNOWN",
    });
  }

  // Phase 1287-C — on a low-context governed answer, automatically run the
  // scoped related retrieval (non-blocking) so the Twin surfaces related work
  // instead of feeling unaware. Manual "Find related work" stays for the rest.
  useEffect(() => {
    if (autoFind) void find();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm" data-testid="ask-related-work">
      {state.phase === "idle" ? (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs"
          data-testid="ask-related-find"
          onClick={() => void find()}
        >
          Find related work
        </button>
      ) : null}
      {state.phase === "loading" ? (
        <p className="text-xs text-muted-foreground" data-testid="ask-related-loading">
          Finding related work in your scoped context...
        </p>
      ) : null}
      {state.phase === "error" ? (
        <p className="text-xs text-amber-700 dark:text-amber-400" data-testid="ask-related-error">
          Couldn't find related work right now.
        </p>
      ) : null}
      {state.phase === "loaded" ? (
        <div className="space-y-2" data-testid="ask-related-results">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Related work</span>
            <Badge variant="outline" className="text-[9px] text-muted-foreground" data-testid="ask-related-label">
              {state.advisory ? "Advisory rerank, validated by Foundation" : "Related work, Foundation-scoped"}
            </Badge>
          </div>
          {state.results.length === 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="ask-related-empty">
              No related work found in your scoped context.
            </p>
          ) : (
            <ul className="space-y-1.5" data-testid="ask-related-list">
              {state.results.map((res) => {
                const person =
                  res.related_person !== null ? entityLabel(res.related_person.display_name) : null;
                return (
                  <li
                    key={res.result_id}
                    className="rounded border border-border bg-background/70 p-2 text-xs"
                    data-testid="ask-related-item"
                    data-result-type={res.result_type}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{res.title}</div>
                        {res.summary !== null && res.summary.length > 0 ? (
                          <div className="text-[11px] text-muted-foreground">{res.summary}</div>
                        ) : null}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {res.result_type.replace(/_/g, " ").toLowerCase()}
                          {person !== null ? ` · with ${person}` : ""}
                          {res.score > 0 ? ` · relevance ${res.score}` : ""}
                        </div>
                        {res.reason.length > 0 ? (
                          <div className="text-[10px] italic text-muted-foreground">{res.reason}</div>
                        ) : null}
                      </div>
                      {res.route.length > 0 ? (
                        <button
                          type="button"
                          className="shrink-0 rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
                          data-testid="ask-related-open"
                          onClick={() => navigate(res.route)}
                        >
                          Open
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[9px] italic text-muted-foreground" data-testid="ask-related-provenance">
            {state.advisory
              ? "Advisory rerank by Python, validated by Foundation."
              : "Deterministic Foundation retrieval."}{" "}
            Scoped to what you can see. Analysis {state.status.toLowerCase()}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// WHAT: render a governed self-Ask answer with honest labeling, transparency,
//   and provenance. Never a raw UUID as a primary label; body/envelope stay
//   governed at Foundation. Approval-gated proposals are shown as proposals.
function AskAnswer({ data }: { data: ConversationMessageResponse }): JSX.Element {
  const t = data.transparency;
  const provenance = data.context_provenance ?? [];
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3" data-testid="ask-your-twin-answer">
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
        {data.response}
      </p>
      <p className="text-[11px] text-muted-foreground" data-testid="ask-your-twin-attribution">
        Answered by your Twin from your governed context.
      </p>

      {data.approval_required ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400" data-testid="ask-your-twin-approval">
          This would need your approval before anything happens. Nothing has been
          done yet.
        </p>
      ) : null}
      {data.proposed_action ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Otzar drafted a proposed action. Review and approve it in Action
          Center. Nothing was sent.
        </p>
      ) : null}

      {t !== undefined ? (
        <p className="text-[11px] text-muted-foreground" data-testid="ask-your-twin-transparency">
          Used {t.context_items_used} context item
          {t.context_items_used === 1 ? "" : "s"}
          {t.access_limited ? " (some context was outside your access)" : ""}
          {t.retrieval_status === "NO_MATCHES"
            ? ". No matching memory was found."
            : ""}
        </p>
      ) : null}

      {provenance.length > 0 ? (
        <div className="space-y-1" data-testid="ask-your-twin-provenance">
          <p className="text-[11px] font-medium text-muted-foreground">
            Context used
          </p>
          <ul className="space-y-0.5">
            {provenance.map((p, i) => (
              <li
                key={`${p.context_id}-${i}`}
                className="text-[11px] text-muted-foreground"
                data-scope={p.scope}
              >
                {p.title !== null && p.title.length > 0 ? p.title : "Untitled context"}
                {" · "}
                {p.scope.toLowerCase()}
                {p.content_available ? "" : " (not shown)"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function humanizeAskError(code: string): string {
  switch (code) {
    case "NETWORK_ERROR":
      return "Couldn't reach your Twin just now. Check your connection and try again.";
    case "SESSION_EXPIRED":
    case "SESSION_INVALID":
    case "SESSION_INVALIDATED":
    case "SESSION_REVOKED":
    case "OPERATION_NOT_PERMITTED":
      return "Your session needs to be refreshed. Please sign out and back in.";
    default:
      return "Your Twin couldn't answer that just now. Please try again in a moment.";
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
