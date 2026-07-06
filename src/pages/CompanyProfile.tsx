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
import { Clock, Globe, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { DecisionDomain, DecisionRightsPosture } from "@/lib/types/foundation";
import { DECISION_DOMAINS, decisionDomainLabel } from "@/lib/labels/decision-domains";

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

type DomainPosture = "" | "owns" | "can_approve" | "recommend_only";

type RightsMember = { entity_id: string; display_name: string } & DecisionRightsPosture;

function postureToLists(posture: Record<DecisionDomain, DomainPosture>): DecisionRightsPosture {
  const out: DecisionRightsPosture = { owns: [], can_approve: [], recommend_only: [] };
  for (const domain of DECISION_DOMAINS) {
    const p = posture[domain];
    if (p !== "") out[p].push(domain);
  }
  return out;
}

function listsToPosture(rights: DecisionRightsPosture | undefined): Record<DecisionDomain, DomainPosture> {
  const out = {} as Record<DecisionDomain, DomainPosture>;
  for (const domain of DECISION_DOMAINS) {
    out[domain] = rights?.owns.includes(domain)
      ? "owns"
      : rights?.can_approve.includes(domain)
        ? "can_approve"
        : rights?.recommend_only.includes(domain)
          ? "recommend_only"
          : "";
  }
  return out;
}

function summarizeMember(m: RightsMember): string {
  const parts: string[] = [];
  if (m.owns.length > 0) parts.push(`Owns: ${m.owns.map(decisionDomainLabel).join(", ")}`);
  if (m.can_approve.length > 0) parts.push(`Approves: ${m.can_approve.map(decisionDomainLabel).join(", ")}`);
  if (m.recommend_only.length > 0)
    parts.push(`Recommends: ${m.recommend_only.map(decisionDomainLabel).join(", ")}`);
  return parts.join(" · ");
}

export function CompanyProfilePage() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [schedulingNote, setSchedulingNote] = useState<string>("");
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // [BLOCK-3A] decision-rights editor state.
  const [rightsMembers, setRightsMembers] = useState<RightsMember[]>([]);
  const [people, setPeople] = useState<Array<{ entity_id: string; display_name: string }>>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [posture, setPosture] = useState<Record<DecisionDomain, DomainPosture>>(listsToPosture(undefined));
  const [rightsSaving, setRightsSaving] = useState(false);
  const [rightsNotice, setRightsNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [r, rights, members] = await Promise.all([
        api.org.operatingProfile.get(),
        api.org.decisionRights.list(),
        api.org.entities.list({ type: "PERSON", take: 200 }),
      ]);
      if (!alive) return;
      if (r.ok) {
        setOrgName(r.data.org_display_name);
        setTimezone(r.data.org_timezone ?? "");
        setSchedulingNote(r.data.scheduling_note);
        setState("ready");
      } else {
        setState("failed");
      }
      if (rights.ok) setRightsMembers(rights.data.members);
      if (members.ok)
        setPeople(
          members.data.items.map((e) => ({ entity_id: e.entity_id, display_name: e.display_name })),
        );
    })();
    return () => {
      alive = false;
    };
  }, []);

  function pickPerson(entityId: string): void {
    setSelectedPerson(entityId);
    setRightsNotice(null);
    setPosture(listsToPosture(rightsMembers.find((m) => m.entity_id === entityId)));
  }

  async function saveRights(): Promise<void> {
    if (rightsSaving || selectedPerson.length === 0) return;
    setRightsSaving(true);
    setRightsNotice(null);
    const lists = postureToLists(posture);
    const r = await api.org.decisionRights.setForMember(selectedPerson, lists);
    setRightsSaving(false);
    if (r.ok && r.data.ok) {
      setRightsNotice("Decision rights saved. Otzar routes decisions in these areas accordingly.");
      const person = people.find((p) => p.entity_id === selectedPerson);
      setRightsMembers((prev) => [
        { entity_id: selectedPerson, display_name: person?.display_name ?? "", ...lists },
        ...prev.filter((m) => m.entity_id !== selectedPerson),
      ]);
    } else {
      setRightsNotice("That couldn't be saved right now. Nothing was changed — try again.");
    }
  }

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

      <Card data-testid="decision-rights-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4" aria-hidden /> Decision rights
          </CardTitle>
          <CardDescription className="text-xs" data-testid="decision-rights-doctrine">
            Who owns, approves, or recommends in each area. Decision rights
            help Otzar route decisions and avoid overstepping. Decision
            rights do not grant tool access, and AI Teammates follow each
            person's access and authority boundaries — rights never widen
            what anyone (or their AI Teammate) can do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rightsMembers.length > 0 ? (
            <ul className="space-y-1" data-testid="decision-rights-summary">
              {rightsMembers.map((m) => (
                <li key={m.entity_id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.display_name}</span>{" "}
                  — {summarizeMember(m)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground" data-testid="decision-rights-empty">
              No decision rights set yet. Until then, Otzar reads decision
              signals from conversations.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={selectedPerson}
              onChange={(e) => pickPerson(e.target.value)}
              data-testid="decision-rights-person-select"
            >
              <option value="">Choose a person…</option>
              {people.map((p) => (
                <option key={p.entity_id} value={p.entity_id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>

          {selectedPerson.length > 0 ? (
            <div className="space-y-1" data-testid="decision-rights-editor">
              {DECISION_DOMAINS.map((domain) => (
                <div key={domain} className="flex items-center justify-between gap-2">
                  <span className="text-xs">{decisionDomainLabel(domain)}</span>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={posture[domain]}
                    onChange={(e) =>
                      setPosture((prev) => ({ ...prev, [domain]: e.target.value as DomainPosture }))
                    }
                    data-testid={`decision-rights-domain-${domain}`}
                  >
                    <option value="">No role</option>
                    <option value="owns">Owns</option>
                    <option value="can_approve">Can approve</option>
                    <option value="recommend_only">Recommend only</option>
                  </select>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => void saveRights()}
                  disabled={rightsSaving}
                  data-testid="decision-rights-save"
                >
                  {rightsSaving ? "Saving…" : "Save decision rights"}
                </Button>
                {rightsNotice !== null ? (
                  <span className="text-xs text-muted-foreground" data-testid="decision-rights-notice">
                    {rightsNotice}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
