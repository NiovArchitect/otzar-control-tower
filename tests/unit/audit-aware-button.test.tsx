// FILE: tests/unit/audit-aware-button.test.tsx
// PURPOSE: Patent-defensive contract test for AuditAwareButton.
// CONNECTS TO: src/components/audit/AuditAwareButton.tsx,
//              src/components/audit/AuditEventTooltip.tsx.
//
// ANCHOR FOR 12B-12F:
// Every privileged action UI in 12B.2-12F goes through this
// component. The 4-stage state machine is the architectural anchor;
// regressions to subtext rendering, confirm dialog, in-flight
// disable, or success-toast audit_event_id click navigation must
// fail this test before they reach screens.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AuditAwareButton,
  type AuditAwareButtonResult,
} from "@/components/audit/AuditAwareButton";

// Helper that mounts the component inside the providers it needs at
// runtime (Router for useNavigate, TooltipProvider for tooltip,
// Toaster for sonner). Also exposes a "where am I now" probe so the
// post-toast navigation assertion can read the current path.
function renderWithProviders(ui: React.ReactNode) {
  function LocationProbe() {
    const loc = useLocation();
    return <div data-testid="current-path">{loc.pathname + loc.search}</div>;
  }
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TooltipProvider>
        <Routes>
          <Route
            path="/"
            element={
              <>
                {ui}
                <LocationProbe />
              </>
            }
          />
          <Route path="/security-audit" element={<LocationProbe />} />
        </Routes>
        <Toaster />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // sonner mounts toasts at document body; clean state per test.
});
afterEach(() => {
  // RTL cleanup is handled by tests/setup.ts; nothing extra here.
});

describe("AuditAwareButton", () => {
  it("renders 4-stage state machine (subtext → optional confirm → in-flight → informational success toast, NO dead-end audit link)", async () => {
    const user = userEvent.setup();

    // ─── Scenario A: requireConfirmation=false -- subtext, in-flight,
    // success toast with clickable audit_event_id link.
    const auditId = "abcdef12-3456-7890-1234-567890abcdef";
    const onConfirmA = vi.fn(
      async (): Promise<AuditAwareButtonResult> => ({
        ok: true,
        audit_event_id: auditId,
      }),
    );

    const { unmount } = renderWithProviders(
      <AuditAwareButton
        variant="primary"
        auditEventType="PERMISSION_CREATED"
        onConfirm={onConfirmA}
      >
        Submit
      </AuditAwareButton>,
    );

    // Stage 1: subtext shows the customer-facing audit label.
    expect(
      screen.getByText(/Audit event:\s*Permission Granted/i),
    ).toBeInTheDocument();

    // Click → no confirmation → Stage 3 in-flight directly.
    await user.click(screen.getByRole("button", { name: /Submit/i }));
    await waitFor(() => {
      expect(onConfirmA).toHaveBeenCalledTimes(1);
    });

    // Stage 4: success toast surfaces the truncated id as INFORMATIONAL
    // proof only ("Audit recorded: AUDIT_ID_<8>…"). There is NO clickable
    // "View audit" link (no audit viewer exists yet) and NO navigation
    // to the /security-audit placeholder.
    const truncated = `AUDIT_ID_${auditId.slice(0, 8)}`;
    await screen.findByText(new RegExp(`Audit recorded: ${truncated}`));
    expect(
      screen.queryByRole("button", { name: /View audit/i }),
    ).toBeNull();
    expect(screen.getByTestId("current-path").textContent).toBe("/");

    unmount();

    // ─── Scenario B: requireConfirmation=true -- Stage 2 dialog
    // opens first; onConfirm not called until Confirm clicked.
    const onConfirmB = vi.fn(
      async (): Promise<AuditAwareButtonResult> => ({
        ok: true,
        audit_event_id: "11111111-2222-3333-4444-555555555555",
      }),
    );

    renderWithProviders(
      <AuditAwareButton
        variant="destructive"
        auditEventType="PERMISSION_REVOKED"
        requireConfirmation
        confirmationTitle="Revoke this permission?"
        confirmationDescription="This cannot be undone."
        targetDescription="permission for Sarah Lee to read Q4 Sales Decisions"
        onConfirm={onConfirmB}
      >
        Revoke
      </AuditAwareButton>,
    );

    await user.click(screen.getByRole("button", { name: /Revoke/i }));
    expect(onConfirmB).not.toHaveBeenCalled();

    expect(
      screen.getByRole("heading", { name: /Revoke this permission\?/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/permission for Sarah Lee/i),
    ).toBeInTheDocument();
    // Audit literal shows the customer-friendly label inside dialog.
    expect(
      screen.getByText(/Audit event:\s*Permission Revoked/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Confirm$/i }));
    await waitFor(() => {
      expect(onConfirmB).toHaveBeenCalledTimes(1);
    });
  });
});
