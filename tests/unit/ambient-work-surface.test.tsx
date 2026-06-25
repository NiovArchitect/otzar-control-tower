// FILE: tests/unit/ambient-work-surface.test.tsx
// PURPOSE: [OTZAR-LIVE-6] The new /app surface answers, from REAL state, what
//          needs the human, what Otzar is handling, and the current context —
//          collapsed summaries, calm empty state, one invocation. Panels appear
//          only when their state is real; nothing in flight → a calm "caught up",
//          never a card wall. The "Just talk" affordance invokes the orb.
// CONNECTS TO: src/pages/app/AmbientWorkSurface.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AmbientWorkSurface } from "@/pages/app/AmbientWorkSurface";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";

beforeEach(() => {
  useAuthStore.setState({
    token: "t",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
  });
  usePresenceStore.getState().reset();
  useCurrentSurfaceContextStore.getState().clear();
});
afterEach(() => cleanup());

function renderSurface(): void {
  render(
    <MemoryRouter>
      <AmbientWorkSurface />
    </MemoryRouter>,
  );
}

describe("AmbientWorkSurface — real-state ambient summaries", () => {
  it("is calm and 'caught up' when nothing needs the human (no card wall)", () => {
    renderSurface();
    expect(screen.getByTestId("ambient-work-surface")).toBeInTheDocument();
    expect(screen.getByTestId("ambient-caught-up")).toBeInTheDocument();
    // No 'Needs you' / 'handling-replies' panels invented from nothing.
    expect(screen.queryByTestId("needs-me-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("handling-replies")).not.toBeInTheDocument();
  });

  it("surfaces 'Needs you' (attention) ONLY when there are real approvals", () => {
    usePresenceStore.getState().setSignals({ approvalsCount: 2 });
    renderSurface();
    const panel = screen.getByTestId("needs-me-panel");
    expect(panel).toHaveTextContent(/2 decisions are waiting on you/i);
    expect(panel.getAttribute("data-intensity")).toBe("attention");
  });

  it("surfaces what Otzar is handling (replies) from the real unread count", () => {
    usePresenceStore.getState().setSignals({ unreadCount: 1 });
    renderSurface();
    expect(screen.getByTestId("handling-replies")).toHaveTextContent(
      /tracking 1 reply/i,
    );
  });

  it("shows the active current context and lets the human clear it", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "unknown",
      title: "the launch plan",
    });
    const user = userEvent.setup();
    renderSurface();
    expect(screen.getByTestId("context-active")).toHaveTextContent(/launch plan/i);
    await user.click(screen.getByTestId("context-clear"));
    await waitFor(() =>
      expect(useCurrentSurfaceContextStore.getState().context).toBeNull(),
    );
  });

  it("the one invocation opens the orb (voice/text engine), no page hunt", async () => {
    const open = vi.fn();
    window.addEventListener("otzar:open", open);
    const user = userEvent.setup();
    renderSurface();
    await user.click(screen.getByTestId("ambient-talk"));
    expect(open).toHaveBeenCalledTimes(1);
    window.removeEventListener("otzar:open", open);
  });
});
