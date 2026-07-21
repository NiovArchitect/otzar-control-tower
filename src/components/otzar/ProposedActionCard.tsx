// FILE: ProposedActionCard.tsx
// PURPOSE: Phase 1208 -- inline approval card that renders under the
//          Otzar chat response when Foundation's conductSession
//          returns a structured `proposed_action` envelope (LLM
//          drafted "Send this to <Name>?"). The card lets the
//          operator approve / cancel / edit the draft. Approve hits
//          POST /api/v1/actions with action_type
//          SEND_INTERNAL_NOTIFICATION, which fires the existing
//          ADR-0057 pipeline -- ACTION_PROPOSED audit -> policy
//          evaluator -> on APPROVED, executor creates a recipient
//          Notification row.
// CONNECTS TO:
//   - src/lib/api.ts (api.actions.sendInternalNotification)
//   - src/lib/types/foundation.ts (ProposedAction type)
//   - apps/api/src/services/otzar/proposed-action-extractor.ts
//     (the envelope this consumes)
//
// PRIVACY INVARIANT:
//   - Card renders ONLY the closed-vocab fields Foundation provided:
//     target.display_name, target.email, draft_text, reason.
//   - No private memory / vectors / TAR / clearance / wallet ids
//     are surfaced.
//   - APPROVAL GATE PRESERVED: no Action row is created until the
//     operator clicks Send. Cancel discards the card without any
//     backend call.

import { useState } from "react";
import type {
  ProposedAction,
  DraftToneAssessment,
  PythonAdvisoryEnvelope,
} from "@/lib/types/foundation";
import { api } from "@/lib/api";
import { AIBreakdownButton } from "@/components/otzar/AIBreakdownButton";

interface Props {
  proposedAction: ProposedAction;
  /** Optional callback fired after a successful send so the parent
   *  can hide the card / update the chat transcript / show a toast. */
  onSent?: (actionId: string) => void;
  /** Optional callback fired when the operator cancels. */
  onCancelled?: () => void;
  /** [SECTION-12-WORKGRAPH] Recipient-governance guard. When `blocked`, the
   *  normal "Send" is replaced by `actionLabel` ("Review recipient" / "Clarify"
   *  / "Needs approval") and sending is disabled — an unsafe recipient can never
   *  show a normal Send. */
  sendGuard?: { blocked: boolean; actionLabel: string; reason: string };
}

type CardState =
  | { kind: "idle" }
  | { kind: "editing"; editedDraft: string }
  | { kind: "sending" }
  | { kind: "sent"; actionId: string }
  // [PROD-UX-APPROVAL-LOOP] Submitted into dual-control — awaiting an
  // approver. NOT sent yet; saying "Sent" here would be an optimistic lie.
  | { kind: "submitted"; actionId: string }
  | { kind: "failed"; code: string };

function randomIdempotencyKey(): string {
  // Crypto-random when available, time-based fallback.
  const hex = (n: number): string => n.toString(16).padStart(8, "0");
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${hex(Date.now())}-${hex(Math.floor(Math.random() * 0xffffffff))}`;
}

// Phase 1286-B — advisory DRAFT_TONE state. ADVISORY ONLY: the original draft is
// never lost (proposedAction.draft_text is immutable; a revision is applied to a
// local editing buffer the user can revert), nothing is sent or approved here.
type ToneState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; assessment: DraftToneAssessment; envelope: PythonAdvisoryEnvelope | undefined }
  | { kind: "error" };

// WHAT: the advisory tone panel. Shows the original (preserved), the tone read,
//        and — only for a SAFE, non-downgraded revision — an explicit "Use
//        suggested revision" choice. Never sends, never approves.
function ToneAdvisoryPanel({
  assessment,
  envelope,
  currentDraft,
  onUse,
  onKeep,
}: {
  assessment: DraftToneAssessment;
  envelope: PythonAdvisoryEnvelope | undefined;
  currentDraft: string;
  onUse: (revision: string) => void;
  onKeep: () => void;
}): JSX.Element {
  const downgraded = envelope?.status === "FOUNDATION_DOWNGRADED";
  const advisory =
    assessment.provenance.startsWith("python:") && envelope?.authority === "FOUNDATION_VALIDATED";
  const rev = assessment.suggested_revision;
  const hasRev = rev !== null && rev.trim().length > 0;
  // Defensive: a recipient-facing revision must never carry an em/en dash.
  const unsafe = hasRev && /[—–]/.test(rev as string);
  const safe = hasRev && !unsafe;
  const changed = safe && rev !== currentDraft;
  const canApply = !downgraded && changed;
  return (
    <div className="mt-2 rounded border bg-muted/30 p-2 text-xs" data-testid="ctx-tone-panel">
      <div className="flex items-center justify-between">
        <span className="font-medium">Tone check</span>
        <span className="text-[10px] text-muted-foreground" data-testid="ctx-tone-advisory-label">
          {advisory ? "Advisory (Python)" : "Otzar (checked)"}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1" data-testid="ctx-tone-meta">
        <span className="rounded border px-1 text-[10px]" data-testid="ctx-tone-label">
          tone: {assessment.tone_label.toLowerCase().replace(/_/g, " ")}
        </span>
        <span className="rounded border px-1 text-[10px]" data-testid="ctx-tone-quality">
          quality {assessment.quality_score}
        </span>
        {assessment.risk_flags.map((f) => (
          <span key={f} className="rounded border px-1 text-[10px] text-amber-700 dark:text-amber-400" data-testid="ctx-tone-flag">
            {f.toLowerCase().replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {/* Original is ALWAYS shown — it is never lost. */}
      <div className="mt-1.5" data-testid="ctx-tone-original">
        <span className="text-muted-foreground">Original:</span>{" "}
        <span className="italic">“{assessment.original_draft}”</span>
      </div>

      {downgraded ? (
        <div className="mt-1.5 rounded border border-amber-400/40 bg-amber-500/5 p-1.5" data-testid="ctx-tone-downgraded">
          Otzar kept your original. {envelope?.warnings && envelope.warnings.length > 0
            ? envelope.warnings.join(" ")
            : "The suggested rewrite was not safe to apply."}
        </div>
      ) : unsafe ? (
        <div className="mt-1.5 rounded border border-amber-400/40 bg-amber-500/5 p-1.5" data-testid="ctx-tone-unsafe">
          Otzar kept your original. The suggested rewrite was not safe to apply.
        </div>
      ) : changed ? (
        <>
          <div className="mt-1.5" data-testid="ctx-tone-suggested">
            <span className="text-muted-foreground">Suggested:</span>{" "}
            <span className="italic">“{rev}”</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-[11px] disabled:opacity-50"
              onClick={() => rev !== null && onUse(rev)}
              disabled={!canApply}
              data-testid="ctx-tone-use"
            >
              Use suggested revision
            </button>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-[11px]"
              onClick={onKeep}
              data-testid="ctx-tone-keep"
            >
              Keep original
            </button>
          </div>
        </>
      ) : (
        <div className="mt-1.5 text-muted-foreground" data-testid="ctx-tone-nochange">
          No tone change suggested. Your draft reads clearly.
        </div>
      )}

      <div className="mt-1.5 text-muted-foreground" data-testid="ctx-tone-reason">
        {assessment.reason}
      </div>
      {assessment.approval_required ? (
        <div className="mt-1 text-amber-700 dark:text-amber-400" data-testid="ctx-tone-approval">
          This send will require approval before it goes out.
        </div>
      ) : null}
      <div className="mt-1 text-[10px] text-muted-foreground" data-testid="ctx-tone-provenance">
        {advisory ? "Advisory analysis by Python, checked by Otzar." : "Checked by Otzar."}
        {envelope ? ` Analysis ${envelope.status.toLowerCase()}.` : ""}
      </div>
    </div>
  );
}

export function ProposedActionCard({
  proposedAction,
  onSent,
  onCancelled,
  sendGuard,
}: Props): JSX.Element {
  const [state, setState] = useState<CardState>({ kind: "idle" });
  const [tone, setTone] = useState<ToneState>({ kind: "idle" });

  const recipientUnresolved = proposedAction.target.entity_id === null;
  // An unsafe recipient-governance verdict blocks send just like an unresolved
  // recipient — the operator must review/clarify/get-approval first.
  const governanceBlocked = sendGuard?.blocked ?? false;
  const sendBlocked = recipientUnresolved || governanceBlocked;

  const currentDraft =
    state.kind === "editing" ? state.editedDraft : proposedAction.draft_text;

  // WHAT: ask Foundation for an advisory tone read on the CURRENT draft.
  // WHY: Phase 1286-B. Evaluative only — creates nothing, sends nothing. The
  //      backend preserves the original and downgrades unsafe rewrites.
  async function handleImproveTone(): Promise<void> {
    setTone({ kind: "loading" });
    const result = await api.workOs.evaluateDraftTone({
      draft_text: currentDraft,
      channel: "internal_message",
      recipient_context: { display_name: proposedAction.target.display_name, internal: true },
    });
    if (!result.ok || !result.data.assessment) {
      setTone({ kind: "error" });
      return;
    }
    setTone({ kind: "ready", assessment: result.data.assessment, envelope: result.data.envelope });
  }

  // WHAT: apply a suggested revision to the LOCAL draft used by the later send.
  // WHY: this does NOT send and does NOT approve — the user still clicks Send,
  //      which runs the unchanged ADR-0057 approval pipeline. The original is
  //      recoverable via "Revert to original" (proposedAction.draft_text is
  //      immutable).
  function handleUseSuggested(revision: string): void {
    setState({ kind: "editing", editedDraft: revision });
    setTone({ kind: "idle" });
  }

  function handleRevertOriginal(): void {
    setState({ kind: "idle" });
    setTone({ kind: "idle" });
  }

  async function handleSend(): Promise<void> {
    if (proposedAction.target.entity_id === null || governanceBlocked) {
      setState({
        kind: "failed",
        code: "RECIPIENT_NOT_IN_ROSTER",
      });
      return;
    }
    setState({ kind: "sending" });
    const result = await api.actions.sendInternalNotification({
      recipient_entity_id: proposedAction.target.entity_id,
      draft_text: currentDraft,
      idempotency_key: randomIdempotencyKey(),
      payload_summary: `Otzar internal note to ${proposedAction.target.display_name}`,
    });
    if (!result.ok) {
      setState({ kind: "failed", code: result.code });
      return;
    }
    // [PROD-UX-APPROVAL-LOOP] Truth over optimism: a governed send that needs
    // dual-control comes back PROPOSED + requires_approval — it has NOT been
    // sent yet, an approver reviews it first. Only a send that is genuinely
    // past approval (auto-approved / already executing) may read as "Sent".
    const action = result.data.action;
    const awaitingApproval =
      action.requires_approval === true && action.status === "PROPOSED";
    setState(
      awaitingApproval
        ? { kind: "submitted", actionId: action.action_id }
        : { kind: "sent", actionId: action.action_id },
    );
    // Both outcomes hand the draft to governance — the parent may resolve the
    // durable card either way; Action Center carries the pending truth.
    onSent?.(action.action_id);
  }

  function handleCancel(): void {
    setState({ kind: "idle" });
    onCancelled?.();
  }

  function handleStartEdit(): void {
    setState({ kind: "editing", editedDraft: proposedAction.draft_text });
  }

  function handleEditChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ): void {
    if (state.kind !== "editing") return;
    setState({ kind: "editing", editedDraft: e.target.value });
  }

  if (state.kind === "sent") {
    return (
      <div
        className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm"
        data-testid="proposed-action-card-sent"
        data-action-id={state.actionId}
      >
        <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
          <span aria-hidden>✓</span>
          <span>Sent to {proposedAction.target.display_name}.</span>
        </div>
      </div>
    );
  }

  // [PROD-UX-APPROVAL-LOOP] The truthful dual-control state: submitted, not
  // sent. The note reaches {target} only after an approver signs off; the
  // sender can follow the decision in Action Center.
  if (state.kind === "submitted") {
    return (
      <div
        className="rounded-md border border-sky-500/40 bg-sky-500/5 p-3 text-sm"
        data-testid="proposed-action-card-submitted"
        data-action-id={state.actionId}
      >
        <div className="flex items-center gap-2 font-medium text-sky-700 dark:text-sky-400">
          <span aria-hidden>⏳</span>
          <span>Submitted for approval.</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          An approver will review before this sends to{" "}
          {proposedAction.target.display_name}. You can follow the decision in
          Action Center.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-md border p-3 text-sm"
      data-testid="proposed-action-card"
      data-action-type={proposedAction.action_type}
      data-target-entity-id={proposedAction.target.entity_id ?? ""}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-amber-500"
            aria-hidden
          />
          <span className="font-medium">Needs your confirmation</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground" data-testid="ctx-reason">
            {proposedAction.reason}
          </span>
          <AIBreakdownButton
            triggerTestId="ctx-ai-breakdown"
            breakdown={{
              title: "Why Otzar drafted this",
              points: [
                {
                  label: "Why this matters",
                  body: `Otzar inferred from your request that you wanted to send a note to ${proposedAction.target.display_name}.`,
                },
                {
                  label: "What happens if you approve",
                  body: `Otzar submits this as a governed internal action. ${proposedAction.target.display_name} sees an unread note. Your organization's policy and audit trail record the send. No external message goes out.`,
                },
                {
                  label: "What happens if you don't send",
                  body: "The draft is discarded. Nothing is created, nothing is sent, and no audit row is emitted.",
                },
                {
                  label: "Risk + permission",
                  body: "Internal note. Low risk. Otzar cannot send to anyone outside your org roster.",
                },
              ],
              confidence: "HIGH",
            }}
          />
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">To</dt>
        <dd data-testid="ctx-recipient">
          {proposedAction.target.display_name}
          {proposedAction.target.email !== null ? (
            <span className="ml-1 text-muted-foreground">
              ({proposedAction.target.email})
            </span>
          ) : null}
        </dd>
        <dt className="text-muted-foreground">Channel</dt>
        <dd>Internal note</dd>
      </dl>

      {recipientUnresolved ? (
        <p
          className="mt-2 rounded border border-amber-400/40 bg-amber-500/5 p-2 text-xs"
          role="alert"
          data-testid="ctx-recipient-warning"
        >
          Recipient is not in your org roster. Send is disabled until a
          known recipient is selected.
        </p>
      ) : governanceBlocked && sendGuard !== undefined ? (
        <p
          className="mt-2 rounded border border-amber-400/40 bg-amber-500/5 p-2 text-xs"
          role="alert"
          data-testid="ctx-recipient-governance-warning"
        >
          {sendGuard.reason}
        </p>
      ) : null}

      {state.kind === "editing" ? (
        <textarea
          className="mt-2 h-24 w-full rounded border bg-background p-2 text-sm"
          value={state.editedDraft}
          onChange={handleEditChange}
          data-testid="ctx-draft-edit"
        />
      ) : (
        <p
          className="mt-2 whitespace-pre-wrap rounded border bg-muted/40 p-2 text-sm italic"
          data-testid="ctx-draft"
        >
          “{currentDraft}”
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
          disabled={state.kind === "sending" || sendBlocked}
          onClick={handleSend}
          data-testid="ctx-send-button"
        >
          {state.kind === "sending"
            ? "Sending…"
            : governanceBlocked && sendGuard !== undefined
              ? sendGuard.actionLabel
              : "✓ Send"}
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          onClick={handleCancel}
          disabled={state.kind === "sending"}
          data-testid="ctx-cancel-button"
        >
          ✕ Don't send
        </button>
        {state.kind === "editing" ? null : (
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={handleStartEdit}
            disabled={state.kind === "sending"}
            data-testid="ctx-edit-button"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          onClick={handleImproveTone}
          disabled={state.kind === "sending" || tone.kind === "loading"}
          data-testid="ctx-improve-tone-button"
        >
          {tone.kind === "loading" ? "Checking tone…" : "Improve tone"}
        </button>
        {state.kind === "editing" && state.editedDraft !== proposedAction.draft_text ? (
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={handleRevertOriginal}
            data-testid="ctx-revert-original"
          >
            Revert to original
          </button>
        ) : null}
      </div>

      {tone.kind === "error" ? (
        <p
          className="mt-2 rounded border border-amber-400/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400"
          data-testid="ctx-tone-error"
        >
          Couldn't check the tone right now. Your draft is unchanged.
        </p>
      ) : null}

      {tone.kind === "ready" ? <ToneAdvisoryPanel assessment={tone.assessment} envelope={tone.envelope} currentDraft={currentDraft} onUse={handleUseSuggested} onKeep={() => setTone({ kind: "idle" })} /> : null}

      {state.kind === "failed" ? (
        <p
          className="mt-2 rounded border border-rose-400/40 bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-400"
          role="alert"
          data-testid="ctx-error"
          data-error-code={state.code}
        >
          {friendlyErrorCopy(state.code)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Translate Foundation's closed-vocab failure codes into human copy
 * the operator can act on. Per the Warmwind-OS / Warm-AI-Work-OS
 * directive: no raw codes, no developer jargon in the primary
 * employee surface. Unknown codes fall through to a generic
 * "Otzar could not send that..." with the code in a small caption
 * for debug.
 */
function friendlyErrorCopy(code: string): string {
  switch (code) {
    case "DUAL_CONTROL_NO_APPROVER_AVAILABLE":
      return "Otzar created the action, but your organization has not configured who can approve this type of internal note yet. Ask an admin to set up an approver or enable auto-approve for low-risk internal notes.";
    case "POLICY_BLOCKED":
    case "POLICY_FORBIDDEN":
      return "Otzar cannot send this. Your organization's policy blocks this action.";
    case "SESSION_INVALID":
    case "SESSION_EXPIRED":
    case "SESSION_REVOKED":
      return "Your session is no longer valid. Please sign in again.";
    case "INVALID_FIELD":
    case "INVALID_REQUEST":
      return "Otzar could not send that. The request shape is invalid. This is a wiring issue; please report it.";
    case "RECIPIENT_NOT_IN_ROSTER":
      return "Otzar can only send to people in your org roster. The recipient was not recognized.";
    default:
      return `Otzar could not send that. (Reference: ${code})`;
  }
}
