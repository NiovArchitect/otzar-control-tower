// FILE: Chat.tsx
// PURPOSE: The employee conversation surface. Sends turns to the real
//          POST /otzar/conversation/message and renders the assistant
//          response. Conversation history is HELD IN COMPONENT STATE
//          for Phase 1 -- there is no durable conversation-list route
//          yet, and the UI says so plainly. Close summarizes the
//          conversation to memory via POST /otzar/conversation/close.
// CONNECTS TO: api.otzar.conversation.{message,close}.
//
// HONESTY GUARDRAILS:
//   - Renders only the assistant's text reply + transparency counters
//     (context_used, tokens_consumed). Never claims a task was done or
//     that Otzar acted in an external tool.
//   - No audit link (these endpoints return no audit_event_id).

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { TransparencyPanel } from "@/components/employee/TransparencyPanel";
import { buildConductRequest, newRequestId } from "@/lib/otzar/conduct-request";
import { useContinuityStore, nextRecoveryAction } from "@/lib/stores/continuity";
import type {
  ChatTransparency,
  ContextProvenanceItem,
  CorrectionRequest,
} from "@/lib/types/foundation";

interface ChatTurn {
  role: "you" | "teammate";
  text: string;
}

interface CloseSummary {
  topics: string[];
}

function errorCopy(code: string, status: number, message: string): string {
  if (status === 503 || code === "LLM_UNAVAILABLE") {
    return "Otzar is temporarily unavailable (the language model didn't respond). Please try again.";
  }
  if (status === 413 || code === "TOKEN_BUDGET_EXCEEDED") {
    return "That message is too large for the current context budget. Try a shorter message.";
  }
  if (status === 403 || code === "OPERATION_NOT_PERMITTED") {
    return "You don't have permission to use this conversation.";
  }
  return message || "Something went wrong. Please try again.";
}

export function Chat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    context_used: number;
    tokens_consumed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeSummary, setCloseSummary] = useState<CloseSummary | null>(null);
  const [transparency, setTransparency] = useState<ChatTransparency | null>(
    null,
  );
  const [provenance, setProvenance] = useState<ContextProvenanceItem[]>([]);
  // Transparency is QUIET by default -- a small optional control reveals
  // the panel on demand. Otzar keeps the work moving; transparency stays
  // out of the way until the employee asks for it.
  const [showTransparencyDetails, setShowTransparencyDetails] =
    useState(false);
  // Wave 2C: inline "Correct this conversation" affordance. Visible only
  // while a conversationId is active so the correction can be linked to
  // the right conversation. Distinct from the standalone Corrections page
  // (which has no conversation context and continues to omit
  // conversation_id).
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionIncorrect, setCorrectionIncorrect] = useState("");
  const [correctionCorrect, setCorrectionCorrect] = useState("");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [correctionSubmitted, setCorrectionSubmitted] = useState(false);

  // [OTZAR-CONTINUITY §11] The pending submission's stable idempotency key + payload,
  // retained so a RETRY reuses the SAME request_id — a response-lost retry replays the
  // durable server result instead of creating a second turn. Cleared on success.
  const pendingRef = useRef<{ message: string; requestId: string; history: string[] } | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  // [OTZAR-CONTINUITY C6-CT] Server-authoritative restoration. The SERVER decides the active
  // thread + its turns; localStorage is never the authority. On mount, restore from the
  // server; when a durable active thread + its turns arrive AND this view is still fresh
  // (no local optimistic turns yet), hydrate from the server. Never invent a thread.
  const bootstrapRestore = useContinuityStore((s) => s.bootstrapRestore);
  const adoptActiveConversation = useContinuityStore((s) => s.adoptActiveConversation);
  const activeConversationId = useContinuityStore((s) => s.activeConversationId);
  const restoredTurns = useContinuityStore((s) => s.restoredTurns);
  const hydration = useContinuityStore((s) => s.hydration);
  const markPending = useContinuityStore((s) => s.markPending);
  const clearPending = useContinuityStore((s) => s.clearPending);
  const loadPending = useContinuityStore((s) => s.loadPending);
  const reconcileByClient = useContinuityStore((s) => s.reconcileByClient);
  const hydratedRef = useRef(false);

  useEffect(() => {
    void bootstrapRestore();
  }, [bootstrapRestore]);

  // [OTZAR-CONTINUITY C6-CT CHUNK 2] Response-loss + multi-tab recovery. If a prior
  // submission was left pending (persisted across reload), reconcile it with the SERVER
  // by (conversation_id, client_request_id) using bounded backoff. On completion, re-hydrate
  // the thread from the server (authoritative — converges two tabs, no duplicate). Never
  // auto-resubmit; a retryable failure surfaces a Retry that reuses the SAME request_id.
  useEffect(() => {
    const pending = loadPending();
    if (pending === null) return;
    let cancelled = false;
    let attempt = 0;
    const poll = async (): Promise<void> => {
      if (cancelled) return;
      const status = await reconcileByClient(pending.conversation_id, pending.client_request_id);
      if (cancelled) return;
      const action = nextRecoveryAction(status);
      if (action === "render_canonical") {
        const detail = await api.otzar.threads.detail(pending.conversation_id);
        if (cancelled) return;
        if (detail.ok) {
          hydratedRef.current = true;
          setConversationId(pending.conversation_id);
          setTurns(detail.data.turns.map((t) => ({ role: t.role === "ASSISTANT" ? ("teammate" as const) : ("you" as const), text: t.content })));
        }
        clearPending();
        return;
      }
      if (action === "offer_retry") {
        pendingRef.current = { message: pending.message, requestId: pending.client_request_id, history: [] };
        setConversationId(pending.conversation_id);
        setCanRetry(true);
        setError("Your last message didn't finish. Retry?");
        clearPending();
        return;
      }
      if (action === "final_failure" || action === "gone") {
        clearPending();
        return;
      }
      // keep_polling — bounded backoff + jitter; stop after a bounded number of attempts.
      attempt += 1;
      if (attempt > 8) return; // bounded; leave pending for a later deliberate reload
      const delay = Math.min(500 * 2 ** attempt, 8000) + Math.floor(Math.random() * 250);
      window.setTimeout(() => void poll(), delay);
    };
    void poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Hydrate exactly once, only when the server returned an active thread and the user
    // hasn't started a local exchange (no optimistic turns) — server wins over stale local.
    if (hydratedRef.current) return;
    if (hydration !== "restored" || activeConversationId === null) return;
    if (turns.length > 0 || conversationId !== null) return;
    hydratedRef.current = true;
    setConversationId(activeConversationId);
    setTurns(
      restoredTurns.map((t) => ({
        role: t.role === "ASSISTANT" ? ("teammate" as const) : ("you" as const),
        text: t.content,
      })),
    );
  }, [hydration, activeConversationId, restoredTurns, turns.length, conversationId]);

  // Core: send one turn with a fixed request_id. Never appends the user turn (the caller
  // does the optimistic append once); a retry reuses the same id and re-posts only.
  async function postTurn(message: string, requestId: string, history: string[]): Promise<void> {
    setError(null);
    setCanRetry(false);
    setCloseSummary(null);
    setShowTransparencyDetails(false);
    setSending(true);
    const body = buildConductRequest({ message, requestId, conversationId, conversationHistory: history });
    // [C6-CT CHUNK 2] On an ESTABLISHED thread, persist the pending logical-submission
    // identity BEFORE the call so a lost response (reload / other tab) can be reconciled
    // with the server by (conversation_id, client_request_id). A brand-new thread has no
    // server conversation_id yet → the in-memory retry (pendingRef) covers its first turn.
    if (conversationId !== null) {
      markPending({ conversation_id: conversationId, client_request_id: requestId, message });
    }
    const result = await api.otzar.conversation.message(body);
    setSending(false);

    if (!result.ok) {
      // Retain the pending submission so the user can retry with the SAME request_id. The
      // persisted pending identity (above) also lets a reload reconcile with the server.
      pendingRef.current = { message, requestId, history };
      setCanRetry(true);
      setError(errorCopy(result.code, result.status, result.message));
      return;
    }
    pendingRef.current = null;
    clearPending(); // durable result received → nothing to reconcile
    setConversationId(result.data.conversation_id);
    // Keep the server-authoritative store in sync with the thread this turn resolved to.
    adoptActiveConversation(result.data.conversation_id);
    hydratedRef.current = true; // a live exchange exists; don't re-hydrate over it
    setMeta({
      context_used: result.data.context_used,
      tokens_consumed: result.data.tokens_consumed,
    });
    setTransparency(result.data.transparency ?? null);
    setProvenance(result.data.context_provenance ?? []);
    setTurns((prev) => [...prev, { role: "teammate", text: result.data.response }]);
  }

  async function send(): Promise<void> {
    const message = input.trim();
    if (message.length === 0 || sending) return;
    const history = turns.map((t) => t.text);
    setTurns((prev) => [...prev, { role: "you", text: message }]);
    setInput("");
    await postTurn(message, newRequestId(), history);
  }

  // Retry the last failed submission with its ORIGINAL request_id (idempotent — the
  // server replays the durable result if the first attempt actually landed).
  async function retry(): Promise<void> {
    const p = pendingRef.current;
    if (p === null || sending) return;
    await postTurn(p.message, p.requestId, p.history);
  }

  async function close(): Promise<void> {
    if (conversationId === null || closing) return;
    setError(null);
    setClosing(true);
    const result = await api.otzar.conversation.close({
      conversation_id: conversationId,
      conversation_history: turns.map((t) => t.text),
    });
    setClosing(false);
    if (!result.ok) {
      setError(errorCopy(result.code, result.status, result.message));
      return;
    }
    setCloseSummary({ topics: result.data.topics });
    // Start fresh: a new message begins a new conversation.
    setConversationId(null);
    setMeta(null);
    setTransparency(null);
    setProvenance([]);
    setShowTransparencyDetails(false);
    setTurns([]);
    // Tear down the inline correction affordance too — a new conversation
    // starts a fresh correction context.
    setCorrectionOpen(false);
    setCorrectionIncorrect("");
    setCorrectionCorrect("");
    setCorrectionError(null);
    setCorrectionSubmitted(false);
  }

  // WHAT: Map a non-ok correction-submit result to safe customer copy.
  function correctionSubmitErrorCopy(code: string, status: number): string {
    if (status === 403 || code === "NOT_CONVERSATION_OWNER") {
      return "This correction is not available under your current access.";
    }
    if (status === 404 || code === "CONVERSATION_NOT_FOUND") {
      return "Conversation not found.";
    }
    return "Could not submit correction.";
  }

  async function submitCorrection(): Promise<void> {
    if (correctionSubmitting) return;
    if (conversationId === null) return;
    const incorrect = correctionIncorrect.trim();
    const correct = correctionCorrect.trim();
    if (incorrect.length === 0 || correct.length === 0) return;
    setCorrectionError(null);
    setCorrectionSubmitted(false);
    setCorrectionSubmitting(true);
    const body: CorrectionRequest = {
      incorrect_description: incorrect,
      correct_behavior: correct,
      conversation_id: conversationId,
    };
    const r = await api.otzar.correction(body);
    setCorrectionSubmitting(false);
    if (!r.ok) {
      setCorrectionError(correctionSubmitErrorCopy(r.code, r.status));
      return;
    }
    setCorrectionSubmitted(true);
    setCorrectionIncorrect("");
    setCorrectionCorrect("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat"
        description="A live conversation with your AI teammate. History is kept for this session only — Otzar does not yet provide a saved conversation list."
        actions={
          conversationId !== null ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void close()}
              disabled={closing}
            >
              {closing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Closing…
                </>
              ) : (
                "Close conversation"
              )}
            </Button>
          ) : undefined
        }
      />

      {closeSummary && (
        <Card>
          <CardContent className="space-y-1 py-4 text-sm" data-testid="close-summary">
            <p className="font-medium">Conversation saved.</p>
            <p className="text-muted-foreground">
              Otzar saved a knowledge item summarizing this conversation for
              your organization's memory.
            </p>
            <p className="text-muted-foreground">
              Topics: {closeSummary.topics.join(", ") || "—"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3" data-testid="chat-transcript">
        {turns.length === 0 && closeSummary === null && (
          <p className="text-sm text-muted-foreground">
            Start the conversation below. Otzar answers from your
            organization's governed memory.
          </p>
        )}
        {turns.map((turn, i) => (
          <div
            key={i}
            data-role={turn.role}
            className={
              turn.role === "you"
                ? "rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                : "rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
            }
          >
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {turn.role === "you" ? "You" : "Your AI teammate"}
            </span>
            {turn.text}
          </div>
        ))}
      </div>

      {meta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-muted-foreground" data-testid="chat-meta">
            Context items used: {meta.context_used} · tokens:{" "}
            {meta.tokens_consumed}
            {conversationId ? ` · conversation ${conversationId}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setShowTransparencyDetails((v) => !v)}
            aria-expanded={showTransparencyDetails}
            data-testid="transparency-toggle"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {showTransparencyDetails ? "Hide context details" : "Why this answer?"}
          </button>
        </div>
      )}

      {meta && showTransparencyDetails && (
        <TransparencyPanel transparency={transparency} provenance={provenance} />
      )}

      {/* Wave 2C: inline "Correct this conversation" affordance. Visible
          only while a conversationId is active so the correction is
          linked to the right conversation. Unobtrusive by default —
          collapsed toggle button, no dashboard surface. */}
      {conversationId !== null && (
        <div className="space-y-2" data-testid="chat-correction-affordance">
          <button
            type="button"
            onClick={() => {
              setCorrectionOpen((v) => !v);
              setCorrectionSubmitted(false);
              setCorrectionError(null);
            }}
            aria-expanded={correctionOpen}
            data-testid="chat-correction-toggle"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {correctionOpen ? "Hide correction form" : "Correct this conversation"}
          </button>
          {correctionOpen && (
            <form
              className="space-y-3 rounded-md border border-border bg-muted/20 px-4 py-3"
              data-testid="chat-correction-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submitCorrection();
              }}
            >
              {/* [GAP-S S-1] where this learning lands — the true copy:
                  corrections write to the employee's PERSONAL wallet and
                  are applied inside this organization's context. */}
              <p
                className="text-[11px] text-muted-foreground"
                data-testid="chat-correction-boundary"
              >
                Saved as personal learning in your Digital Work Wallet — it
                improves how Otzar works with you at this organization.
              </p>
              <div className="space-y-1">
                <Label htmlFor="chat-correction-incorrect">
                  What was wrong
                </Label>
                <Textarea
                  id="chat-correction-incorrect"
                  value={correctionIncorrect}
                  onChange={(e) => setCorrectionIncorrect(e.target.value)}
                  placeholder="Describe the incorrect understanding or behavior…"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="chat-correction-correct">
                  The correct behavior
                </Label>
                <Textarea
                  id="chat-correction-correct"
                  value={correctionCorrect}
                  onChange={(e) => setCorrectionCorrect(e.target.value)}
                  placeholder="Describe what Otzar should do or understand instead…"
                  rows={2}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={
                  correctionSubmitting ||
                  correctionIncorrect.trim().length === 0 ||
                  correctionCorrect.trim().length === 0
                }
              >
                {correctionSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  "Submit correction"
                )}
              </Button>
              {correctionError && (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                  data-testid="chat-correction-error"
                >
                  {correctionError}
                </p>
              )}
              {correctionSubmitted && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="chat-correction-success"
                >
                  Correction signal submitted for this conversation.
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          {canRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={sending}
              onClick={() => void retry()}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI teammate…"
          aria-label="Message"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || input.trim().length === 0}>
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Send
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
