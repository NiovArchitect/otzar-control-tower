// FILE: ConversationDetailDrawer.tsx
// PURPOSE: Single-purpose Sheet (side="right", no tabs) showing ONE
//          conversation look-back detail for the employee Otzar shell
//          (Wave 2B, ADR-0054). Read-only: it consumes
//          GET /api/v1/otzar/conversations/:id and renders metadata + an
//          optional CLOSE SUMMARY + topics. There are NO mutations here,
//          and /otzar/* returns no audit_event_id, so there is no
//          audit-aware primitive.
// CONNECTS TO: src/pages/app/Conversations.tsx (mounts this),
//              api.otzar.conversations.detail, conversation label helpers.
//
// ANTI-OVERCLAIM (ADR-0054): this is a close-summary look-back, NOT a
// transcript and NOT retrospective transparency. Live transparency is a
// response-time signal that is not persisted per conversation, so the
// drawer states that plainly and never fabricates a transparency view.
//
// PRIVACY: renders status / source / timestamps / message_count / the
// close summary / topics / the honest continuity note only. Raw ids
// (conversation_id, twin_id, summary_capsule_id) are NEVER surfaced —
// summary_capsule_id is part of the contract but is deliberately not
// rendered.

import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  labelConversationSource,
  labelConversationStatus,
} from "@/lib/labels/conversation";
import type { ConversationDetailAvailability } from "@/lib/types/foundation";

interface ConversationDetailDrawerProps {
  /** The selected conversation, or null when nothing is open. */
  conversationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// WHAT: Product label for the detail-availability state (never the raw
//        SCREAMING_SNAKE token).
const AVAILABILITY_LABEL: Record<ConversationDetailAvailability, string> = {
  SUMMARY_AVAILABLE: "Close summary available",
  NO_SUMMARY_YET: "No stored summary",
  ACTIVE_NOT_CLOSED: "Still active",
};

// WHAT: Map a non-ok ApiResult to safe customer copy.
function detailErrorCopy(
  code: string,
  status: number,
  message: string,
): string {
  if (status === 403 || code === "NOT_CONVERSATION_OWNER") {
    return "This conversation isn't available under your access.";
  }
  if (status === 404 || code === "CONVERSATION_NOT_FOUND") {
    return "This conversation is no longer available.";
  }
  return message || "Couldn't load this conversation. Please try again.";
}

export function ConversationDetailDrawer({
  conversationId,
  open,
  onOpenChange,
}: ConversationDetailDrawerProps) {
  const query = useQuery({
    queryKey: ["otzar", "conversation-detail", conversationId],
    enabled: open && conversationId !== null,
    queryFn: () => {
      if (conversationId === null) {
        throw new Error("no conversation selected");
      }
      return api.otzar.conversations.detail(conversationId);
    },
  });

  const res = query.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="conversation-detail-drawer"
      >
        <div className="space-y-4">
          <div className="space-y-1 border-b border-border pb-4">
            <h2 className="text-lg font-semibold">Conversation look-back</h2>
            <p className="text-xs text-muted-foreground">
              Session metadata and the close summary — not a transcript.
            </p>
          </div>

          {query.isLoading && (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {res && !res.ok && !query.isLoading && (
            <p
              role="alert"
              className="text-sm text-destructive"
              data-testid="detail-error"
            >
              {detailErrorCopy(res.code, res.status, res.message)}
            </p>
          )}

          {res && res.ok && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {labelConversationSource(res.data.conversation.source_type)}
                  </span>
                  <Badge
                    variant={
                      res.data.conversation.status === "ACTIVE"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {labelConversationStatus(res.data.conversation.status)}
                  </Badge>
                  <Badge variant="outline">
                    {
                      AVAILABILITY_LABEL[
                        res.data.conversation.detail_availability
                      ]
                    }
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {res.data.conversation.message_count} message
                  {res.data.conversation.message_count === 1 ? "" : "s"} ·
                  started {formatRelativeTime(res.data.conversation.started_at)}
                  {res.data.conversation.closed_at
                    ? ` · closed ${formatRelativeTime(
                        res.data.conversation.closed_at,
                      )}`
                    : ""}
                </p>
              </div>

              {/* ─── Close-summary section, by availability ───────── */}
              {res.data.conversation.detail_availability ===
                "SUMMARY_AVAILABLE" && (
                <div className="space-y-3" data-testid="detail-summary">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Close summary
                    </p>
                    <p className="whitespace-pre-line text-sm">
                      {res.data.conversation.summary}
                    </p>
                  </div>
                  {res.data.conversation.topics.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Topics
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {res.data.conversation.topics.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {res.data.conversation.detail_availability ===
                "ACTIVE_NOT_CLOSED" && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="detail-active"
                >
                  This conversation is still active. A close summary becomes
                  available after it closes.
                </p>
              )}

              {res.data.conversation.detail_availability ===
                "NO_SUMMARY_YET" && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="detail-no-summary"
                >
                  This conversation closed without a stored summary.
                </p>
              )}

              {/* ─── Anti-overclaim boundary (ADR-0054) ───────────── */}
              <div
                className="space-y-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
                data-testid="lookback-boundary-note"
              >
                <p>
                  This look-back shows the close summary only. Live
                  transparency is available during answers, not stored as
                  history.
                </p>
                <p>This is not a transcript.</p>
                <p>{res.data.conversation.continuity_note}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
