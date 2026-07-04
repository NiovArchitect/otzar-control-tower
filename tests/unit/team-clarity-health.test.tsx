// FILE: tests/unit/team-clarity-health.test.tsx
// PURPOSE: [CE-4B] the Team Work clarity-exception box: ONE calm summary
//          rendered only when a count is non-zero (all-zero → silence, not
//          an empty box), human copy only (no raw enums/ids), never a
//          per-event feed, and a summary fetch failure renders nothing —
//          the work list stays the page's job.
// CONNECTS TO: src/pages/app/TeamWork.tsx, api.workOs.teamClarityHealth.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { TeamWork } from "@/pages/app/TeamWork";
import { useAuthStore } from "@/lib/stores/auth";

const API = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "manager@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: true, can_admin_org: true, can_admin_niov: false },
  });
  server.use(
    http.get(`${API}/work-os/team-work`, () =>
      HttpResponse.json({ ok: true, entries: [], skip: 0, take: 300, has_more: false }),
    ),
    http.get(`${API}/org/hierarchy`, () => HttpResponse.json({ ok: true, entities: [], memberships: [] })),
  );
});

function healthHandler(over: Record<string, unknown> = {}) {
  return http.get(`${API}/work-os/team-clarity-health`, () =>
    HttpResponse.json({
      ok: true,
      unresolved_clarifications_count: 0,
      overdue_clarifications_count: 0,
      ownership_unclear_count: 0,
      repeated_ambiguity_topics: [],
      ...over,
    }),
  );
}

describe("[CE-4B] Team Work — clarity exception summary (calm, patterns only)", () => {
  it("renders ONE calm box with the top exception + quiet count lines", async () => {
    server.use(
      healthHandler({
        unresolved_clarifications_count: 2,
        overdue_clarifications_count: 1,
        ownership_unclear_count: 3,
        repeated_ambiguity_topics: [{ label: "Authentication", count: 2 }],
        top_exception: {
          label: "1 clarification request is overdue",
          reason: "Waiting past their expiry — a nudge or a different clarifier may help.",
        },
      }),
    );
    render(<MemoryRouter><TeamWork /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByTestId("team-clarity-health")).toBeInTheDocument(),
    );
    const box = screen.getByTestId("team-clarity-health").textContent ?? "";
    expect(box).toContain("1 clarification request is overdue");
    expect(box).toContain("2 clarification requests waiting.");
    expect(box).toContain("3 items need ownership clarity.");
    expect(box).toContain("Authentication has repeated clarifications (2).");
    // Human copy only — no backend enums, ids, or excerpt-looking content.
    expect(box).not.toMatch(/HUMAN_REVIEW_REQUIRED|PENDING|[0-9a-f]{8}-[0-9a-f]{4}/);
  });

  it("all-zero counts render SILENCE — no empty box, no badges", async () => {
    server.use(healthHandler());
    render(<MemoryRouter><TeamWork /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByTestId("team-work-page")).toBeInTheDocument(),
    );
    // Give the fetch a beat, then confirm silence.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("team-clarity-health")).toBeNull();
  });

  it("a summary fetch failure renders silence, never an error state", async () => {
    server.use(
      http.get(`${API}/work-os/team-clarity-health`, () =>
        HttpResponse.json({ ok: false, code: "TEAM_SCOPE_NOT_CONFIGURED" }, { status: 403 }),
      ),
    );
    render(<MemoryRouter><TeamWork /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByTestId("team-work-page")).toBeInTheDocument(),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("team-clarity-health")).toBeNull();
  });
});
