// FILE: TranscriptActionReview.tsx
// PURPOSE: Phase 3B — a CALM, compact review of transcript-derived proposed
//          actions. Each item is a short card with obvious choices (Save / Send
//          request / Dismiss / Ask). No raw dump, no noisy dashboard, no fake
//          completion: a card only changes to saved/sent after a governed rail
//          confirms. Details/proof stay out of the default surface.
// CONNECTS TO: lib/work-os/transcript-actions.ts, AmbientOtzarBar (handlers),
//          tests/unit/ambient-otzar-bar.test.tsx.

import type {
  TranscriptProposedAction,
  TranscriptProposedActionStatus,
} from "@/lib/work-os/transcript-actions";

interface TranscriptActionReviewProps {
  actions: TranscriptProposedAction[];
  onSave: (action: TranscriptProposedAction) => void;
  onSend: (action: TranscriptProposedAction) => void;
  onDismiss: (action: TranscriptProposedAction) => void;
  onAsk: (action: TranscriptProposedAction) => void;
}

function statusLabel(status: TranscriptProposedActionStatus): string | null {
  switch (status) {
    case "saving":
      return "Saving…";
    case "sending":
      return "Sending…";
    case "saved":
      return "Saved";
    case "sent":
      return "Sent";
    case "dismissed":
      return "Dismissed";
    case "blocked":
      return "Queued for approval";
    case "approved":
      return "Approved";
    case "proposed":
      return null;
  }
}

const BTN =
  "rounded border border-input bg-background/60 px-1.5 py-0.5 text-[10px] hover:bg-accent";

export function TranscriptActionReview({
  actions,
  onSave,
  onSend,
  onDismiss,
  onAsk,
}: TranscriptActionReviewProps): JSX.Element | null {
  const open = actions.filter((a) => a.status !== "dismissed");
  if (open.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-white/60 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-md ring-1 ring-black/[0.04] px-2 py-1.5 text-xs"
      data-testid="transcript-action-review"
    >
      <div className="mb-1">
        <div className="text-[11px] font-medium text-muted-foreground">
          Proposed actions
        </div>
        <div className="text-[10px] text-muted-foreground/60">
          Save, send, or dismiss each.
        </div>
      </div>
      <div className="space-y-1.5">
        {open.map((a) => {
          const done = statusLabel(a.status);
          return (
            <div
              key={a.id}
              className="flex items-start justify-between gap-2"
              data-testid="transcript-action"
              data-action-id={a.id}
              data-status={a.status}
              data-kind={a.kind}
            >
              <div className="min-w-0">
                <span className="font-medium text-foreground">{a.title}</span>{" "}
                <span className="text-muted-foreground">{a.body}</span>
                {a.ownerName !== undefined ? (
                  <span className="opacity-70"> · {a.ownerName}</span>
                ) : null}
                {a.dueHint !== undefined ? (
                  <span className="opacity-70"> · {a.dueHint}</span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {done !== null ? (
                  <span className="text-[10px] text-muted-foreground" data-testid="transcript-action-status">
                    {done}
                  </span>
                ) : (
                  <>
                    {a.kind === "send_request" ? (
                      <button
                        type="button"
                        className={BTN}
                        onClick={() => onSend(a)}
                        data-testid="transcript-action-send"
                      >
                        Send request
                      </button>
                    ) : null}
                    {a.kind === "ask_clarification" ? (
                      <button
                        type="button"
                        className={BTN}
                        onClick={() => onAsk(a)}
                        data-testid="transcript-action-ask"
                      >
                        Ask
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={BTN}
                        onClick={() => onSave(a)}
                        data-testid="transcript-action-save"
                      >
                        Save
                      </button>
                    )}
                    <button
                      type="button"
                      className={BTN}
                      onClick={() => onDismiss(a)}
                      data-testid="transcript-action-dismiss"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
