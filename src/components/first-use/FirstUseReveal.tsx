// FILE: FirstUseReveal.tsx
// PURPOSE: One-shot first-login recognition — a single calm strip, not a
//          second dashboard. Role-aware CTAs (leader vs teammate) for first
//          value without scroll tax. Uses live context-health + DGI.
// CONNECTS TO: AmbientWorkSurface hero, first-use/state.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { nameFromEmail } from "@/lib/identity/person-name";
import {
  hasCompletedFirstUse,
  markFirstUseComplete,
} from "@/lib/first-use/state";
import type { ContextHealthResponse } from "@/lib/types/foundation";

function openOrb(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otzar:open"));
  }
}

/** Compact strip for the Today hero — never a multi-card wall. */
export function FirstUseReveal(): JSX.Element | null {
  const entity = useAuthStore((s) => s.entity);
  const capabilities = useAuthStore((s) => s.capabilities);
  const email = entity?.email ?? null;
  const admin = isOrgAdmin(capabilities);
  const [dismissed, setDismissed] = useState(() => hasCompletedFirstUse(email));
  const [ctx, setCtx] = useState<ContextHealthResponse | null>(null);
  const [signal, setSignal] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(hasCompletedFirstUse(email));
  }, [email]);

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    void (async () => {
      const [health, dgi] = await Promise.all([
        api.otzar.contextHealth(),
        api.otzar.dgiCoherence(),
      ]);
      if (cancelled) return;
      if (health.ok) setCtx(health.data);
      if (dgi.ok && dgi.data?.coherence) {
        const c = dgi.data.coherence;
        if (c.attention_count > 0) {
          setSignal(
            `${c.attention_count} item${c.attention_count === 1 ? "" : "s"} need attention`,
          );
        } else if (c.open_incoming_handoffs_count > 0) {
          setSignal(
            `${c.open_incoming_handoffs_count} handoff${c.open_incoming_handoffs_count === 1 ? "" : "s"} waiting`,
          );
        } else if (c.next_best_step && c.next_best_step.kind !== "IDLE_HEALTHY") {
          setSignal(c.next_best_step.safe_title);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dismissed]);

  if (dismissed) return null;

  const identity = ctx?.identity;
  const displayName =
    identity?.viewer?.display_name || nameFromEmail(email) || "there";
  const firstName = displayName.split(" ")[0] ?? displayName;
  const orgName = identity?.org?.name ?? "your organization";
  const role =
    identity?.viewer?.title ||
    identity?.viewer?.org_role ||
    (admin ? "leader" : null);

  // Role first-value: leaders/managers → People structure; IC → Needs me.
  const roleLower = (role ?? "").toLowerCase();
  const managerish =
    admin ||
    /\b(manager|lead|director|founder|ceo|head|owner)\b/i.test(roleLower);
  const primaryCta = managerish
    ? {
        label: admin ? "See my org" : "See my people",
        to: "/app/collaboration",
        testId: admin ? "first-use-see-org" : "first-use-see-people",
      }
    : {
        label: "What needs me",
        to: "/app/action-center",
        testId: "first-use-needs-me",
      };

  const secondaryHint = managerish
    ? "Check who reports to whom, then talk or clear what needs you."
    : "Your AI Teammate is ready — start with what needs you, or talk.";

  const roleBand = admin ? "leader" : managerish ? "manager" : "teammate";

  function complete(): void {
    markFirstUseComplete(email);
    setDismissed(true);
  }

  return (
    <div
      className="mt-3 rounded-2xl border border-indigo-200/50 bg-white/55 px-3 py-2.5 backdrop-blur-sm"
      data-testid="first-use-reveal"
      data-role={roleBand}
    >
      <div className="flex items-start gap-2.5">
        <Sparkles
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-snug text-slate-800"
            data-testid="first-use-recognition"
          >
            <span className="font-semibold">Welcome, {firstName}.</span>{" "}
            {role ? (
              <>
                {orgName}
                <span className="text-slate-500"> · {role}</span>
              </>
            ) : (
              <>{orgName}</>
            )}
            {signal ? (
              <span
                className="mt-0.5 block text-xs text-slate-500"
                data-testid="first-use-org"
              >
                {signal}
              </span>
            ) : (
              <span
                className="mt-0.5 block text-xs text-slate-500"
                data-testid="first-use-teammate"
              >
                {secondaryHint}
              </span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              to={primaryCta.to}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
              data-testid={primaryCta.testId}
              onClick={() => complete()}
            >
              {primaryCta.label}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-white"
              data-testid="first-use-start-day"
              onClick={() => complete()}
            >
              Start my day
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-white"
              data-testid="first-use-talk"
              onClick={() => {
                complete();
                openOrb();
              }}
            >
              Talk
            </button>
            <button
              type="button"
              className="text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              data-testid="first-use-review-work"
              onClick={() => complete()}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
