// FILE: tests/unit/grant-permission-dialog.test.tsx
// PURPOSE: 12B.4 anchor test (Test 12) for GrantPermissionDialog.
//          Asserts the three Foundation-contract invariants the
//          submit path MUST hold under future refactors:
//          (a) Body shape: capsule_grants[] is built via
//              capsule_ids.map(id => ({ capsule_id, scope,
//              can_share_forward, duration_type })) -- NOT a flat
//              capsule_ids[] (Drift 1 prevention).
//          (b) write_reason discipline: when set, the body carries
//              the trimmed string; when blank or whitespace-only, the
//              body OMITS the property entirely (undefined, NEVER ""
//              -- Drift 7 verification).
//          (c) Failure path (GRANTEE_NO_TAR): Stage 4 fail-toast
//              surfaces the Foundation result.message AND no
//              audit_event_id leaks (12B.0 contract).
//
//          All three sub-assertions sit inside ONE it() block so the
//          test count stays at 12 per the 12B.4 discipline target.
// CONNECTS TO: src/components/access-control/GrantPermissionDialog.tsx,
//              tests/msw/handlers.ts (getRecordedShareCalls +
//              GRANTEE_NO_TAR_FIXTURE_ID).

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GrantPermissionDialog } from "@/components/access-control/GrantPermissionDialog";
import { server } from "../msw/server";
import {
  getRecordedShareCalls,
  resetRecordedShareCalls,
  GRANTEE_NO_TAR_FIXTURE_ID,
} from "../msw/handlers";

const SARAH_ID = "00000000-aaaa-bbbb-cccc-000000000001";

function renderDialog() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/access-control"]}>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <GrantPermissionDialog open onOpenChange={() => {}} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetRecordedShareCalls();
});
afterEach(() => {
  resetRecordedShareCalls();
});

describe("GrantPermissionDialog", () => {
  it("posts capsule_grants[] (Drift 1) with write_reason omit-when-blank discipline (Drift 7) and surfaces Foundation's failure message on GRANTEE_NO_TAR (12B.0 fail-path contract)", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // ════════════════════════════════════════════════════════════════
    // SUB-ASSERTION (a) + (b, blank case):
    // capsule_grants[] body shape exact + write_reason omitted when
    // blank.
    // ════════════════════════════════════════════════════════════════
    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /Grantee/i }),
      ).toHaveTextContent(/Pick a recipient/);
    });

    await user.click(screen.getByRole("combobox", { name: /Grantee/i }));
    await user.click(await screen.findByText(/Sarah Lee/));

    // Pick two DECISION capsules so capsule_grants[] has two entries
    // and Drift 1 (NOT a flat capsule_ids[]) is exercised.
    const decisionCheckboxes = await screen.findAllByRole("checkbox", {
      name: /Select Decisions capsule/,
    });
    expect(decisionCheckboxes.length).toBeGreaterThanOrEqual(2);
    await user.click(decisionCheckboxes[0]!);
    await user.click(decisionCheckboxes[1]!);

    // Defaults: scope=METADATA_ONLY, can_share_forward=false,
    // duration_type=TEMPORARY. write_reason left blank.
    await user.click(
      screen.getByRole("button", { name: /Grant permission/i }),
    );

    await waitFor(() => {
      expect(getRecordedShareCalls().count).toBe(1);
    });

    const blankBody = getRecordedShareCalls().lastBody as Record<
      string,
      unknown
    >;
    expect(blankBody.grantee_entity_id).toBe(SARAH_ID);
    expect(blankBody).toHaveProperty("capsule_grants");
    expect(blankBody).not.toHaveProperty("capsule_ids");
    const grants = blankBody.capsule_grants as Array<Record<string, unknown>>;
    expect(Array.isArray(grants)).toBe(true);
    expect(grants).toHaveLength(2);
    for (const g of grants) {
      expect(g).toHaveProperty("capsule_id");
      expect(g.scope).toBe("METADATA_ONLY");
      expect(g.can_share_forward).toBe(false);
      expect(g.duration_type).toBe("TEMPORARY");
      expect(g).not.toHaveProperty("expires_at");
    }
    // Drift 7: blank reason → property omitted entirely (NOT "").
    expect(blankBody).not.toHaveProperty("write_reason");

    // ════════════════════════════════════════════════════════════════
    // SUB-ASSERTION (b, filled case):
    // write_reason with whitespace gets trimmed and included.
    // ════════════════════════════════════════════════════════════════
    cleanup();
    resetRecordedShareCalls();

    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /Grantee/i }),
      ).toHaveTextContent(/Pick a recipient/);
    });

    await user.click(screen.getByRole("combobox", { name: /Grantee/i }));
    await user.click(await screen.findByText(/Sarah Lee/));

    const oneCheckbox = await screen.findAllByRole("checkbox", {
      name: /Select .+ capsule/,
    });
    await user.click(oneCheckbox[0]!);

    const reasonField = screen.getByRole("textbox", {
      name: /Reason for grant/i,
    });
    await user.clear(reasonField);
    await user.type(reasonField, "  Q4 audit  ");

    await user.click(
      screen.getByRole("button", { name: /Grant permission/i }),
    );

    await waitFor(() => {
      expect(getRecordedShareCalls().count).toBe(1);
    });

    const filledBody = getRecordedShareCalls().lastBody as Record<
      string,
      unknown
    >;
    expect(filledBody.write_reason).toBe("Q4 audit");

    // ════════════════════════════════════════════════════════════════
    // SUB-ASSERTION (c):
    // GRANTEE_NO_TAR fail-toast surfaces result.message and OMITS
    // any audit_event_id (12B.0 failure-path contract).
    // ════════════════════════════════════════════════════════════════
    cleanup();
    resetRecordedShareCalls();

    // Override entities to surface the GRANTEE_NO_TAR fixture id so
    // the picker can target it. server.resetHandlers() runs in
    // tests/setup.ts afterEach -- this override is scoped to this it().
    server.use(
      http.get("http://localhost:3000/api/v1/org/entities", () =>
        HttpResponse.json(
          {
            ok: true,
            items: [
              {
                entity_id: GRANTEE_NO_TAR_FIXTURE_ID,
                entity_type: "PERSON",
                display_name: "No-TAR Subject",
                email: "no-tar@example.com",
                status: "ACTIVE",
                clearance_level: 1,
                public_key: "pk",
                failed_auth_attempts: 0,
                suspended_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
              },
            ],
            total: 1,
            skip: 0,
            take: 25,
          },
          { status: 200 },
        ),
      ),
    );

    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /Grantee/i }),
      ).toHaveTextContent(/Pick a recipient/);
    });

    await user.click(screen.getByRole("combobox", { name: /Grantee/i }));
    await user.click(await screen.findByText(/No-TAR Subject/));

    const failCheckboxes = await screen.findAllByRole("checkbox", {
      name: /Select .+ capsule/,
    });
    await user.click(failCheckboxes[0]!);

    await user.click(
      screen.getByRole("button", { name: /Grant permission/i }),
    );

    // AuditAwareForm renders `Action failed: ${result.error}` on the
    // failure arm. result.error carries Foundation's message verbatim
    // per Refinement 3 -- no synthetic translation.
    const failToast = await screen.findByText(
      /Action failed: Grantee has no TAR/,
    );
    expect(failToast).toBeInTheDocument();

    // Sanity: NO audit_event_id was surfaced (success-toast
    // description format is `AUDIT_ID_<8>…`; absence proves the
    // failure arm took).
    expect(screen.queryByText(/AUDIT_ID_/)).toBeNull();

    const region = screen.queryByRole("region", {
      name: /Notifications/i,
    });
    if (region) {
      expect(within(region).queryByText(/Action complete/i)).toBeNull();
    }

    consoleError.mockRestore();
  });
});
