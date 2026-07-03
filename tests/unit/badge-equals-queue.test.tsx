// FILE: badge-equals-queue.test.tsx
// PURPOSE: [GAP-F] The governance badges can NEVER disagree with the queues
//          behind them: the sidebar Pending Approvals badge consumes the
//          exact /escalations/pending list the Approvals page renders (same
//          queryKey, same cache entry), and the Review Center badge counts
//          only PENDING_REVIEW rows from the same list the page shows.
// CONNECTS TO: src/hooks/use-pending-approvals.ts,
//          src/hooks/use-reviewable-count.ts, src/components/AdminSidebar.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
});

function esc(id: string) {
  return {
    escalation_id: id,
    escalation_type: "PERMISSION_REQUEST",
    status: "PENDING",
    source_entity_id: "e-src",
    target_entity_id: "e-me",
    created_at: new Date().toISOString(),
  };
}

function renderSidebar(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("[GAP-F] Pending Approvals badge == the caller's pending queue", () => {
  it("badge shows exactly the queue length from /escalations/pending", async () => {
    server.use(
      http.get(`${API_BASE}/escalations/pending`, () =>
        HttpResponse.json({ ok: true, escalations: [esc("e1"), esc("e2"), esc("e3")] }),
      ),
    );
    renderSidebar();
    await waitFor(() =>
      expect(screen.getByLabelText("3 pending approvals")).toBeInTheDocument(),
    );
  });

  it("an empty queue hides the badge — never a phantom count", async () => {
    server.use(
      http.get(`${API_BASE}/escalations/pending`, () =>
        HttpResponse.json({ ok: true, escalations: [] }),
      ),
    );
    renderSidebar();
    // Let queries settle, then assert absence.
    await waitFor(() =>
      expect(screen.getByText("Pending Approvals")).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText(/pending approvals/)).toBeNull();
  });

  it("Review Center badge counts ONLY pending reviews from the queue's own list", async () => {
    server.use(
      http.get(`${API_BASE}/escalations/pending`, () =>
        HttpResponse.json({ ok: true, escalations: [] }),
      ),
      http.get(`${API_BASE}/foundation/high-sensitivity/reviews`, () =>
        HttpResponse.json({
          ok: true,
          reviews: [
            { review_id: "r1", status: "PENDING_REVIEW" },
            { review_id: "r2", status: "APPROVED" },
            { review_id: "r3", status: "PENDING_REVIEW" },
          ],
          // No summary -> the fallback path must count pending only.
        }),
      ),
    );
    renderSidebar();
    await waitFor(() =>
      expect(screen.getByLabelText("2 reviews need attention")).toBeInTheDocument(),
    );
  });
});
