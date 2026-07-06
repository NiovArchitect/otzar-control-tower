// FILE: tests/unit/decision-rights-pages.test.tsx
// PURPOSE: [BLOCK-3A] the two decision-rights surfaces:
//          - /setup/company-profile "Decision rights" card: renders the
//            org summary with humanized domain labels (no raw enum
//            tokens), the boundary doctrine copy ("do not grant tool
//            access"), and the calm per-person editor that PATCHes the
//            exact three-list payload; honest empty state.
//          - /app/work-schedule "Your decision rights" card: read-only
//            posture (own / approve / recommend-not-finalize +
//            escalation guidance), the required Twin-boundary copy, and
//            the honest unset state.
//          - neither surface overclaims authority or leaks raw enums.
// CONNECTS TO: CompanyProfile.tsx, WorkSchedule.tsx,
//          api.org.decisionRights / api.org.me.decisionRights,
//          src/lib/labels/decision-domains.ts.

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

function operatingProfileHandlers() {
  return [
    http.get(`${API}/org/operating-profile`, () =>
      HttpResponse.json({
        ok: true,
        org_display_name: "Redwood Atlas Studio, Inc.",
        org_timezone: "America/Los_Angeles",
        working_policy: { work_start_min: 540 },
        calendar_connected: false,
        scheduling_note: NOTE,
      }),
    ),
    http.get(`${API}/org/entities`, () =>
      HttpResponse.json({
        ok: true,
        items: [
          { entity_id: "11111111-1111-4111-8111-111111111111", display_name: "Elena Torres", entity_type: "PERSON" },
          { entity_id: "22222222-2222-4222-8222-222222222222", display_name: "Maya Chen", entity_type: "PERSON" },
        ],
        total: 2,
        skip: 0,
        take: 200,
      }),
    ),
  ];
}

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: true, can_admin_org: true, can_admin_niov: false },
  });
});

describe("[BLOCK-3A] Company Profile — decision-rights admin card", () => {
  it("renders the org summary with humanized labels + boundary doctrine; editor PATCHes the exact payload", async () => {
    const patches: Array<{ url: string; body: Record<string, unknown> }> = [];
    server.use(
      ...operatingProfileHandlers(),
      http.get(`${API}/org/decision-rights`, () =>
        HttpResponse.json({
          ok: true,
          members: [
            {
              entity_id: "11111111-1111-4111-8111-111111111111",
              display_name: "Elena Torres",
              owns: ["technical", "architecture"],
              can_approve: ["execution"],
              recommend_only: ["deadline"],
            },
          ],
          settable_domains: ["strategic", "technical", "product", "design", "security", "legal", "finance", "people", "customer", "execution", "architecture", "deadline"],
        }),
      ),
      http.patch(`${API}/org/members/:id/decision-rights`, async ({ request, params }) => {
        patches.push({ url: String(params.id), body: (await request.json()) as Record<string, unknown> });
        return HttpResponse.json({
          ok: true,
          rights: { owns: ["strategic"], can_approve: [], recommend_only: ["technical"], updated_at: "2026-07-06T00:00:00Z" },
        });
      }),
    );
    render(
      <MemoryRouter>
        <CompanyProfilePage />
      </MemoryRouter>,
    );

    // Doctrine copy: routing purpose + the two boundary sentences.
    const doctrine = (await screen.findByTestId("decision-rights-doctrine")).textContent ?? "";
    expect(doctrine).toContain("route decisions and avoid overstepping");
    expect(doctrine).toContain("do not grant tool access");
    expect(doctrine).toContain("access and authority boundaries");

    // Summary renders humanized labels — never raw enum tokens.
    const summary = (await screen.findByTestId("decision-rights-summary")).textContent ?? "";
    expect(summary).toContain("Elena Torres");
    expect(summary).toContain("Owns: Technical, Architecture");
    expect(summary).toContain("Approves: Execution");
    expect(summary).toContain("Recommends: Timelines");
    expect(summary).not.toContain("recommend_only");
    expect(summary).not.toContain("can_approve");
    expect(summary).not.toContain("deadline");

    // Editor: pick Maya, set Strategy=Owns and Technical=Recommend only,
    // save → the exact three-list payload for HER id.
    await userEvent.selectOptions(
      screen.getByTestId("decision-rights-person-select"),
      "22222222-2222-4222-8222-222222222222",
    );
    await userEvent.selectOptions(screen.getByTestId("decision-rights-domain-strategic"), "owns");
    await userEvent.selectOptions(screen.getByTestId("decision-rights-domain-technical"), "recommend_only");
    await userEvent.click(screen.getByTestId("decision-rights-save"));
    await screen.findByTestId("decision-rights-notice");
    expect(patches).toEqual([
      {
        url: "22222222-2222-4222-8222-222222222222",
        body: { owns: ["strategic"], can_approve: [], recommend_only: ["technical"] },
      },
    ]);

    // No fake authority claims anywhere on the page — "grant tool access"
    // may appear ONLY inside the honest negation ("do not grant …").
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/(?<!not )grants? (tool|full) (access|authority)|can act autonomously|unlimited authority/i);
    expect(body).toContain("do not grant tool access");
  });

  it("honest empty state when no rights are set", async () => {
    server.use(
      ...operatingProfileHandlers(),
      http.get(`${API}/org/decision-rights`, () =>
        HttpResponse.json({ ok: true, members: [], settable_domains: [] }),
      ),
    );
    render(
      <MemoryRouter>
        <CompanyProfilePage />
      </MemoryRouter>,
    );
    const empty = (await screen.findByTestId("decision-rights-empty")).textContent ?? "";
    expect(empty).toContain("No decision rights set yet");
    expect(empty).toContain("reads decision signals from conversations");
  });
});

describe("[BLOCK-3A] Work Schedule — the employee's own posture", () => {
  function workProfileHandler() {
    return http.get(`${API}/org/me/work-profile`, () =>
      HttpResponse.json({
        ok: true,
        timezone: "America/Denver",
        org_timezone: "America/Los_Angeles",
        working_policy: { work_start_min: 540 },
        scheduling_note: NOTE,
      }),
    );
  }

  it("renders the read-only posture with labels, escalation guidance, and the required Twin-boundary copy", async () => {
    server.use(
      workProfileHandler(),
      http.get(`${API}/org/me/decision-rights`, () =>
        HttpResponse.json({
          ok: true,
          rights: {
            owns: ["technical"],
            can_approve: ["execution"],
            recommend_only: ["deadline"],
            updated_at: "2026-07-06T00:00:00Z",
          },
          note: "Decision rights help Otzar route decisions and avoid overstepping. They do not grant tool access.",
        }),
      ),
    );
    render(
      <MemoryRouter>
        <WorkSchedulePage />
      </MemoryRouter>,
    );
    const doctrine = (await screen.findByTestId("decision-rights-posture-doctrine")).textContent ?? "";
    expect(doctrine).toContain("Decision rights help Otzar route decisions and avoid overstepping.");
    expect(doctrine).toContain("Decision rights do not grant tool access.");
    expect(doctrine).toContain("Your AI Twin follows your access and authority boundaries.");

    expect((await screen.findByTestId("decision-rights-owns")).textContent).toContain("Technical");
    expect(screen.getByTestId("decision-rights-approves").textContent).toContain("Execution");
    const rec = screen.getByTestId("decision-rights-recommends").textContent ?? "";
    expect(rec).toContain("not finalize");
    expect(rec).toContain("Timelines");
    expect(screen.getByTestId("decision-rights-escalation").textContent).toContain("escalate to its owner");

    // Read-only: no save affordance for the posture, no raw enums.
    const body = document.body.textContent ?? "";
    expect(body).not.toContain("recommend_only");
    expect(body).not.toContain("can_approve");
  });

  it("honest unset posture renders the server note", async () => {
    server.use(
      workProfileHandler(),
      http.get(`${API}/org/me/decision-rights`, () =>
        HttpResponse.json({
          ok: true,
          rights: null,
          note: "No structured decision rights are set for you yet. Otzar reads decision signals from conversations until your admin sets them.",
        }),
      ),
    );
    render(
      <MemoryRouter>
        <WorkSchedulePage />
      </MemoryRouter>,
    );
    const empty = (await screen.findByTestId("decision-rights-posture-empty")).textContent ?? "";
    expect(empty).toContain("No structured decision rights are set for you yet");
  });
});
