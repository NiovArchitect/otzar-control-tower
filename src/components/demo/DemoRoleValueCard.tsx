// FILE: DemoRoleValueCard.tsx
// PURPOSE: Above-the-fold five-second role value for YC demo personas.
//          Shows only when a demo persona session is active.
// CONNECTS TO: demo-persona-value.ts, AmbientWorkSurface (Today).

import {
  demoPersonaValueFor,
  readDemoPersonaKey,
} from "@/lib/demo/demo-persona-value";

/**
 * WHAT: Compact chief-of-staff briefing card for the active demo persona.
 * INPUT: sessionStorage otzar_demo_persona_key (set by DemoPersonaLauncher).
 * OUTPUT: null when not a demo session; otherwise role-value card.
 */
export function DemoRoleValueCard(): JSX.Element | null {
  const key = readDemoPersonaKey();
  if (!key) return null;
  const v = demoPersonaValueFor(key);

  return (
    <section
      className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-white to-white px-3.5 py-3 shadow-sm"
      data-testid="demo-role-value-card"
      data-persona-key={v.key}
      data-role-label={v.roleLabel}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
        Your role · {v.roleLabel}
      </p>
      <p
        className="mt-1 text-sm font-semibold leading-snug text-slate-900"
        data-testid="demo-role-who"
      >
        {v.who}
      </p>
      <dl className="mt-2 space-y-1.5 text-xs leading-snug">
        <div>
          <dt className="font-semibold text-slate-700">Current result</dt>
          <dd className="text-slate-600" data-testid="demo-role-outcome">
            {v.outcome}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Otzar handled</dt>
          <dd className="text-slate-600" data-testid="demo-role-otzar-handled">
            {v.otzarHandled}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Needs you</dt>
          <dd className="text-slate-600" data-testid="demo-role-needs-human">
            {v.needsHuman}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Organization impact</dt>
          <dd className="text-slate-600" data-testid="demo-role-org-impact">
            {v.orgImpact}
          </dd>
        </div>
      </dl>
      <p
        className="mt-2 rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1.5 text-[11px] text-slate-600"
        data-testid="demo-role-talk-prompt"
      >
        <span className="font-medium text-indigo-700">Ask Talk: </span>
        {v.talkPrompt}
      </p>
    </section>
  );
}
