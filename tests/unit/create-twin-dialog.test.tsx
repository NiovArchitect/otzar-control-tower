// FILE: tests/unit/create-twin-dialog.test.tsx
// PURPOSE: 12B.3 anchor test (Test 10) for CreateTwinDialog. Verifies
//          (a) the body shape posted to POST /org/ai-teammates is
//          exactly { owner_entity_id, role_title, is_admin_invite }
//          per 12B.0 contract -- NO synthetic name/skill_package_id/
//          behavior_policy fields, and (b) the success path surfaces
//          the real audit_event_id from AITeammateCreateResponse.
// CONNECTS TO: src/components/ai-teammates/CreateTwinDialog.tsx,
//              tests/msw/handlers.ts (recordedTwinCalls.createBody +
//              twinCreateAuditId).
//
// SCOPE: Stage 4 audit-toast and clickable audit-link contract is
// covered by audit-aware-button.test.tsx; this test focuses on the
// create-flow body shape and the real-id flow through
// AuditAwareForm.

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CreateTwinDialog } from "@/components/ai-teammates/CreateTwinDialog";
import {
  getRecordedTwinCalls,
  resetRecordedTwinCalls,
} from "../msw/handlers";

// The MSW entitiesListHandler returns a single PERSON
// "Sarah Lee" with this entity_id; same id we expect to flow into
// the POST body. The MSW aiTeammatesListHandler returns one twin
// owned by a DIFFERENT seed person, so Sarah remains eligible.
const SARAH_ID = "00000000-aaaa-bbbb-cccc-000000000001";
const EXPECTED_AUDIT_ID = "60000000-aaaa-bbbb-cccc-000000000001";

function renderDialog() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/ai-teammates"]}>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <CreateTwinDialog open onOpenChange={() => {}} />
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

describe("CreateTwinDialog", () => {
  it("posts the 12B.0 body shape and surfaces the real audit_event_id", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderDialog();

    // Wait for the eligible-members fetch to populate the picker.
    await waitFor(() => {
      expect(getRecordedTwinCalls().list).toBe(true);
    });

    // ─── Pick owner via the Combobox ────────────────────────────
    await user.click(screen.getByRole("combobox", { name: /Owner/i }));
    const sarahItem = await screen.findByText(/Sarah Lee/);
    await user.click(sarahItem);

    // ─── EXECUTIVE_OVERRIDE checkbox: opt in to verify the
    //     boolean flows through unchanged.
    await user.click(
      screen.getByRole("checkbox", { name: /admin-level authority/i }),
    );

    // ─── Submit ─────────────────────────────────────────────────
    await user.click(
      screen.getByRole("button", { name: /Create AI Teammate/i }),
    );

    await waitFor(() => {
      expect(getRecordedTwinCalls().create).toBe(true);
    });

    // ─── Body shape: only the 3 fields per 12B.0 contract ──────
    const body = getRecordedTwinCalls().createBody;
    expect(body).toEqual({
      owner_entity_id: SARAH_ID,
      role_title: "Digital Twin",
      is_admin_invite: true,
    });
    // No synthetic fields.
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("skill_package_id");
    expect(body).not.toHaveProperty("behavior_policy");

    // ─── Stage 4 toast surfaces the real audit_event_id (truncated
    //     form) as informational proof -- "Audit recorded: AUDIT_ID_<8>…".
    const truncated = `AUDIT_ID_${EXPECTED_AUDIT_ID.slice(0, 8)}`;
    await screen.findByText(new RegExp(`Audit recorded: ${truncated}`));

    consoleError.mockRestore();
  });
});
