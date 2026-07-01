// FILE: FocusHome.tsx
// PURPOSE: Phase 1253 — the new DEFAULT employee experience. Not a
//          dashboard: a mostly-open, calm surface that treats the
//          user's real work as the foreground and Otzar as an
//          ambient presence. One greeting, the voice-first
//          affordance, at most the top items that genuinely need
//          attention, and a single quiet door to the full workbench.
//          Everything else lives behind voice ("what matters
//          today?"), the orb, and the ambient cards.
// CONNECTS TO: App.tsx (/app index route), EmployeeLayout (sidebar
//          hidden here), MyDay (the full workbench at /app/my-day),
//          src/lib/voice/command-router.ts (voice routes everywhere),
//          tests/unit/focus-home.test.tsx.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, MoonStar } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import type { MyDayIntelligenceView } from "@/lib/types/foundation";
import { deriveTodayAttention } from "@/lib/work-os/today-attention";

interface TopItem {
  text: string;
  to: string;
}

function greetingFor(hour: number, name: string | null): string {
  const base =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name === null ? base : `${base}, ${name.split(" ")[0]}`;
}

export function FocusHome(): JSX.Element {
  const entity = useAuthStore((s) => s.entity);
  const quiet = usePresenceStore((s) => s.quiet);
  const approvalsCount = usePresenceStore((s) => s.approvalsCount);
  const unreadCount = usePresenceStore((s) => s.unreadCount);
  const [intel, setIntel] = useState<MyDayIntelligenceView | null>(null);

  // One calm intelligence read — never a wall of cards. Failure means
  // silence, not an error wall; the orb carries error states.
  useEffect(() => {
    let cancelled = false;
    api.otzar
      .myDayIntelligence()
      .then((r) => {
        if (!cancelled && r.ok) setIntel(r.data.intelligence);
      })
      .catch(() => {
        /* ambient: silence over noise */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const headline = intel?.headline ?? null;
  // PROD-UX-P0B — attention items are BACKED by the My Day signals (the same
  // source as the headline) and each DEEP-LINKS to the surface that resolves it,
  // so the count matches reality and the headline itself routes when there's a
  // single destination. When intelligence isn't available, fall back to the
  // presence counters so the door is never dead.
  const attention = intel !== null ? deriveTodayAttention(intel) : null;
  const top: TopItem[] = attention !== null ? attention.items.map((i) => ({ text: i.text, to: i.to })) : [];
  if (top.length === 0) {
    if (approvalsCount > 0) {
      top.push({ text: approvalsCount === 1 ? "1 approval is waiting" : `${approvalsCount} approvals are waiting`, to: "/app/action-center" });
    }
    if (unreadCount > 0) {
      top.push({ text: unreadCount === 1 ? "1 reply to review" : `${unreadCount} replies to review`, to: "/app/comms" });
    }
  }
  // The headline deep-links to the single attention destination when there is one.
  const headlineTo = attention?.primaryTo ?? (top.length === 1 ? top[0]!.to : null);

  const name = entity?.email ? entity.email.split("@")[0] ?? null : null;

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center px-6"
      data-testid="focus-home"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-2xl font-light tracking-tight text-foreground">
            {greetingFor(new Date().getHours(), name)}
          </p>
          <p className="text-sm text-muted-foreground" data-testid="focus-home-presence-line">
            {quiet ? (
              <>
                <MoonStar className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Otzar is quiet while you focus.
              </>
            ) : (
              "I'm here. I'll stay out of your way unless something needs your attention."
            )}
          </p>
        </div>

        {headline !== null ? (
          headlineTo !== null ? (
            <Link
              to={headlineTo}
              className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left text-sm text-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40"
              data-testid="focus-home-headline"
            >
              <span>{headline}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ) : (
            <p
              className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-foreground shadow-sm backdrop-blur"
              data-testid="focus-home-headline"
            >
              {headline}
            </p>
          )
        ) : null}

        {top.length > 0 ? (
          <div className="space-y-2" data-testid="focus-home-top-items">
            {top.slice(0, 3).map((item) => (
              <Link
                key={item.to + item.text}
                to={item.to}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm shadow-sm backdrop-blur transition-colors hover:border-primary/40"
              >
                <span>{item.text}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        ) : null}

        <div className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground">
            <Mic className="mr-1 inline h-3 w-3" aria-hidden />
            Just talk — “what matters today?”, “what needs my approval?”,
            “open my workspace”. Typing in the Otzar dock works the same
            way.
          </p>
          <Link
            to="/app/my-day"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            data-testid="focus-home-open-workbench"
          >
            Open the full workbench <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
