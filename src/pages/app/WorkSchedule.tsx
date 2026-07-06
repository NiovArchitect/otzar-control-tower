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
import { Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

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

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await api.org.me.workProfile.get();
      if (!alive) return;
      if (r.ok) {
        setTimezone(r.data.timezone ?? "");
        setOrgTimezone(r.data.org_timezone);
        setSchedulingNote(r.data.scheduling_note);
        setState("ready");
      } else {
        setState("failed");
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
    </div>
  );
}
