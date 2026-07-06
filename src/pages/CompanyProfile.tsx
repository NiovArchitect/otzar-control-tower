// FILE: CompanyProfile.tsx
// PURPOSE: [ORG-SUBSTRATE] "/setup/company-profile" — the admin's ONE
//          calm place for company operating truth: org time zone,
//          default working hours and lunch/protected time (policy
//          defaults, honestly labeled), and connector truth (calendar
//          not connected → Otzar proposes times, never creates events).
//          Boundary doctrine on the page: admins govern boundaries;
//          Otzar manages relevance; no document tagging, no chores.
// CONNECTS TO: api.org.operatingProfile (GET/PATCH — admin-gated
//          server-side), OrgSetup pointer, scheduling-policy defaults,
//          tests/unit/company-profile.test.tsx.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
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

export function CompanyProfilePage() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [schedulingNote, setSchedulingNote] = useState<string>("");
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await api.org.operatingProfile.get();
      if (!alive) return;
      if (r.ok) {
        setOrgName(r.data.org_display_name);
        setTimezone(r.data.org_timezone ?? "");
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
    const r = await api.org.operatingProfile.patch(timezone);
    setSaving(false);
    setNotice(
      r.ok && r.data.ok
        ? "Company time zone saved. Otzar uses it when reasoning about schedules and working hours."
        : "That couldn't be saved right now. Nothing was changed — try again.",
    );
  }

  return (
    <div className="space-y-6" data-testid="company-profile-page">
      <PageHeader
        title="Company Profile"
        description="Company operating truth — time zone, working hours, and what scheduling can honestly do today."
      />
      <p className="text-xs text-muted-foreground" data-testid="company-profile-doctrine">
        This helps Otzar reason about your organization. You govern the
        boundaries here; Otzar manages relevance — you never need to tag
        documents or classify details.
      </p>

      {state === "failed" ? (
        <p className="text-xs text-amber-600" data-testid="company-profile-failed">
          The company profile couldn't load right now. Nothing changed — try again.
        </p>
      ) : null}

      <Card data-testid="company-profile-timezone">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4" aria-hidden /> Time zone
            {orgName !== null ? (
              <span className="ml-auto text-xs font-normal text-muted-foreground">{orgName}</span>
            ) : null}
          </CardTitle>
          <CardDescription className="text-xs">
            The organization's home time zone. People keep their own time
            zones — Otzar reasons across both.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            data-testid="company-timezone-select"
            disabled={state !== "ready"}
          >
            <option value="">Choose a time zone…</option>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => void save()} disabled={saving || timezone.length === 0} data-testid="company-timezone-save">
            {saving ? "Saving…" : "Save"}
          </Button>
          {notice !== null ? (
            <span className="text-xs text-muted-foreground" data-testid="company-profile-notice">
              {notice}
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card data-testid="company-profile-hours">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" aria-hidden /> Working hours &amp; protected time
          </CardTitle>
          <CardDescription className="text-xs" data-testid="company-hours-copy">
            Current defaults: Monday–Friday, 9:00 AM–5:30 PM in each
            person's local time zone, with 12:00–1:00 PM protected for
            lunch. Otzar schedules around these. Per-team and per-person
            hours are not configurable in-product yet.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card data-testid="company-profile-calendar">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Calendar &amp; scheduling truth</CardTitle>
          <CardDescription className="text-xs" data-testid="company-calendar-copy">
            {schedulingNote.length > 0
              ? schedulingNote
              : "Proposed times only — creating calendar events requires a connected calendar, which isn't set up yet."}{" "}
            Until a calendar is connected, Otzar drafts and proposes
            schedules with time zones and conflicts explained — it never
            claims it created an event.{" "}
            <Link to="/setup/data-flow" className="font-medium text-foreground underline underline-offset-2">
              See per-source truth in Data Flow
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
