// FILE: WalletPortabilityPanel.tsx
// PURPOSE: Phase-F My Twin surface — memory-wallet portability doctrine.
//          Personal layer travels; org data and secrets stay. Builds trust.
// CONNECTS TO: MyTwin.tsx, WalletPortabilityPosture types.

import { Shield, Sparkles, Building2, Lock } from "lucide-react";
import type { WalletPortabilityPosture } from "@/lib/types/foundation";
import { GLASS_SURFACE } from "@/lib/ambient/glass";

interface WalletPortabilityPanelProps {
  posture?: WalletPortabilityPosture | null;
}

function bucketIcon(cls: string): JSX.Element {
  if (cls === "PORTABLE_PERSONAL") {
    return <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden />;
  }
  if (cls === "ORG_SCOPED") {
    return <Building2 className="h-4 w-4 text-slate-500" aria-hidden />;
  }
  return <Lock className="h-4 w-4 text-rose-400" aria-hidden />;
}

export function WalletPortabilityPanel({ posture }: WalletPortabilityPanelProps) {
  if (!posture) return null;

  return (
    <section
      className={`${GLASS_SURFACE} p-5 sm:p-6`}
      data-testid="wallet-portability-panel"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10">
          <Shield className="h-5 w-5 text-indigo-600" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Your AI Teammate wallet
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {posture.portable_summary}
          </p>
        </div>
      </div>

      <ul className="space-y-3" data-testid="wallet-portability-buckets">
        {posture.buckets.map((b) => (
          <li
            key={b.class}
            className="rounded-2xl border border-white/60 bg-white/45 px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              {bucketIcon(b.class)}
              <p className="text-sm font-medium text-slate-900">{b.label}</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {b.description}
            </p>
            {b.examples.length > 0 ? (
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-500">
                {b.examples.slice(0, 3).map((ex) => (
                  <li key={ex}>{ex}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2 border-t border-white/50 pt-4">
        <p
          className="text-xs leading-relaxed text-slate-500"
          data-testid="wallet-org-retained"
        >
          {posture.org_retained_summary}
        </p>
        <p
          className="text-xs leading-relaxed text-slate-500"
          data-testid="wallet-never-export"
        >
          {posture.never_export_summary}
        </p>
      </div>
    </section>
  );
}
