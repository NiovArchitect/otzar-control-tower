// FILE: tests/unit/home-recent-activity.test.tsx
// PURPOSE: 12B.2 anchor test for the Home Recent Activity feed's
//          client-side ADMIN_ACTION filter (decision #23).
// CONNECTS TO: src/pages/Home.tsx,
//              tests/msw/handlers.ts (auditListHandler returns
//              mixed event_types so the filter is exercised).

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HomePage } from "@/pages/Home";

function renderHome() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <HomePage />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("Home -- Recent Activity client-side ADMIN_ACTION filter", () => {
  it("renders exactly 8 ADMIN_ACTION rows from a mixed audit response (no LOGIN_SUCCESS / CAPSULE_CREATED leakage)", async () => {
    renderHome();

    // The MSW handler returns 10 ADMIN_ACTION + 10 LOGIN_SUCCESS +
    // 5 CAPSULE_CREATED rows. Home filters client-side to
    // ADMIN_ACTION and slices to 8.
    const list = await screen.findByTestId("recent-activity-list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(8);

    // Every visible row must be ADMIN_ACTION.
    for (const item of items) {
      expect(item.getAttribute("data-event-type")).toBe("ADMIN_ACTION");
    }

    // No LOGIN_SUCCESS or CAPSULE_CREATED rows visible.
    const stray = within(list)
      .queryAllByRole("listitem")
      .filter(
        (el) =>
          el.getAttribute("data-event-type") === "LOGIN_SUCCESS" ||
          el.getAttribute("data-event-type") === "CAPSULE_CREATED",
      );
    expect(stray).toHaveLength(0);
  });
});
