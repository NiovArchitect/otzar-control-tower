// FILE: InboxThread.tsx
// PURPOSE: Phase 1284 Wave 2 — the real message/thread detail view a direct
//          internal-message notification opens (NOT the Comms capture page).
//          Shows From / To / body / timestamp / status, a reply composer that
//          sends back to the sender via the human-authority internal-message
//          path (POST /work-os/internal-messages), and a View/Why proof
//          section. No Slack/email/calendar — internal Otzar inbox only.
// CONNECTS TO: src/lib/api.ts (notifications.list/markRead, workOs.internalMessage),
//          src/lib/work-os/notification-routing.ts, App.tsx route inbox/:id.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SafeNotificationView, DirectThreadMessageView } from "@/lib/types/foundation";
import { sanitizeOutboundMessage } from "@/lib/work-os/message-sanitize";
import { ThreadSignalChip } from "@/components/otzar/ThreadSignalChip";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { emitWorkStateChanged, useWorkStateChanged } from "@/lib/events/work-state";

type Phase = "loading" | "ready" | "not-found" | "error";

// Phase OTZAR-RETURN-2 — there is no GET /notifications/:id by-id route at
// Foundation (only list + read/reply/dismiss), so the route param is resolved
// by paging the self-scoped inbox until the notification is found. This is a
// BOUNDED scan: it stops the instant the item is found (the common recent case
// is one round-trip), stops once the whole inbox is covered (total), and is
// hard-capped at MAX_RESOLVE_PAGES so it can never loop — even if a backend
// ignores `page` and returns the same slice. A page that FAILS to load is a
// fetch error, NOT a "gone" signal (never falsely report a thread missing).
const RESOLVE_PAGE_SIZE = 100;
const MAX_RESOLVE_PAGES = 20;

async function resolveNotification(
  id: string,
  isCancelled: () => boolean,
): Promise<
  | { kind: "found"; item: SafeNotificationView }
  | { kind: "not-found" }
  | { kind: "error" }
> {
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  while (page <= MAX_RESOLVE_PAGES && (page - 1) * RESOLVE_PAGE_SIZE < total) {
    const r = await api.notifications.list({ page, page_size: RESOLVE_PAGE_SIZE });
    if (isCancelled()) return { kind: "not-found" }; // ignored by caller on cancel
    if (!r.ok) return { kind: "error" };
    total = r.data.total;
    const hit = r.data.notifications.find((n) => n.notification_id === id);
    if (hit !== undefined) return { kind: "found", item: hit };
    // Defensive: an empty page means we've run past the end — stop even if the
    // reported total disagrees with what the backend actually returns.
    if (r.data.notifications.length === 0) break;
    page += 1;
  }
  return { kind: "not-found" };
}

export function InboxThread(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [item, setItem] = useState<SafeNotificationView | null>(null);
  const [threadMsgs, setThreadMsgs] = useState<DirectThreadMessageView[] | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyState, setReplyState] = useState<
    { kind: "idle" } | { kind: "sent"; to: string } | { kind: "error"; reason: string }
  >({ kind: "idle" });
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (id === undefined) {
        setPhase("not-found");
        return;
      }
      const resolved = await resolveNotification(id, () => cancelled);
      if (cancelled) return;
      if (resolved.kind === "error") {
        setPhase("error");
        return;
      }
      if (resolved.kind === "not-found") {
        setPhase("not-found");
        return;
      }
      const found = resolved.item;
      setItem(found);
      setPhase("ready");
      if (found.read_at === null) void api.notifications.markRead(found.notification_id);
      // Load the full persistent thread with this sender (both directions). This
      // entity-keyed thread call is UNCHANGED — it is what preserves the
      // Sadeil <-> David relationship threading regardless of inbox page.
      if (found.sender != null) {
        const t = await api.workOs.thread(found.sender.entity_id);
        if (!cancelled && t.ok && t.data.ok && t.data.messages != null) {
          setThreadMsgs(t.data.messages);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Additive cross-surface sync (Phase 1285-K): refresh the thread when a
  // message/thread/track event fires, alongside the existing reloadThread path.
  useWorkStateChanged(
    ["MESSAGE_CREATED", "THREAD_UPDATED", "SIGNAL_TRACKED"],
    () => void reloadThread(),
  );

  async function reloadThread(): Promise<void> {
    if (item?.sender == null) return;
    const t = await api.workOs.thread(item.sender.entity_id);
    if (t.ok && t.data.ok && t.data.messages != null) setThreadMsgs(t.data.messages);
  }

  async function sendReply(): Promise<void> {
    if (item?.sender == null) return;
    const text = reply.trim();
    if (text.length === 0) return;
    setSending(true);
    // Reply goes back to the original sender via the SAME human-authority
    // internal-message path that delivered the original. No external send.
    const r = await api.workOs.internalMessage(item.sender.entity_id, sanitizeOutboundMessage(text));
    setSending(false);
    if (r.ok && r.data.status === "DELIVERED") {
      setReply("");
      setReplyState({ kind: "sent", to: r.data.recipient_display_name ?? item.sender.display_name });
      // Append the new message by reloading the persistent thread.
      void reloadThread(); // existing path (kept)
      // Additive (Phase 1285-K): propagate to other thread views.
      if (item.sender != null) {
        emitWorkStateChanged({ type: "MESSAGE_CREATED", entity_id: item.sender.entity_id });
        emitWorkStateChanged({ type: "THREAD_UPDATED", entity_id: item.sender.entity_id });
      }
    } else {
      setReplyState({
        kind: "error",
        reason: r.ok ? (r.data.reason ?? r.data.status) : "Reply could not be delivered.",
      });
    }
  }

  if (phase === "loading") {
    return <div className="p-4 text-sm text-muted-foreground">Opening message…</div>;
  }
  if (phase === "error") {
    return (
      <div className="p-4 text-sm text-amber-600" data-testid="inbox-thread-error">
        Couldn't open this message right now.
      </div>
    );
  }
  if (phase === "not-found" || item === null) {
    return (
      <div className="p-4 text-sm text-muted-foreground" data-testid="inbox-thread-not-found">
        This thread isn't available in your current inbox view.
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/app/comms")}>
            Open Comms
          </Button>
          <Button variant="outline" onClick={() => navigate("/app/my-work")}>
            Back to My Work
          </Button>
        </div>
      </div>
    );
  }

  const sender = item.sender;
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4" data-testid="inbox-thread">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Message</h1>
        <Badge variant="outline">{item.status === "UNREAD" ? "New" : "Read"}</Badge>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Conversation with{" "}
        <span className="font-medium text-foreground">
          {entityLabel(sender?.display_name)}
          {sender?.role_title != null ? ` · ${sender.role_title}` : ""}
        </span>
      </div>

      {/* Full persistent thread (both directions, ordered). Falls back to the
          single notification body if the thread couldn't be loaded. */}
      {threadMsgs != null && threadMsgs.length > 0 ? (
        <div className="space-y-2" data-testid="inbox-thread-messages">
          {threadMsgs.map((m) => (
            <div
              key={m.message_id}
              className={`max-w-[85%] rounded-md border border-border p-2 text-sm ${
                m.from_me ? "ml-auto bg-primary/10" : "bg-background/70"
              }`}
              data-testid="inbox-thread-message"
            >
              <div className="text-[10px] text-muted-foreground">
                {m.from_me ? "You" : entityLabel(m.sender_display_name)}
                {!m.from_me && m.sender_role_title != null ? ` · ${m.sender_role_title}` : ""}
              </div>
              <p className="whitespace-pre-wrap break-words text-foreground">{m.body}</p>
              {m.signal !== undefined ? (
                <ThreadSignalChip
                  signalType={m.signal.signal_type}
                  sourceMessageId={m.message_id}
                  tracked={m.signal.tracked ?? false}
                  onTracked={() => void reloadThread()}
                  message={m}
                />
              ) : null}
              <p className="text-[9px] text-muted-foreground">{m.created_at}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-background/70 p-3 text-sm" data-testid="inbox-thread-single">
          <div className="text-[11px] font-medium text-foreground" data-testid="inbox-thread-from">
            From: {entityLabel(sender?.display_name)}
            {sender?.role_title != null ? ` · ${sender.role_title}` : ""}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-foreground" data-testid="inbox-thread-body">
            {item.body_summary}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{item.created_at}</p>
        </div>
      )}

      {/* Reply composer — human-authority internal path, back to the sender. */}
      {sender != null ? (
        <div className="rounded-md border border-border p-3" data-testid="inbox-thread-reply">
          <label className="text-xs font-medium text-foreground/80" htmlFor="inbox-reply">
            Reply to {sender.display_name}
          </label>
          <textarea
            id="inbox-reply"
            data-testid="inbox-thread-reply-input"
            className="mt-1 w-full rounded border border-border bg-background p-2 text-sm"
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply… (internal Otzar message only — no Slack/email/calendar)"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              data-testid="inbox-thread-reply-send"
              disabled={sending || reply.trim().length === 0}
              onClick={() => void sendReply()}
            >
              {sending ? "Sending…" : "Send reply"}
            </Button>
            <Button variant="outline" onClick={() => setShowWhy((v) => !v)}>
              {showWhy ? "Hide" : "View / Why"}
            </Button>
          </div>
          {replyState.kind === "sent" ? (
            <p className="mt-2 text-xs text-emerald-600" data-testid="inbox-thread-reply-sent">
              Reply delivered to {replyState.to}.
            </p>
          ) : null}
          {replyState.kind === "error" ? (
            <p className="mt-2 text-xs text-amber-600">{replyState.reason}</p>
          ) : null}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          This message has no replyable sender on record.
        </div>
      )}

      {showWhy ? (
        <div className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground" data-testid="inbox-thread-why">
          <div>Delivery: human-authority internal message (governed, audited).</div>
          <div>Channel: internal Otzar inbox only — no Slack/email/calendar/external.</div>
          <div>Message id: {item.notification_id}</div>
          {sender != null ? <div>Sender authority: {sender.authority_label}</div> : null}
          <div className="italic">Inspect only — replying sends an internal note to the sender.</div>
        </div>
      ) : null}
    </div>
  );
}
