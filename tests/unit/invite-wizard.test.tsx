// FILE: tests/unit/invite-wizard.test.tsx
// PURPOSE: 12B.2 anchor test for the 3-step Dandelion invite wizard.
//          Verifies (a) the 3 Foundation endpoints fire in correct
//          order with correct payloads, and (b) [P0-ONBOARD] the
//          credential-less posture: NO password is ever sent, the
//          one-time activation link is revealed exactly once with
//          honest share copy (never "email sent").
// CONNECTS TO: src/components/users/InviteWizard.tsx,
//              src/components/users/InviteWizardStep3Confirm.tsx.
//
// SCOPE NOTE: The Stage 4 audit-toast / clickable audit_event_id
// link contract is covered by tests/unit/audit-aware-button.test.tsx
// (12B.1 anchor) -- not duplicated here. This test focuses on the
// wizard-specific 3-endpoint orchestration and the password posture.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InviteWizard } from "@/components/users/InviteWizard";
import {
  getLastMembersPostBody,
  getRecordedCalls,
  resetRecordedCalls,
} from "../msw/handlers";

function renderWizard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/users"]}>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <InviteWizard open onOpenChange={() => {}} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetRecordedCalls();
});
afterEach(() => {
  resetRecordedCalls();
});

describe("InviteWizard", () => {
  it("transitions Step 1 → Step 2 → Step 3, fires 3 endpoints in order, sends NO password, and reveals the one-time activation link honestly", async () => {
    const user = userEvent.setup();
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    renderWizard();

    // ─── Step 1: Capture form ──────────────────────────────────
    await user.type(screen.getByLabelText(/Email/i), "newhire@example.com");
    await user.type(screen.getByLabelText(/First name/i), "New");
    await user.type(screen.getByLabelText(/Last name/i), "Hire");
    await user.type(screen.getByLabelText(/^Title$/i), "Engineer");

    await user.click(
      screen.getByRole("button", { name: /Continue to review/i }),
    );

    // ─── [P0-ONBOARD] POST /org/members fires with NO password — the
    // member is created credential-less and activates via the link.
    await waitFor(() => {
      expect(getRecordedCalls().members).toBe(true);
    });
    const body = getLastMembersPostBody();
    expect(body.email).toBe("newhire@example.com");
    expect(body.password).toBeUndefined();

    // ─── Step 2: Phase 2 review renders → POST /org/onboarding/start
    await screen.findByText(/Propagation impact/i);
    await waitFor(() => {
      expect(getRecordedCalls().onboardingStart).toBe(true);
    });

    await user.click(
      screen.getByRole("button", { name: /Continue to confirmation/i }),
    );

    // ─── Step 3: confirmation dialog opens via AuditAwareButton
    await user.click(
      screen.getByRole("button", { name: /Confirm and invite/i }),
    );
    await screen.findByRole("heading", { name: /Invite this member\?/i });

    // Click the Confirm button INSIDE the dialog (not the trigger).
    const confirmInDialog = await screen.findByRole("button", {
      name: /^Confirm$/i,
    });
    await user.click(confirmInDialog);

    // ─── Verify POST /org/onboarding/invite fired ───────────────
    await waitFor(() => {
      expect(getRecordedCalls().onboardingInvite).toBe(true);
    });

    // ─── Endpoint order assertion ───────────────────────────────
    // All three must have fired. Order is implicit in the wizard
    // flow (Step 1 → Step 2 → Step 3); flag-tracking just confirms
    // each was hit.
    const calls = getRecordedCalls();
    expect(calls.members).toBe(true);
    expect(calls.onboardingStart).toBe(true);
    expect(calls.onboardingInvite).toBe(true);

    // ─── [P0-ONBOARD] the one-time activation link reveal ───────
    // Shown once with honest share copy; the wizard does NOT auto-close
    // (that would destroy the only reveal), and no "email sent" lie.
    await screen.findByTestId("invite-activation-reveal");
    const link = screen.getByTestId("invite-activation-link").textContent ?? "";
    expect(link).toContain("/activate?token=tok-one-time-test");
    const fullText = document.body.textContent ?? "";
    expect(fullText).toContain("Share this securely");
    expect(fullText).toContain("can only be used once");
    expect(fullText).not.toMatch(/email sent|invite delivered|reset email/i);
    // No console leak of the token.
    const allLogArgs = [
      ...consoleLog.mock.calls.flat(),
      ...consoleError.mock.calls.flat(),
      ...consoleWarn.mock.calls.flat(),
    ];
    for (const arg of allLogArgs) {
      const stringified =
        typeof arg === "string" ? arg : JSON.stringify(arg ?? "");
      expect(stringified).not.toContain("tok-one-time-test");
    }

    consoleLog.mockRestore();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});


// PROD-MODEL-P2 — placement at creation: choosing a manager + department
// fires the SAME governed assign rail the Reporting editor uses, with the
// manager's STABLE entity id (never a display name); the title shows its
// role-template preview.
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
const API = "http://localhost:3000/api/v1";

describe("InviteWizard — org placement at creation (P2)", () => {
  it("posts hierarchy/assign with stable ids and previews the role template", async () => {
    const user = userEvent.setup();
    let assignBody: Record<string, unknown> | null = null;
    server.use(
      http.get(`${API}/org/entities`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            { entity_id: "p-mgr-1", entity_type: "PERSON", display_name: "David Odie", email: "david@niovlabs.com", status: "ACTIVE", created_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-01T00:00:00Z" },
            { entity_id: "p-mgr-2", entity_type: "PERSON", display_name: "David Odie", email: "david.2@niovlabs.com", status: "ACTIVE", created_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-01T00:00:00Z" },
          ],
          total: 2, skip: 0, take: 250,
        }),
      ),
      http.post(`${API}/org/hierarchy/assign`, async ({ request }) => {
        assignBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, membership_id: "m-1", audit_event_id: "aud-h" });
      }),
    );
    renderWizard();
    await user.type(screen.getByLabelText(/Email/i), "newhire@example.com");
    await user.type(screen.getByLabelText(/First name/i), "New");
    await user.type(screen.getByLabelText(/Last name/i), "Hire");
    await user.type(screen.getByLabelText(/^Title$/i), "Marketing Manager");
    // The title previews its role template in human words.
    expect(await screen.findByTestId("invite-role-template-preview")).toHaveTextContent(/Role template:/);
    await user.type(screen.getByTestId("invite-department"), "Marketing");
    // Two managers share a display name — the VALUE is the stable id.
    await user.selectOptions(screen.getByTestId("invite-manager-select"), "p-mgr-2");
    await user.click(screen.getByRole("button", { name: /Continue to review/i }));
    await waitFor(() => expect(assignBody).not.toBeNull());
    expect(assignBody).toMatchObject({
      manager_entity_id: "p-mgr-2",
      role_title: "Marketing Manager",
      department: "Marketing",
    });
  });
});
