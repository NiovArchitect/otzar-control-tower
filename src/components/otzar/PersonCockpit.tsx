// FILE: PersonCockpit.tsx
// PURPOSE: Phase 1285 slice 2 — the Person Collaboration Cockpit. Clicking a
//          person in People & Collaboration opens this relationship cockpit:
//          it shows the REAL latest direct thread (GET /work-os/threads/with/
//          :entityId) with that person, recent messages, and an inline
//          Message composer that delivers via the governed human-authority
//          path (POST /work-os/internal-messages) — appending to the same
//          thread. Every control is a real process chain, not a dead button.
// CONNECTS TO: src/components/otzar/PeopleDirectory.tsx (mount),
//          api.workOs.thread / api.workOs.internalMessage,
//          src/lib/work-os/message-sanitize.ts.
//
// NO Slack/email/calendar — internal Otzar inbox only. Participant-scoped +
// tenant-isolated by the backend thread endpoint.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { sanitizeOutboundMessage } from "@/lib/work-os/message-sanitize";
import { ThreadSignalChip } from "@/components/otzar/ThreadSignalChip";
import type { DirectThreadMessageView, WaitingOnItemView } from "@/lib/types/foundation";

export function PersonCockpit({
  entityId,
  displayName,
  roleTitle,
  sharedProjects,
  recentCollabs,
  onRequestHelp,
}: {
  entityId: string;
  displayName: string;
  roleTitle: string;
  sharedProjects: number;
  recentCollabs: number;
  onRequestHelp?: (entityId: string, displayName: string) => void;
}): JSX.Element {
  const [messages, setMessages] = useState<DirectThreadMessageView[] | null>(null);
  const [loadingThread, setLoadingThread] = useState(true);
  const [waitingOnThem, setWaitingOnThem] = useState<WaitingOnItemView[]>([]);
  const [pendingFromThem, setPendingFromThem] = useState<WaitingOnItemView[]>([]);
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);
  const [sendState, setSendState] = useState<{ kind: "idle" | "sent" | "error"; note?: string }>({
    kind: "idle",
  });

  // Load BOTH the thread and the waiting-on relationship together. Reused on
  // mount AND after any state-changing action (send, Add to Work Ledger) so the
  // cockpit reflects durable state without an app restart (Phase 1285-C).
  async function loadAll(): Promise<void> {
    const [t, w] = await Promise.all([
      api.workOs.thread(entityId),
      api.workOs.waitingOn(entityId),
    ]);
    setMessages(t.ok && t.data.ok && t.data.messages != null ? t.data.messages : []);
    setLoadingThread(false);
    if (w.ok && w.data.ok) {
      setWaitingOnThem(w.data.waiting_on_them ?? []);
      setPendingFromThem(w.data.pending_from_them ?? []);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [t, w] = await Promise.all([
        api.workOs.thread(entityId),
        api.workOs.waitingOn(entityId),
      ]);
      if (cancelled) return;
      setMessages(t.ok && t.data.ok && t.data.messages != null ? t.data.messages : []);
      setLoadingThread(false);
      if (w.ok && w.data.ok) {
        setWaitingOnThem(w.data.waiting_on_them ?? []);
        setPendingFromThem(w.data.pending_from_them ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  async function sendMessage(): Promise<void> {
    const text = compose.trim();
    if (text.length === 0) return;
    setSending(true);
    const r = await api.workOs.internalMessage(entityId, sanitizeOutboundMessage(text));
    setSending(false);
    if (r.ok && r.data.status === "DELIVERED") {
      setCompose("");
      setSendState({ kind: "sent", note: `Delivered to ${r.data.recipient_display_name ?? displayName}.` });
      void loadAll();
    } else {
      setSendState({
        kind: "error",
        note: r.ok ? (r.data.reason ?? r.data.status) : "Message could not be delivered.",
      });
    }
  }

  const latest = messages != null && messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-xs" data-testid="person-cockpit">
      <div className="flex items-center justify-between">
        <div className="font-medium text-foreground">{displayName}</div>
        <div className="flex gap-1">
          {sharedProjects > 0 ? (
            <Badge variant="outline" className="text-[10px]">{sharedProjects} shared</Badge>
          ) : null}
          {recentCollabs > 0 ? (
            <Badge variant="outline" className="text-[10px]">{recentCollabs} recent</Badge>
          ) : null}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">{roleTitle}</div>

      {/* Waiting-on relationship — durable Work Ledger records only. */}
      {waitingOnThem.length > 0 || pendingFromThem.length > 0 ? (
        <div className="mt-2 border-t border-border/50 pt-2" data-testid="person-cockpit-waiting-on">
          {waitingOnThem.length > 0 ? (
            <div className="text-[11px]">
              <span className="font-medium text-amber-600">Waiting on {displayName.split(" ")[0]}:</span>{" "}
              {waitingOnThem.map((w) => w.title).slice(0, 3).join("; ")}
            </div>
          ) : null}
          {pendingFromThem.length > 0 ? (
            <div className="text-[11px]">
              <span className="font-medium text-foreground/80">{displayName.split(" ")[0]} is waiting on you:</span>{" "}
              {pendingFromThem.map((w) => w.title).slice(0, 3).join("; ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Real thread preview — latest + recent, from durable records. */}
      <div className="mt-2 border-t border-border/50 pt-2" data-testid="person-cockpit-thread">
        <div className="text-[11px] font-medium text-foreground/80">Recent messages</div>
        {loadingThread ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : messages != null && messages.length > 0 ? (
          <>
            <div className="text-[10px] text-muted-foreground">
              Latest: {latest!.from_me ? "you" : displayName}: "{latest!.body}"
            </div>
            <div className="mt-1 space-y-1">
              {messages.slice(-4).map((m) => (
                <div key={m.message_id} className="text-[11px]" data-testid="person-cockpit-message">
                  <span className="text-muted-foreground">{m.from_me ? "You" : displayName}:</span>{" "}
                  {m.body}
                  {m.signal !== undefined ? (
                    <ThreadSignalChip
                      signalType={m.signal.signal_type}
                      sourceMessageId={m.message_id}
                      tracked={m.signal.tracked ?? false}
                      onTracked={() => void loadAll()}
                      message={m}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground" data-testid="person-cockpit-no-thread">
            No messages with {displayName} yet.
          </div>
        )}
      </div>

      {/* Real process chain: Message → governed delivery → same thread. */}
      <div className="mt-2 border-t border-border/50 pt-2">
        <textarea
          className="w-full rounded border border-border bg-background p-2 text-sm"
          rows={2}
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
          placeholder={`Message ${displayName}… (internal Otzar message only)`}
          data-testid="person-cockpit-compose"
        />
        <div className="mt-1 flex items-center gap-2">
          <Button
            size="sm"
            disabled={sending || compose.trim().length === 0}
            onClick={() => void sendMessage()}
            data-testid="person-cockpit-send"
          >
            {sending ? "Sending…" : `Message ${displayName.split(" ")[0]}`}
          </Button>
          {onRequestHelp !== undefined ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRequestHelp(entityId, displayName)}
              data-testid="person-cockpit-request-help"
            >
              Request help
            </Button>
          ) : null}
        </div>
        {sendState.kind === "sent" ? (
          <p className="mt-1 text-[11px] text-emerald-600" data-testid="person-cockpit-sent">{sendState.note}</p>
        ) : null}
        {sendState.kind === "error" ? (
          <p className="mt-1 text-[11px] text-amber-600">{sendState.note}</p>
        ) : null}
        <p className="mt-1 text-[10px] italic text-muted-foreground">
          Internal Otzar message only. No Slack, email, or calendar. Ask-Twin coming next.
        </p>
      </div>
    </div>
  );
}
