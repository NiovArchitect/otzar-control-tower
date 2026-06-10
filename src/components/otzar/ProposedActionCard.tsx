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
import type { ProposedAction } from "@/lib/types/foundation";
import { api } from "@/lib/api";
import { AIBreakdownButton } from "@/components/otzar/AIBreakdownButton";

interface Props {
  proposedAction: ProposedAction;
  /** Optional callback fired after a successful send so the parent
   *  can hide the card / update the chat transcript / show a toast. */
  onSent?: (actionId: string) => void;
  /** Optional callback fired when the operator cancels. */
  onCancelled?: () => void;
}

type CardState =
  | { kind: "idle" }
  | { kind: "editing"; editedDraft: string }
  | { kind: "sending" }
  | { kind: "sent"; actionId: string }
  | { kind: "failed"; code: string };

function randomIdempotencyKey(): string {
  // Crypto-random when available, time-based fallback.
  const hex = (n: number): string => n.toString(16).padStart(8, "0");
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${hex(Date.now())}-${hex(Math.floor(Math.random() * 0xffffffff))}`;
}

export function ProposedActionCard({
  proposedAction,
  onSent,
  onCancelled,
}: Props): JSX.Element {
  const [state, setState] = useState<CardState>({ kind: "idle" });

  const recipientUnresolved = proposedAction.target.entity_id === null;

  const currentDraft =
    state.kind === "editing" ? state.editedDraft : proposedAction.draft_text;

  async function handleSend(): Promise<void> {
    if (proposedAction.target.entity_id === null) {
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
    setState({ kind: "sent", actionId: result.data.action.action_id });
    onSent?.(result.data.action.action_id);
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
        <p className="mt-1 text-xs text-muted-foreground">
          Action ID: <code>{state.actionId}</code>
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
                  body: "Internal note — low risk. Otzar cannot send to anyone outside your org roster.",
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
          disabled={
            state.kind === "sending" || recipientUnresolved
          }
          onClick={handleSend}
          data-testid="ctx-send-button"
        >
          {state.kind === "sending" ? "Sending…" : "✓ Send"}
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
      </div>

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
      return "Otzar cannot send this — your organization's policy blocks this action.";
    case "SESSION_INVALID":
    case "SESSION_EXPIRED":
    case "SESSION_REVOKED":
      return "Your session is no longer valid. Please sign in again.";
    case "INVALID_FIELD":
    case "INVALID_REQUEST":
      return "Otzar could not send that — the request shape is invalid. This is a wiring issue; please report it.";
    case "RECIPIENT_NOT_IN_ROSTER":
      return "Otzar can only send to people in your org roster. The recipient was not recognized.";
    default:
      return `Otzar could not send that. (Reference: ${code})`;
  }
}
