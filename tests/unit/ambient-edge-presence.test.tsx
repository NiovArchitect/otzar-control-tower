// FILE: tests/unit/ambient-edge-presence.test.tsx
// PURPOSE: Phase 1251 — locks the Otzar edge-presence system:
//          (1) the pure nine-state derivation and its priorities,
//          (2) the edge glow speaks the state and stays pointer-safe,
//          (3) ambient cards appear only on true signals, dismiss,
//              deep-link, stay restrained (max 2), and use plain
//              language (no developer vocabulary),
//          (4) the orb label reflects attention states,
//          (5) the admin command layer opens and navigates,
//          (6) Dandelion welcome carries root-first propagation copy,
//          (7) Observe carries the governed shared-screen story.
// CONNECTS TO: src/lib/stores/presence.ts, AmbientEdgeGlow,
//          AmbientNotificationStack, AmbientOtzarBar,
//          AdminCommandLayer, Welcome, Observe.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import {
  derivePresenceState,
  usePresenceStore,
  FAILURE_GLOW_MS,
  type PresenceSignals,
} from "@/lib/stores/presence";
import { AmbientEdgeGlow } from "@/components/otzar/AmbientEdgeGlow";
import { AmbientNotificationStack } from "@/components/otzar/AmbientNotificationStack";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { AdminCommandLayer } from "@/components/AdminCommandLayer";
import { Welcome } from "@/pages/app/Welcome";
import { Observe } from "@/pages/app/Observe";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

const BANNED = [
  "capsule_id",
  "wallet_id",
  "COSMP",
  "payload",
  "adapter",
  "DMW object",
  "schema",
];

function signals(overrides: Partial<PresenceSignals> = {}): PresenceSignals {
  return {
    listening: false,
    thinking: false,
    quiet: false,
    quietReason: null,
    approvalsCount: 0,
    unreadCount: 0,
    voiceBlocked: false,
    lastSuccessAt: null,
    lastFailureAt: null,
    ...overrides,
  };
}

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

beforeEach(() => {
  setAuth();
  usePresenceStore.getState().reset();
});

afterEach(() => cleanup());

describe("Phase 1251 — presence state derivation (pure)", () => {
  it("is IDLE when nothing is happening", () => {
    expect(derivePresenceState(signals())).toBe("IDLE");
  });

  it("live voice activity always wins", () => {
    expect(
      derivePresenceState(
        signals({ listening: true, approvalsCount: 5, quiet: false }),
      ),
    ).toBe("LISTENING");
    expect(
      derivePresenceState(signals({ thinking: true, approvalsCount: 5 })),
    ).toBe("THINKING");
  });

  it("quiet mode mutes attention states — a meeting is not the moment for pulses", () => {
    expect(
      derivePresenceState(
        signals({ quiet: true, approvalsCount: 3, unreadCount: 4 }),
      ),
    ).toBe("QUIET");
  });

  it("approvals outrank recommendations; blockers outrank idle", () => {
    expect(
      derivePresenceState(signals({ approvalsCount: 1, unreadCount: 9 })),
    ).toBe("APPROVAL_REQUIRED");
    expect(derivePresenceState(signals({ unreadCount: 2 }))).toBe(
      "RECOMMENDATION",
    );
    expect(derivePresenceState(signals({ voiceBlocked: true }))).toBe(
      "BLOCKED",
    );
  });

  it("outcomes flash briefly, then yield", () => {
    const now = Date.now();
    expect(
      derivePresenceState(signals({ lastFailureAt: now - 100 }), now),
    ).toBe("FAILURE");
    expect(
      derivePresenceState(
        signals({ lastFailureAt: now - FAILURE_GLOW_MS - 1 }),
        now,
      ),
    ).toBe("IDLE");
    expect(
      derivePresenceState(signals({ lastSuccessAt: now - 100 }), now),
    ).toBe("SUCCESS");
  });
});

describe("Phase 1251 — AmbientEdgeGlow", () => {
  it("renders pointer-safe, aria-hidden, and speaks the state", () => {
    usePresenceStore.getState().setSignals({ listening: true });
    render(<AmbientEdgeGlow />);
    const glow = screen.getByTestId("ambient-edge-glow");
    expect(glow.getAttribute("data-presence")).toBe("LISTENING");
    expect(glow.getAttribute("aria-hidden")).toBe("true");
    expect(glow.className).toContain("pointer-events-none");
  });

  it("defaults to IDLE", () => {
    render(<AmbientEdgeGlow />);
    expect(
      screen.getByTestId("ambient-edge-glow").getAttribute("data-presence"),
    ).toBe("IDLE");
  });
});

describe("Phase 1251 — AmbientNotificationStack", () => {
  it("renders nothing when there is nothing true to say", () => {
    render(
      <MemoryRouter>
        <AmbientNotificationStack />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("ambient-card-stack")).toBeNull();
  });

  it("surfaces approvals from the real PROPOSED count, deep-links, and dismisses", async () => {
    // Phase 1287-C — the popup now counts ACTIONABLE pending (PROPOSED + a live
    // escalation), not raw PROPOSED total, so a stale/routing-only item never
    // dead-clicks. Two genuinely actionable items → "2 items waiting".
    const now = new Date().toISOString();
    server.use(
      http.get(`${API_BASE}/actions`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            { action_id: "a1", status: "PROPOSED", action_type: "SEND_INTERNAL_NOTIFICATION", risk_tier: "LOW", requires_approval: true, escalation_id: "e1", created_at: now, updated_at: now },
            { action_id: "a2", status: "PROPOSED", action_type: "SEND_INTERNAL_NOTIFICATION", risk_tier: "LOW", requires_approval: true, escalation_id: "e2", created_at: now, updated_at: now },
          ],
          page: 1,
          page_size: 50,
          total: 2,
        }),
      ),
    );
    render(
      <MemoryRouter>
        <AmbientNotificationStack />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("ambient-card-stack")).toBeInTheDocument();
    });
    const card = screen.getByTestId("ambient-card");
    expect(card.textContent).toContain(
      "2 items are waiting for your decision.",
    );
    // [OTZAR-LIVE-6] A decision is ATTENTION intensity (visible priority), and
    // the card is the frosted-glass material (not a flat SaaS card).
    expect(card.getAttribute("data-intensity")).toBe("attention");
    expect(card.className).toMatch(/backdrop-blur/);
    expect(card.className).toMatch(/bg-white\//);
    const link = screen.getByRole("link", { name: "Review" });
    expect(link.getAttribute("href")).toBe("/app/action-center");
    // Keyboard-accessible dismiss with a real label.
    const dismiss = screen.getByRole("button", { name: /^Dismiss:/ });
    await userEvent.click(dismiss);
    expect(screen.queryByTestId("ambient-card-stack")).toBeNull();
  });

  it("quiet mode shows the quiet card and holds notes back", () => {
    usePresenceStore.getState().setSignals({
      quiet: true,
      quietReason: "IN_MEETING",
      unreadCount: 3,
    });
    render(
      <MemoryRouter>
        <AmbientNotificationStack />
      </MemoryRouter>,
    );
    const cards = screen.getAllByTestId("ambient-card");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.textContent).toContain(
      "Voice is paused while you're in a meeting.",
    );
  });

  it("voice-blocked card offers the honest fallback: typing", () => {
    usePresenceStore.getState().setSignals({ voiceBlocked: true });
    render(
      <MemoryRouter>
        <AmbientNotificationStack />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("ambient-card").textContent).toContain(
      "You can type instead",
    );
  });

  it("[OTZAR-LIVE-6] names the reply from real notification data ('Priya replied')", async () => {
    usePresenceStore.getState().setSignals({ unreadCount: 1 });
    server.use(
      http.get(`${API_BASE}/notifications`, () =>
        HttpResponse.json({
          ok: true,
          page: 1,
          page_size: 5,
          total: 1,
          notifications: [
            {
              notification_id: "n-1",
              notification_class: "OTZAR_INTERNAL_NOTE",
              body_summary: "On it.",
              created_at: "2026-06-24T10:00:00.000Z",
              read_at: null,
              status: "UNREAD",
              sender: { entity_id: "ent-priya", display_name: "Priya", source_kind: "HUMAN" },
            },
          ],
        }),
      ),
    );
    render(
      <MemoryRouter>
        <AmbientNotificationStack />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("ambient-card").textContent).toContain("Priya replied"),
    );
    // It's a working-intensity card (a reply, not a decision).
    expect(screen.getByTestId("ambient-card").getAttribute("data-intensity")).toBe("working");
  });

  it("[OTZAR-LIVE-6] falls back to the count when no human sender is known (no fake name)", async () => {
    usePresenceStore.getState().setSignals({ unreadCount: 2 });
    server.use(
      http.get(`${API_BASE}/notifications`, () =>
        HttpResponse.json({
          ok: true,
          page: 1,
          page_size: 5,
          total: 2,
          notifications: [
            {
              notification_id: "n-2",
              notification_class: "SYSTEM",
              body_summary: "Scheduled digest.",
              created_at: "2026-06-24T10:00:00.000Z",
              read_at: null,
              status: "UNREAD",
              sender: { entity_id: "system", display_name: "", source_kind: "SYSTEM" },
            },
          ],
        }),
      ),
    );
    render(
      <MemoryRouter>
        <AmbientNotificationStack />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("ambient-card").textContent).toContain(
        "2 new notes for you",
      ),
    );
    // Never a fabricated/demo name in the fallback.
    expect(screen.getByTestId("ambient-card").textContent).not.toMatch(
      /\b(David|Samiksha|Vishesh)\b/,
    );
  });

  it("ambient cards never speak developer vocabulary", () => {
    usePresenceStore.getState().setSignals({
      quiet: true,
      quietReason: "FOCUS_TIME",
      approvalsCount: 4,
      voiceBlocked: true,
    });
    render(
      <MemoryRouter>
        <AmbientNotificationStack />
      </MemoryRouter>,
    );
    const text = document.body.textContent ?? "";
    for (const banned of BANNED) {
      expect(text, `ambient card leaked "${banned}"`).not.toContain(banned);
    }
    // Restrained: never more than two cards.
    expect(screen.getAllByTestId("ambient-card").length).toBeLessThanOrEqual(2);
  });
});

describe("Phase 1251 — the orb (collapsed AmbientOtzarBar)", () => {
  it("stays the calm default label when nothing needs the user", () => {
    render(
      <MemoryRouter>
        <AmbientOtzarBar />
      </MemoryRouter>,
    );
    const orb = screen.getByTestId("ambient-otzar-bar");
    expect(orb.textContent).toContain("Talk to Otzar");
    // jsdom has no SpeechRecognition, so the honest presence here is
    // BLOCKED (voice unavailable) — and the label stays calm anyway.
    expect(["IDLE", "BLOCKED"]).toContain(
      orb.getAttribute("data-presence") ?? "",
    );
  });

  it("shows the attention label when approvals wait", () => {
    usePresenceStore.getState().setSignals({ approvalsCount: 2 });
    render(
      <MemoryRouter>
        <AmbientOtzarBar />
      </MemoryRouter>,
    );
    const orb = screen.getByTestId("ambient-otzar-bar");
    expect(orb.getAttribute("data-presence")).toBe("APPROVAL_REQUIRED");
    expect(orb.textContent).toContain("Otzar · needs you");
  });
});

describe("Phase 1251 — AdminCommandLayer", () => {
  it("opens from the labeled trigger and navigates on selection", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AdminCommandLayer />
      </MemoryRouter>,
    );
    const trigger = screen.getByTestId("admin-command-trigger");
    expect(trigger.getAttribute("aria-label")).toContain("Command K");
    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByTestId("admin-command-input")).toBeInTheDocument();
    });
    expect(
      screen.getByText("What is blocking production?"),
    ).toBeInTheDocument();
    // Phase 1252: credential + MCP setup are reachable by question.
    expect(
      screen.getByText("Set up MCP servers and tool policies"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Where do I enter provider credentials?"),
    ).toBeInTheDocument();
  });
});

describe("Phase 1251 — visionary copy stays truthful", () => {
  it("Welcome speaks root-first propagation, not mass invites", async () => {
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("welcome-propagation-note"),
      ).toBeInTheDocument();
    });
    const note = screen.getByTestId("welcome-propagation-note").textContent ?? "";
    expect(note).toContain("planted at your organization's root");
    expect(note).toContain("not because of a mass invite");
    expect(note).toContain("governed");
  });

  it("Observe tells the governed shared-screen story without overclaiming", async () => {
    render(
      <MemoryRouter>
        <Observe />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("observe-vision")).toBeInTheDocument();
    });
    const vision = screen.getByTestId("observe-vision").textContent ?? "";
    expect(vision).toContain("Process whisperer");
    expect(vision).toContain("Compliance guardian");
    // Honesty: today = pasted text and samples; screen share is future.
    expect(vision).toContain("Today this works with pasted text and samples");
    expect(vision).toContain("never acts without your approval");
    for (const banned of BANNED) {
      expect(vision, `observe vision leaked "${banned}"`).not.toContain(banned);
    }
  });
});
