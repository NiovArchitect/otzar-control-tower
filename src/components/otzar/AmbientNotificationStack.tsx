// FILE: AmbientNotificationStack.tsx
// PURPOSE: Phase 1251 — ambient context cards. Small, calm, floating
//          cards above the Otzar orb that appear only when something
//          genuinely matters, in plain language:
//
//            "2 items are waiting for your decision."
//            "3 new notes for you."
//            "Voice is paused while you're in a meeting."
//            "Voice needs microphone access — you can type instead."
//
//          Cards never cover the user's work, are dismissible,
//          keyboard accessible, deep-link to the right surface, and
//          collapse on their own when the signal clears. A fetch
//          failure adds NO card (the ambient layer only speaks when
//          it has something true to say).
// CONNECTS TO: src/lib/stores/presence.ts (signals), api.actions.list
//          (PROPOSED count poll), EmployeeLayout,
//          tests/unit/ambient-edge-presence.test.tsx.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, ListChecks, MicOff, MoonStar, X } from "lucide-react";
import { api } from "@/lib/api";
import { usePresenceStore } from "@/lib/stores/presence";
import { isActionablePending } from "@/lib/work-os/action-classify";

const APPROVALS_POLL_MS = 60_000;

type CardKind = "approvals" | "notes" | "quiet" | "voice-blocked";

interface AmbientCard {
  kind: CardKind;
  icon: JSX.Element;
  text: string;
  to: string | null;
  linkLabel: string | null;
}

function quietCopy(reason: "IN_MEETING" | "FOCUS_TIME" | "OTHER" | null): string {
  switch (reason) {
    case "IN_MEETING":
      return "Voice is paused while you're in a meeting.";
    case "FOCUS_TIME":
      return "Voice is paused for your focus time.";
    default:
      return "Otzar is quiet. Voice is paused until you resume it.";
  }
}

export function AmbientNotificationStack(): JSX.Element | null {
  const approvalsCount = usePresenceStore((s) => s.approvalsCount);
  const unreadCount = usePresenceStore((s) => s.unreadCount);
  const quiet = usePresenceStore((s) => s.quiet);
  const quietReason = usePresenceStore((s) => s.quietReason);
  const voiceBlocked = usePresenceStore((s) => s.voiceBlocked);
  const setSignals = usePresenceStore((s) => s.setSignals);
  const [dismissed, setDismissed] = useState<Set<CardKind>>(new Set());

  // Poll proposed actions so "needs your decision" is real, not
  // guessed. Failures add no card and change no state.
  useEffect(() => {
    let cancelled = false;
    async function check(): Promise<void> {
      try {
        const r = await api.actions.list({ status: "PROPOSED", page_size: 50 });
        if (!cancelled && r.ok) {
          // Phase 1287-C — count ONLY truly actionable pending decisions (a live
          // escalation to approve/reject), not every PROPOSED row. A stale /
          // routing-only PROPOSED item is NOT a waiting decision, so the popup
          // suppresses instead of dead-clicking into an empty Action Center.
          const actionable = (r.data.items ?? []).filter(isActionablePending).length;
          setSignals({ approvalsCount: actionable });
        }
      } catch {
        // Silent: the ambient layer never invents urgency from errors.
      }
    }
    void check();
    const timer = setInterval(() => void check(), APPROVALS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [setSignals]);

  // Dismissals clear when the signal clears, so a card can return
  // the next time the situation genuinely recurs.
  useEffect(() => {
    setDismissed((prev) => {
      const next = new Set(prev);
      if (approvalsCount === 0) next.delete("approvals");
      if (unreadCount === 0) next.delete("notes");
      if (!quiet) next.delete("quiet");
      if (!voiceBlocked) next.delete("voice-blocked");
      return next.size === prev.size ? prev : next;
    });
  }, [approvalsCount, unreadCount, quiet, voiceBlocked]);

  const cards: AmbientCard[] = [];
  if (approvalsCount > 0 && !dismissed.has("approvals")) {
    cards.push({
      kind: "approvals",
      icon: <ListChecks className="h-3.5 w-3.5 text-amber-500" aria-hidden />,
      text:
        approvalsCount === 1
          ? "1 item is waiting for your decision."
          : `${approvalsCount} items are waiting for your decision.`,
      to: "/app/action-center",
      linkLabel: "Review",
    });
  }
  if (quiet && !dismissed.has("quiet")) {
    cards.push({
      kind: "quiet",
      icon: <MoonStar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />,
      text: quietCopy(quietReason),
      to: null,
      linkLabel: null,
    });
  } else if (unreadCount > 0 && !dismissed.has("notes")) {
    // Notes stay out of the way during quiet mode — approvals only.
    cards.push({
      kind: "notes",
      icon: <BellRing className="h-3.5 w-3.5 text-teal-500" aria-hidden />,
      text:
        unreadCount === 1
          ? "1 new note for you."
          : `${unreadCount} new notes for you.`,
      to: "/app/comms",
      linkLabel: "Open",
    });
  }
  if (voiceBlocked && !quiet && !dismissed.has("voice-blocked")) {
    cards.push({
      kind: "voice-blocked",
      icon: <MicOff className="h-3.5 w-3.5 text-amber-500" aria-hidden />,
      text: "Voice needs microphone access. You can type instead.",
      to: "/app/voice",
      linkLabel: "Set up",
    });
  }

  // At most two cards: ambient means restrained.
  const visible = cards.slice(0, 2);
  if (visible.length === 0) return null;

  return (
    <div
      role="status"
      aria-label="Otzar updates"
      data-testid="ambient-card-stack"
      className="fixed bottom-24 right-6 z-[58] flex w-72 flex-col gap-2"
    >
      {visible.map((card) => (
        <div
          key={card.kind}
          data-testid="ambient-card"
          data-kind={card.kind}
          className="flex items-start gap-2 rounded-xl border border-border/70 bg-background/85 p-3 text-xs shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70"
        >
          <span className="mt-0.5 shrink-0">{card.icon}</span>
          <span className="flex-1 leading-snug text-foreground">
            {card.text}{" "}
            {card.to !== null && card.linkLabel !== null ? (
              <Link
                to={card.to}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {card.linkLabel}
              </Link>
            ) : null}
          </span>
          <button
            type="button"
            aria-label={`Dismiss: ${card.text}`}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() =>
              setDismissed((prev) => new Set(prev).add(card.kind))
            }
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
