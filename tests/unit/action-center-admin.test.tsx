// FILE: tests/unit/action-center-admin.test.tsx
// PURPOSE: RC2 Action Center hub — overview + approvals/reviews tabs.
// CONNECTS TO: src/pages/ActionCenterAdmin.tsx

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActionCenterAdminPage } from "@/pages/ActionCenterAdmin";

vi.mock("@/pages/Approvals", () => ({
  ApprovalsPage: () => <div data-testid="mock-approvals">Approvals queue</div>,
}));
vi.mock("@/pages/ReviewCenter", () => ({
  ReviewCenterPage: () => <div data-testid="mock-reviews">Review center</div>,
}));
vi.mock("@/hooks/use-pending-approvals", () => ({
  usePendingApprovals: () => ({ data: 2 }),
}));
vi.mock("@/hooks/use-reviewable-count", () => ({
  useReviewableCount: () => ({ data: 1 }),
}));

function renderHub(path = "/approvals"): void {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <ActionCenterAdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Action Center admin hub", () => {
  it("shows attention banner with combined counts", () => {
    renderHub();
    expect(screen.getByTestId("action-center-admin")).toBeInTheDocument();
    expect(screen.getByTestId("action-center-attention-banner").textContent).toMatch(
      /3 items waiting/,
    );
  });

  it("opens approvals queue from overview", async () => {
    const user = userEvent.setup();
    renderHub();
    await user.click(screen.getByTestId("action-center-open-approvals"));
    expect(screen.getByTestId("mock-approvals")).toBeInTheDocument();
  });

  it("honors ?tab=reviews", () => {
    renderHub("/approvals?tab=reviews");
    expect(screen.getByTestId("mock-reviews")).toBeInTheDocument();
  });
});
