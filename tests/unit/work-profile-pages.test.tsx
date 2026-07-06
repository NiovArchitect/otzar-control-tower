// FILE: tests/unit/work-profile-pages.test.tsx
// PURPOSE: [ORG-SUBSTRATE] the two operating-context surfaces:
//          - /setup/company-profile: renders the org's time zone truth,
//            honest working-hours defaults ("not configurable yet"),
//            and the proposal-only calendar doctrine; saving PATCHes
//            the exact payload; failures honest
//          - /app/work-schedule: the employee's OWN time zone
//            (self-service copy: "yours to set, not your admin's"),
//            defaults display, honest calendar note; save PATCHes
//            exactly once
//          - neither page overclaims (no "calendar connected", no
//            "event created", no raw enums).
// CONNECTS TO: CompanyProfile.tsx, WorkSchedule.tsx,
//          api.org.operatingProfile / api.org.me.workProfile.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { CompanyProfilePage } from "@/pages/CompanyProfile";
import { WorkSchedulePage } from "@/pages/app/WorkSchedule";
import { useAuthStore } from "@/lib/stores/auth";

const API = "http://localhost:3000/api/v1";
const NOTE =
  "Proposed times only — creating calendar events requires a connected calendar, which isn't set up yet.";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: true, can_admin_org: true, can_admin_niov: false },
  });
});

describe("[ORG-SUBSTRATE] Company Profile — org operating truth", () => {
  it("renders truth + doctrine, saves the exact payload, never overclaims", async () => {
    const patches: Array<Record<string, unknown>> = [];
    server.use(
      http.get(`${API}/org/operating-profile`, () =>
        HttpResponse.json({
          ok: true,
          org_display_name: "Redwood Atlas Studio, Inc.",
          org_timezone: "America/Los_Angeles",
          working_policy: { work_start_min: 540, work_end_min: 1050, lunch_start_min: 720, lunch_end_min: 780, working_days: [1, 2, 3, 4, 5] },
          calendar_connected: false,
          scheduling_note: NOTE,
        }),
      ),
      http.patch(`${API}/org/operating-profile`, async ({ request }) => {
        patches.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, org_timezone: "America/Denver" });
      }),
    );
    render(
      <MemoryRouter>
        <CompanyProfilePage />
      </MemoryRouter>,
    );
    expect((await screen.findByTestId("company-profile-doctrine")).textContent).toContain(
      "Otzar manages relevance",
    );
    // Org truth renders.
    const tz = (await screen.findByTestId("company-timezone-select")) as HTMLSelectElement;
    expect(tz.value).toBe("America/Los_Angeles");
    expect(screen.getByTestId("company-profile-timezone").textContent).toContain("Redwood Atlas Studio");
    // Working hours: defaults + honest not-configurable-yet.
    const hours = screen.getByTestId("company-hours-copy").textContent ?? "";
    expect(hours).toContain("9:00 AM–5:30 PM");
    expect(hours).toContain("12:00–1:00 PM protected for lunch");
    expect(hours).toContain("not configurable in-product yet");
    // Calendar doctrine: proposal-only, never created.
    const cal = screen.getByTestId("company-calendar-copy").textContent ?? "";
    expect(cal).toContain("Proposed times only");
    expect(cal).toContain("never claims it created an event");
    // Save posts the exact payload.
    await userEvent.selectOptions(tz, "America/Denver");
    await userEvent.click(screen.getByTestId("company-timezone-save"));
    await screen.findByTestId("company-profile-notice");
    expect(patches).toEqual([{ org_timezone: "America/Denver" }]);
    // No overclaims anywhere — "is connected" may appear only inside the
    // honest "Until a calendar is connected…" framing.
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/calendar is connected and|event (was )?created|Google Calendar is live|calendar: connected/i);
    expect(body).toContain("Until a calendar is connected");
  });
});

describe("[ORG-SUBSTRATE] Work Schedule — the employee's own clock", () => {
  it("self-service copy, org context, exact single PATCH, honest defaults", async () => {
    const patches: Array<Record<string, unknown>> = [];
    server.use(
      http.get(`${API}/org/me/work-profile`, () =>
        HttpResponse.json({
          ok: true,
          timezone: "America/Denver",
          org_timezone: "America/Los_Angeles",
          working_policy: { work_start_min: 540 },
          scheduling_note: NOTE,
        }),
      ),
      http.patch(`${API}/org/me/work-profile`, async ({ request }) => {
        patches.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, timezone: "America/New_York" });
      }),
    );
    render(
      <MemoryRouter>
        <WorkSchedulePage />
      </MemoryRouter>,
    );
    expect((await screen.findByTestId("work-schedule-copy")).textContent).toContain(
      "yours to set, not your admin's",
    );
    const tz = (await screen.findByTestId("work-timezone-select")) as HTMLSelectElement;
    expect(tz.value).toBe("America/Denver");
    expect(document.body.textContent).toContain("America/Los_Angeles"); // org context shown
    await userEvent.selectOptions(tz, "America/New_York");
    await userEvent.click(screen.getByTestId("work-timezone-save"));
    await screen.findByTestId("work-schedule-notice");
    expect(patches).toEqual([{ timezone: "America/New_York" }]);
    expect(screen.getByTestId("work-schedule-hours").textContent).toContain("not configurable in-product yet");
    expect(screen.getByTestId("work-schedule-calendar").textContent).toContain("Proposed times only");
  });
});
