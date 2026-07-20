// FILE: FirstUseReveal.tsx
// PURPOSE: YC first-five-minutes reveal on the real Today surface — not a
//          separate onboarding universe. Uses live context-health + twin +
//          DGI when available. Sparse, role-aware, one primary action.
// CONNECTS TO: AmbientWorkSurface, first-use/state, contextHealth API.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, Building2, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { nameFromEmail } from "@/lib/identity/person-name";
import {
  hasCompletedFirstUse,
  markFirstUseComplete,
} from "@/lib/first-use/state";
import { GlassPanel } from "@/components/ambient/GlassPanel";
import { GLASS_CTA } from "@/lib/ambient/glass";
import type { ContextHealthResponse } from "@/lib/types/foundation";

function openOrb(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otzar:open"));
  }
}

export function FirstUseReveal(): JSX.Element | null {
  const entity = useAuthStore((s) => s.entity);
  const capabilities = useAuthStore((s) => s.capabilities);
  const email = entity?.email ?? null;
  const [dismissed, setDismissed] = useState(() => hasCompletedFirstUse(email));
  const [ctx, setCtx] = useState<ContextHealthResponse | null>(null);
  const [dgiLine, setDgiLine] = useState<string | null>(null);

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
        const bits: string[] = [];
        if (c.attention_count > 0) {
          bits.push(
            `${c.attention_count} item${c.attention_count === 1 ? "" : "s"} need attention`,
          );
        }
        if (c.open_org_truth_conflicts_count > 0) {
          bits.push(
            `${c.open_org_truth_conflicts_count} organizational decision${c.open_org_truth_conflicts_count === 1 ? "" : "s"} open`,
          );
        }
        if (c.open_incoming_handoffs_count > 0) {
          bits.push(
            `${c.open_incoming_handoffs_count} handoff${c.open_incoming_handoffs_count === 1 ? "" : "s"} waiting`,
          );
        }
        if (c.open_obligations_count > 0) {
          bits.push(
            `${c.open_obligations_count} open obligation${c.open_obligations_count === 1 ? "" : "s"}`,
          );
        }
        if (bits.length > 0) {
          setDgiLine(`Otzar sees ${bits.join(", ")} from live organization state.`);
        } else if (c.coherence_status) {
          setDgiLine(
            `Organization coherence is ${String(c.coherence_status).toLowerCase().replace(/_/g, " ")} — ask Otzar what the team is working on.`,
          );
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
    identity?.viewer?.display_name ||
    nameFromEmail(email) ||
    "there";
  const firstName = displayName.split(" ")[0] ?? displayName;
  const orgName = identity?.org?.name ?? "your organization";
  const role =
    identity?.viewer?.title ||
    identity?.viewer?.org_role ||
    (isOrgAdmin(capabilities) ? "Organization leader" : null);
  const twinName = identity?.twin?.display_name ?? "your AI Teammate";
  const admin = isOrgAdmin(capabilities);

  function complete(): void {
    markFirstUseComplete(email);
    setDismissed(true);
  }

  return (
    <GlassPanel
      intensity="working"
      className="space-y-4 p-5"
      data-testid="first-use-reveal"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-indigo-500/10 p-2">
          <Sparkles className="h-5 w-5 text-indigo-600" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-500/90">
            First minutes
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Welcome, {firstName}.
          </h2>
          <p className="text-sm text-slate-600" data-testid="first-use-recognition">
            {role
              ? `Otzar has prepared your workspace for ${orgName} as ${role}.`
              : `Otzar has prepared your workspace for ${orgName}. Your role or team needs confirmation if anything looks off.`}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/60 bg-white/50 p-3" data-testid="first-use-teammate">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-800">
            <Bot className="h-3.5 w-3.5" aria-hidden /> AI Teammate
          </div>
          <p className="text-xs text-slate-600">
            {twinName} can prepare work, find permitted context, coordinate with
            your team, draft documents, and track what you own — with your
            approval on what leaves.
          </p>
        </div>
        <div className="rounded-xl border border-white/60 bg-white/50 p-3" data-testid="first-use-org">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-800">
            <Building2 className="h-3.5 w-3.5" aria-hidden /> Organization
          </div>
          <p className="text-xs text-slate-600">
            {dgiLine ??
              "Ask what the team is working on — answers come from live organization state, not a generic chat."}
          </p>
        </div>
        <div className="rounded-xl border border-white/60 bg-white/50 p-3" data-testid="first-use-next">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-800">
            <Users className="h-3.5 w-3.5" aria-hidden /> What to do first
          </div>
          <p className="text-xs text-slate-600">
            {admin
              ? "Review what needs attention on Today, then open Control Tower only when you need org setup, people, or connections."
              : "Review what needs you, talk to your AI Teammate, or open Needs me for approvals and handoffs."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          className={`${GLASS_CTA} inline-flex items-center gap-1.5`}
          data-testid="first-use-start-day"
          onClick={() => {
            complete();
          }}
        >
          Start my day
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
          data-testid="first-use-talk"
          onClick={() => {
            complete();
            openOrb();
          }}
        >
          Talk to my AI Teammate
        </button>
        <Link
          to="/app/action-center"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          data-testid="first-use-review-work"
          onClick={() => complete()}
        >
          Review my current work
        </Link>
        {admin ? (
          <Link
            to="/setup"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
            data-testid="first-use-admin-setup"
            onClick={() => complete()}
          >
            Organization setup
          </Link>
        ) : null}
      </div>
      <p className="text-[10px] text-slate-500">
        This uses the same live work, people, and AI Teammate you will use every
        day — not a demo sandbox.
      </p>
    </GlassPanel>
  );
}
