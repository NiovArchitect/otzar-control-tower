// FILE: tests/unit/twin-detail-drawer.test.tsx
// PURPOSE: 12B.3 anchor test (Test 9 -- independence assertion) for
//          TwinDetailDrawer. Verifies TWO architectural anchors in
//          one mount sweep:
//          (1) Single-fetch architecture: Overview + Skills tabs
//              power off ONE GET /org/ai-teammates/:id; the Skills
//              tab renders hydrated package.name without firing
//              GET /org/skill-packages.
//          (2) is_admin_twin × autonomy_level INDEPENDENCE
//              (12B.1 Emphasis 3): EXECUTIVE_OVERRIDE the badge is
//              driven solely by `is_admin_twin === true`. The
//              autonomy_level literal "EXECUTIVE_OVERRIDE" is a
//              Behavior Policy MODE for non-admin twins and must
//              NOT light up the badge.
// CONNECTS TO: src/components/ai-teammates/TwinDetailDrawer.tsx,
//              tests/msw/handlers.ts (recordedTwinCalls), MSW
//              server.use() for the Scenario B variant.
//
// WHY THIS TEST:
// Drift 5 was resolved by Foundation HEAD ee4dafb adding
// GET /org/ai-teammates/:id with hydrated `skills.package`. The
// architectural anchor is "no N+1 against /org/skill-packages from
// the drawer" -- this test fails if a future change reintroduces
// that N+1. The independence-cross prevents a future regression
// where an engineer accidentally derives EXECUTIVE_OVERRIDE from
// autonomy_level instead of is_admin_twin (a tempting but wrong
// shortcut, since the strings collide). Stage 4 audit-toast
// contract is covered by audit-aware-button.test.tsx, not
// duplicated here.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TwinDetailDrawer } from "@/components/ai-teammates/TwinDetailDrawer";
import {
  getRecordedTwinCalls,
  resetRecordedTwinCalls,
} from "../msw/handlers";
import { server } from "../msw/server";
import type { AITeammateListItem } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";
const TWIN_A_ID = "20000000-aaaa-bbbb-cccc-000000000001";
const TWIN_B_ID = "20000000-aaaa-bbbb-cccc-000000000002";
const OWNER_ID = "00000000-aaaa-bbbb-cccc-000000000001";

// Scenario A: ADMIN twin in APPROVAL_REQUIRED mode. Default MSW
// handler covers this -- it's the seeded twin in handlers.ts.
const TWIN_A: AITeammateListItem = {
  entity_id: TWIN_A_ID,
  display_name: "Sarah's AI Teammate",
  status: "ACTIVE",
  created_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  config: {
    twin_id: TWIN_A_ID,
    autonomy_level: "APPROVAL_REQUIRED",
    swarm_enabled: false,
    role_template: "Executive Assistant",
    is_admin_twin: true,
    approver_entity_id: null,
    updated_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
};

// Scenario B: NON-admin twin whose autonomy_level *literal* happens
// to be "EXECUTIVE_OVERRIDE". This is the independence cross --
// the badge must NOT render even though the autonomy string matches.
const TWIN_B: AITeammateListItem = {
  entity_id: TWIN_B_ID,
  display_name: "Mark's AI Teammate",
  status: "ACTIVE",
  created_at: new Date(Date.now() - 14 * 86_400_000).toISOString(),
  config: {
    twin_id: TWIN_B_ID,
    autonomy_level: "EXECUTIVE_OVERRIDE",
    swarm_enabled: false,
    role_template: "Schedule Coordinator",
    is_admin_twin: false,
    approver_entity_id: OWNER_ID,
    updated_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
};

function renderDrawer(twin: AITeammateListItem) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/ai-teammates"]}>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <TwinDetailDrawer twin={twin} open onOpenChange={() => {}} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetRecordedTwinCalls();
});
afterEach(() => {
  resetRecordedTwinCalls();
});

describe("TwinDetailDrawer", () => {
  it("single-fetch architecture + is_admin_twin × autonomy_level independence (Emphasis 3)", async () => {
    const user = userEvent.setup();

    // ════════════════════════════════════════════════════════════
    // SCENARIO A -- admin twin, APPROVAL_REQUIRED mode.
    // Default MSW handler returns is_admin_twin=true,
    // autonomy_level=APPROVAL_REQUIRED, skills hydrated with the
    // "Calendar Coordination" SkillPackage.
    // ════════════════════════════════════════════════════════════
    const a = renderDrawer(TWIN_A);

    await waitFor(() => {
      expect(getRecordedTwinCalls().detail).toBe(true);
    });

    // Display name + EXECUTIVE_OVERRIDE badge + Behavior Policy
    // label all derive from the SAME response.
    const headingsA = await screen.findAllByText(/Sarah's AI Teammate/);
    expect(headingsA.length).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText(/Admin-level authority/i).length,
    ).toBeGreaterThan(0);
    await screen.findAllByText(/Approval required/i);

    // Skills tab: hydrated package.name renders WITHOUT a follow-up
    // GET /org/skill-packages call (lazy-fetched only when the
    // AssignSkillButton popover opens, which we don't open here).
    const skillsTabsA = screen.getAllByRole("tab", { name: /^Skills$/i });
    await user.click(skillsTabsA[0] as HTMLElement);
    await screen.findAllByText(/Calendar Coordination/);

    expect(getRecordedTwinCalls().skillPackagesList).toBe(false);

    a.unmount();
    resetRecordedTwinCalls();

    // ════════════════════════════════════════════════════════════
    // SCENARIO B -- NON-admin twin whose autonomy_level literal
    // happens to be EXECUTIVE_OVERRIDE. server.use() overrides the
    // default handler for THIS twin's id only -- we keep the
    // recorder pattern intact for the assertion below.
    // ════════════════════════════════════════════════════════════
    server.use(
      http.get(`${API_BASE}/org/ai-teammates/:id`, async ({ params }) => {
        const id = String(params.id);
        return HttpResponse.json(
          {
            ok: true,
            entity: {
              entity_id: id,
              entity_type: "AI_AGENT",
              display_name: "Mark's AI Teammate",
              email: null,
              status: "ACTIVE",
              clearance_level: 3,
              public_key: "pk_twin_b",
              failed_auth_attempts: 0,
              suspended_at: null,
              created_at: new Date(Date.now() - 14 * 86_400_000).toISOString(),
              updated_at: new Date(Date.now() - 3_600_000).toISOString(),
              deleted_at: null,
            },
            twin_config: {
              twin_id: id,
              autonomy_level: "EXECUTIVE_OVERRIDE",
              swarm_enabled: false,
              role_template: "Schedule Coordinator",
              is_admin_twin: false,
              approver_entity_id: OWNER_ID,
              updated_at: new Date(Date.now() - 3_600_000).toISOString(),
            },
            owner_entity_id: OWNER_ID,
            skills: [],
          },
          { status: 200 },
        );
      }),
    );

    renderDrawer(TWIN_B);

    await screen.findAllByText(/Mark's AI Teammate/);

    // Independence assertion: even though autonomy_level === the
    // string "EXECUTIVE_OVERRIDE", is_admin_twin is false so the
    // badge MUST NOT render. queryAllByLabelText returns [] when
    // nothing matches (does not throw, unlike getAllByLabelText).
    expect(screen.queryAllByLabelText(/Admin-level authority/i)).toHaveLength(0);

    // Behavior Policy label still reads "Executive override" via
    // the autonomy-levels label map -- driven by autonomy_level,
    // independent of the missing badge.
    await screen.findAllByText(/Executive override/i);
  });
});
