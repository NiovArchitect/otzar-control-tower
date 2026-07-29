// FILE: DemoRoleValueCard.tsx
// PURPOSE: Above-the-fold operating brief for YC demo personas.
//          Prefers live DGI / My Work / collaboration truth over static copy.
// CONNECTS TO: live-role-brief.ts, quiet-hours-display, api, AmbientWorkSurface.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { readDemoPersonaKey } from "@/lib/demo/demo-persona-value";
import {
  composeLiveRoleBrief,
  type LiveRoleBrief,
  type LiveRoleBriefField,
} from "@/lib/demo/live-role-brief";
import {
  formatQuietHoursHuman,
  formatWorkingHoursHuman,
  type WorkingPolicyView,
} from "@/lib/demo/quiet-hours-display";

function FieldRow({
  label,
  field,
  testId,
}: {
  label: string;
  field: LiveRoleBriefField;
  testId: string;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-2">
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd
        className="text-slate-600"
        data-testid={testId}
        data-source={field.source}
        data-evidence={field.evidence ?? ""}
      >
        {field.text}
      </dd>
    </div>
  );
}

/**
 * WHAT: Live-backed chief-of-staff briefing card for the active demo persona.
 * INPUT: sessionStorage persona key + live API snapshots.
 * OUTPUT: null when not a demo session; otherwise role-value card.
 */
export function DemoRoleValueCard(): JSX.Element | null {
  const key = readDemoPersonaKey();
  const [brief, setBrief] = useState<LiveRoleBrief | null>(() =>
    key ? composeLiveRoleBrief({ personaKey: key }) : null,
  );
  const [loading, setLoading] = useState(Boolean(key));
  const [hoursLine, setHoursLine] = useState<string | null>(null);
  const [quietLine, setQuietLine] = useState<string | null>(null);
  const [sponsorLine, setSponsorLine] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setBrief(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [dgiR, workR, inR, outR, profileR, twinR] = await Promise.all([
        api.otzar.dgiCoherence(),
        api.workOs.myWork({ take: 20 }),
        api.otzar.collaboration.inbound({ take: 20 }),
        api.otzar.collaboration.outbound({ take: 20 }),
        api.org.me.workProfile.get(),
        api.otzar.myTwin(),
      ]);
      if (cancelled) return;
      const dgi =
        dgiR.ok && dgiR.data?.coherence
          ? (dgiR.data.coherence as {
              open_active_work_titles?: string[];
              open_active_work_count?: number;
              attention_count?: number;
              next_best_step?: {
                kind?: string;
                safe_title?: string;
                reason?: string;
              };
              coherence_status?: string;
            })
          : null;
      const workItems =
        workR.ok && workR.data
          ? ((workR.data.items ??
              (workR.data as { entries?: unknown[] }).entries ??
              []) as Array<{
              title?: string;
              safe_title?: string;
              status?: string;
              state?: string;
              ledger_type?: string;
            }>)
          : [];
      const collabs = [
        ...(inR.ok && inR.data?.collaborations
          ? inR.data.collaborations
          : []),
        ...(outR.ok && outR.data?.collaborations
          ? outR.data.collaborations
          : []),
      ] as Array<{
        state?: string;
        request_type?: string;
        safe_summary?: string;
        purpose?: string;
      }>;
      setBrief(
        composeLiveRoleBrief({
          personaKey: key,
          dgi,
          workItems,
          collabs,
        }),
      );

      if (profileR.ok && profileR.data) {
        const pol = profileR.data.working_policy as WorkingPolicyView;
        const tz = profileR.data.timezone || profileR.data.org_timezone;
        setHoursLine(formatWorkingHoursHuman(pol, tz));
        setQuietLine(formatQuietHoursHuman(pol, tz));
      }

      // Contractor sponsor: first-class manager from role_scope / hierarchy
      // when twin role_scope_profile exposes manager, else department hint.
      if (key === "contractor" && twinR.ok && twinR.data?.twin) {
        const twin = twinR.data.twin as {
          role_title?: string;
          role_scope_profile?: {
            manager_display_name?: string;
            department?: string;
            reporting_manager?: string;
          } | null;
        };
        const mgr =
          twin.role_scope_profile?.manager_display_name ||
          twin.role_scope_profile?.reporting_manager ||
          null;
        const dept = twin.role_scope_profile?.department || null;
        if (mgr) {
          setSponsorLine(`Sponsored by ${mgr}${dept ? ` · ${dept}` : ""}`);
        } else if (dept && /sponsor/i.test(dept)) {
          setSponsorLine(dept);
        } else {
          setSponsorLine(
            "Sponsored security diligence (manager relationship on hierarchy)",
          );
        }
      } else {
        setSponsorLine(null);
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key || !brief) return null;
  const v = brief;

  return (
    <section
      className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-white to-white px-3.5 py-3 shadow-sm"
      data-testid="demo-role-value-card"
      data-persona-key={v.key}
      data-role-label={v.roleLabel}
      data-live-fields={String(v.liveFieldCount)}
      data-fully-live={v.fullyLive ? "true" : "false"}
      data-loading={loading ? "true" : "false"}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
        {v.roleLabel}
        {v.fullyLive ? (
          <span className="ml-2 font-medium normal-case tracking-normal text-emerald-700">
            · live
          </span>
        ) : loading ? (
          <span className="ml-2 font-medium normal-case tracking-normal text-slate-400">
            · loading truth…
          </span>
        ) : (
          <span className="ml-2 font-medium normal-case tracking-normal text-amber-700">
            · {v.liveFieldCount}/5 live
          </span>
        )}
      </p>
      <p
        className="mt-1 text-sm font-semibold leading-snug text-slate-900"
        data-testid="demo-role-who"
      >
        {v.who}
      </p>
      {sponsorLine ? (
        <p
          className="mt-1 text-[11px] font-medium text-indigo-800"
          data-testid="demo-contractor-sponsor"
        >
          {sponsorLine}
        </p>
      ) : null}
      <dl className="mt-2 grid gap-1.5 text-xs leading-snug">
        <FieldRow
          label="Current outcome"
          field={v.outcome}
          testId="demo-role-outcome"
        />
        <FieldRow
          label="Otzar handled"
          field={v.otzarHandled}
          testId="demo-role-otzar-handled"
        />
        <FieldRow
          label="Needs you"
          field={v.needsYou}
          testId="demo-role-needs-human"
        />
        <FieldRow
          label="AI Teammate now"
          field={v.aiTeammateNow}
          testId="demo-role-ai-teammate"
        />
        <FieldRow
          label="Org impact"
          field={v.orgImpact}
          testId="demo-role-org-impact"
        />
      </dl>
      {(hoursLine || quietLine) && (
        <p
          className="mt-2 text-[10px] leading-snug text-slate-500"
          data-testid="demo-hours-quiet"
        >
          {hoursLine ? <span>Working hours: {hoursLine}. </span> : null}
          {quietLine ? (
            <span data-testid="demo-quiet-hours">Quiet hours: {quietLine}.</span>
          ) : null}
        </p>
      )}
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
