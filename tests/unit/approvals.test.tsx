// FILE: tests/unit/approvals.test.tsx
// PURPOSE: Page tests for the employee Approvals surface. Verifies the
//          caller's pending list renders, approve/reject round-trip via
//          MSW, the can_write_capsules gating, the self-target
//          "awaiting a second approver" rule, the empty state, and that
//          no substrate vocabulary / org-wide framing leaks.
// CONNECTS TO: src/pages/app/Approvals.tsx,
//              src/components/employee/ApprovalDetailDrawer.tsx,
//              tests/msw/handlers.ts, src/lib/stores/auth.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Approvals } from "@/pages/app/Approvals";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setWrite(write: boolean) {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: write,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

function renderApprovals() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Approvals />
    </QueryClientProvider>,
  );
}

beforeEach(() => setWrite(true));

describe("Approvals (employee Otzar)", () => {
  it("renders the caller's pending list with product-safe language", async () => {
    renderApprovals();
    const list = await screen.findByTestId("approvals-list");
    expect(list).toHaveTextContent(/denied access to a knowledge item/i);
    expect(list).toHaveTextContent(/Access gate review/i); // COMPLIANCE_GATE label
    // No substrate vocabulary or raw reference id surfaced.
    expect(list).not.toHaveTextContent(/capsule/i);
    expect(list).not.toHaveTextContent(/cap-ref-0001/);
  });

  it("frames the page as 'waiting on you', not an org-wide queue", async () => {
    renderApprovals();
    await screen.findByTestId("approvals-list");
    expect(
      screen.getByText(/waiting on your decision/i),
    ).toBeInTheDocument();
  });

  it("renders the empty state when there are no approvals", async () => {
    server.use(
      http.get(`${API_BASE}/escalations/pending`, async () =>
        HttpResponse.json({ ok: true, escalations: [] }, { status: 200 }),
      ),
    );
    renderApprovals();
    expect(await screen.findByTestId("approvals-empty")).toBeInTheDocument();
  });

  it("approves a request and closes the drawer", async () => {
    const user = userEvent.setup();
    renderApprovals();
    const row = await screen.findByText(/denied access to a knowledge item/i);
    await user.click(row);
    const approveBtn = await screen.findByRole("button", {
      name: /^approve$/i,
    });
    await user.click(approveBtn);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /^approve$/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("rejects a request and closes the drawer", async () => {
    const user = userEvent.setup();
    renderApprovals();
    const row = await screen.findByText(/denied access to a knowledge item/i);
    await user.click(row);
    const rejectBtn = await screen.findByRole("button", { name: /^reject$/i });
    await user.click(rejectBtn);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /^reject$/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("disables actions and shows 'awaiting a second approver' for a self-raised request", async () => {
    const user = userEvent.setup();
    renderApprovals();
    const row = await screen.findByText(
      /privileged action pending a second approver/i,
    );
    await user.click(row);
    expect(
      await screen.findByTestId("awaiting-second-approver"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^approve$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a read-only state without can_write_capsules", async () => {
    setWrite(false);
    const user = userEvent.setup();
    renderApprovals();
    const row = await screen.findByText(/denied access to a knowledge item/i);
    await user.click(row);
    expect(
      await screen.findByText(
        /write capability required to approve or reject/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^approve$/i }),
    ).not.toBeInTheDocument();
  });
});
