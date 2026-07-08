// FILE: WorkSchedule.tsx
// PURPOSE: [ORG-SUBSTRATE] "/app/work-schedule" — the employee's own
//          operating context: set YOUR time zone (self-service, no
//          admin needed), see the working-hours and lunch defaults
//          Otzar schedules around, and the honest calendar truth
//          (proposals, never created events, until a calendar is
//          connected). Personal operating context stays personal —
//          admins govern org boundaries, not your clock.
// CONNECTS TO: api.org.me.workProfile (GET/PATCH self-scoped),
//          nav-employee ("Work Schedule"), scheduling-policy defaults,
//          tests/unit/work-schedule.test.tsx.

import { useEffect, useState } from "react";
import { Clock, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { DecisionRightsPosture } from "@/lib/types/foundation";
import { decisionDomainLabel } from "@/lib/labels/decision-domains";

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function WorkSchedulePage() {
  const [timezone, setTimezone] = useState("");
  const [orgTimezone, setOrgTimezone] = useState<string | null>(null);
  const [schedulingNote, setSchedulingNote] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // [BLOCK-3A] the caller's own decision-rights posture (read-only).
  const [rights, setRights] = useState<DecisionRightsPosture | null>(null);
  const [rightsNote, setRightsNote] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [r, dr] = await Promise.all([
        api.org.me.workProfile.get(),
        api.org.me.decisionRights.get(),
      ]);
      if (!alive) return;
      if (r.ok) {
        setTimezone(r.data.timezone ?? "");
        setOrgTimezone(r.data.org_timezone);
        setSchedulingNote(r.data.scheduling_note);
        setState("ready");
      } else {
        setState("failed");
      }
      if (dr.ok) {
        setRights(dr.data.rights);
        setRightsNote(dr.data.note);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function save(): Promise<void> {
    if (saving || timezone.length === 0) return;
    setSaving(true);
    setNotice(null);
    const r = await api.org.me.workProfile.patch(timezone);
    setSaving(false);
    setNotice(
      r.ok && r.data.ok
        ? "Saved. Otzar now schedules around your local time."
        : "That couldn't be saved right now. Nothing was changed — try again.",
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6" data-testid="work-schedule-page">
      <div>
        <h1 className="text-lg font-semibold">Work Schedule</h1>
        <p className="text-sm text-muted-foreground" data-testid="work-schedule-copy">
          Your time zone and working hours. Otzar schedules around them —
          this is yours to set, not your admin's.
        </p>
      </div>

      {state === "failed" ? (
        <p className="text-xs text-amber-600" data-testid="work-schedule-failed">
          Your schedule settings couldn't load right now. Nothing changed — try again.
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" aria-hidden /> Your time zone
          </CardTitle>
          <CardDescription className="text-xs">
            {orgTimezone !== null
              ? `Your organization's home time zone is ${orgTimezone}; yours can differ.`
              : "Set where you work from — teammates may be in other time zones."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              data-testid="work-timezone-select"
              disabled={state !== "ready"}
            >
              <option value="">Choose your time zone…</option>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={() => void save()} disabled={saving || timezone.length === 0} data-testid="work-timezone-save">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {notice !== null ? (
            <p className="text-xs text-muted-foreground" data-testid="work-schedule-notice">
              {notice}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground" data-testid="work-schedule-hours">
            Working hours default to Monday–Friday, 9:00 AM–5:30 PM your
            local time, with 12:00–1:00 PM protected for lunch. Custom
            hours are not configurable in-product yet.
          </p>
          <p className="text-xs text-muted-foreground" data-testid="work-schedule-calendar">
            {schedulingNote.length > 0
              ? schedulingNote
              : "Proposed times only — creating calendar events requires a connected calendar, which isn't set up yet."}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="decision-rights-posture">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4" aria-hidden /> Your decision rights
          </CardTitle>
          <CardDescription className="text-xs" data-testid="decision-rights-posture-doctrine">
            Decision rights help Otzar route decisions and avoid
            overstepping. Decision rights do not grant tool access. Your AI
            Teammate follows your access and authority boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rights === null ? (
            <p className="text-xs text-muted-foreground" data-testid="decision-rights-posture-empty">
              {rightsNote.length > 0
                ? rightsNote
                : "No structured decision rights are set for you yet. Otzar reads decision signals from conversations until your admin sets them."}
            </p>
          ) : (
            <div className="space-y-1 text-xs" data-testid="decision-rights-posture-lists">
              {rights.owns.length > 0 ? (
                <p data-testid="decision-rights-owns">
                  <span className="font-medium">You own:</span>{" "}
                  {rights.owns.map(decisionDomainLabel).join(", ")}
                </p>
              ) : null}
              {rights.can_approve.length > 0 ? (
                <p data-testid="decision-rights-approves">
                  <span className="font-medium">You can approve:</span>{" "}
                  {rights.can_approve.map(decisionDomainLabel).join(", ")}
                </p>
              ) : null}
              {rights.recommend_only.length > 0 ? (
                <p data-testid="decision-rights-recommends">
                  <span className="font-medium">You can recommend (not finalize):</span>{" "}
                  {rights.recommend_only.map(decisionDomainLabel).join(", ")}
                </p>
              ) : null}
              <p className="text-muted-foreground" data-testid="decision-rights-escalation">
                Anything outside these areas is one to recommend and
                escalate to its owner — Otzar helps route it there.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
