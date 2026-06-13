// FILE: tests/unit/work-os-cockpits.test.tsx
// PURPOSE: Phase 1279 — lock the Work OS cockpits (My Work / Team Work /
//          Blind Spots) + voice routing. Proves: real ledger entries
//          render; honest empty + error states; Team Work honest blocker;
//          voice phrases route to the cockpits (not chat). No fake data.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyWork } from "@/pages/app/MyWork";
import { TeamWork } from "@/pages/app/TeamWork";
import { BlindSpots } from "@/pages/app/BlindSpots";
import { classifyVoiceAction } from "@/lib/voice/voice-action-runtime";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

const ADMIN = {
  can_read_capsules: true, can_write_capsules: true, can_share_capsules: true,
  can_admin_org: true, can_admin_niov: false,
};

beforeEach(() => {
  useAuthStore.setState({
    token: "tok", entity: { email: "x@niovlabs.com" }, isAuthenticated: true,
    capabilities: ADMIN,
  });
});

function entry(over: Record<string, unknown> = {}) {
  return {
    ledger_entry_id: "led-1", ledger_type: "FOLLOW_UP", source_type: "VOICE_COMMAND",
    source_command: "I told Vishesh I would follow up", work_plan_id: null,
    requester_entity_id: "me", owner_entity_id: "me", target_entity_id: "ent-vishesh",
    title: "Follow up with Vishesh", status: "DRAFT", priority: "ROUTINE",
    extraction_source: "TYPESCRIPT_DETERMINISTIC", next_action: "Send the note",
    due_at: null, created_at: "2026-06-13T18:00:00.000Z", ...over,
  };
}

function renderPage(el: JSX.Element): void {
  render(<MemoryRouter>{el}</MemoryRouter>);
}

describe("My Work cockpit", () => {
  it("renders real ledger entries grouped", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () =>
        HttpResponse.json({ ok: true, items: [entry(), entry({ ledger_entry_id: "led-2", ledger_type: "TASK", status: "PROPOSED", title: "Review AI UI" })] }),
      ),
    );
    renderPage(<MyWork />);
    await waitFor(() =>
      expect(screen.getAllByTestId("work-ledger-item").length).toBe(2),
    );
    expect(screen.getByTestId("my-work-page").textContent).toMatch(/Follow up with Vishesh/i);
    expect(screen.getByTestId("my-work-page").textContent).toMatch(/Review AI UI/i);
  });

  it("shows an honest empty state (no fake work)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<MyWork />);
    await waitFor(() => expect(screen.getByTestId("my-work-empty")).toBeInTheDocument());
  });

  it("shows a safe error on API failure (no silent fake data)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () => HttpResponse.json({ ok: false, code: "X" }, { status: 500 })),
    );
    renderPage(<MyWork />);
    await waitFor(() => expect(screen.getByTestId("my-work-error")).toBeInTheDocument());
    expect(screen.queryByTestId("work-ledger-item")).toBeNull();
  });

  it("View/Why reveals the ledger id + source (inspect only)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () => HttpResponse.json({ ok: true, items: [entry()] })),
    );
    renderPage(<MyWork />);
    const btn = await screen.findByTestId("work-ledger-item-view");
    btn.click();
    await waitFor(() => expect(screen.getByTestId("work-ledger-item-detail")).toBeInTheDocument());
    expect(screen.getByTestId("work-ledger-item-detail").textContent).toMatch(/led-1/);
    expect(screen.getByTestId("work-ledger-item-detail").textContent).toMatch(/TYPESCRIPT_DETERMINISTIC/);
  });
});

describe("Team Work cockpit", () => {
  it("renders allowed team entries", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/team-work`, () => HttpResponse.json({ ok: true, entries: [entry({ status: "BLOCKED" })] })),
    );
    renderPage(<TeamWork />);
    await waitFor(() => expect(screen.getByTestId("work-ledger-item")).toBeInTheDocument());
  });

  it("shows the honest TEAM_SCOPE_NOT_CONFIGURED blocker (no fake org view)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/team-work`, () =>
        HttpResponse.json({ ok: false, code: "TEAM_SCOPE_NOT_CONFIGURED", message: "x" }, { status: 403 }),
      ),
    );
    renderPage(<TeamWork />);
    await waitFor(() => expect(screen.getByTestId("team-work-blocked")).toBeInTheDocument());
    expect(screen.queryByTestId("work-ledger-item")).toBeNull();
  });
});

describe("Blind Spots cockpit", () => {
  it("renders ledger-derived blocked/unresolved items", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/blind-spots`, () =>
        HttpResponse.json({ ok: true, items: [entry({ status: "NEEDS_TARGET_RESOLUTION", title: "Unknown Alex" })] }),
      ),
    );
    renderPage(<BlindSpots />);
    await waitFor(() => expect(screen.getByTestId("work-ledger-item")).toBeInTheDocument());
    expect(screen.getByTestId("blind-spots-page").textContent).toMatch(/Unknown Alex/i);
  });
});

describe("Voice routing to cockpits (not chat)", () => {
  it("routes 'show my work' / 'what is waiting on me' to /app/my-work", () => {
    for (const cmd of ["Show my work.", "What is waiting on me?"]) {
      const a = classifyVoiceAction(cmd, ADMIN);
      expect(a.route).toBe("/app/my-work");
    }
  });
  it("routes 'what am I missing' / 'what is blocked' to /app/blind-spots", () => {
    for (const cmd of ["What am I missing?", "What is blocked?"]) {
      const a = classifyVoiceAction(cmd, ADMIN);
      expect(a.route).toBe("/app/blind-spots");
    }
  });
  it("routes 'show team work' to /app/team-work", () => {
    expect(classifyVoiceAction("Show team work.", ADMIN).route).toBe("/app/team-work");
  });
});
