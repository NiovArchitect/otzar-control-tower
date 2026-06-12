// FILE: tests/unit/admin-command-center-panel.test.tsx
// PURPOSE: Phase 1255 slice 2 locks:
//          (1) admin nav is grouped into the seven OS-style sections
//              and every entry belongs to one,
//          (2) the Command Center panel renders go-live blockers,
//              org context, and next-best-actions with REAL routes,
//          (3) the Data & Knowledge hub shows sources, destinations,
//              flow, runtimes, and AI-allowed/blocked in plain
//              language (no banned vocabulary),
//          (4) the admin command layer reaches System Health and the
//              Command Center.

import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { NAV, NAV_GROUP_ORDER } from "@/lib/nav";
import { CommandCenterPanel } from "@/components/CommandCenterPanel";
import { DataKnowledgePage } from "@/pages/Data";
import { AdminCommandLayer } from "@/components/AdminCommandLayer";
import { useAuthStore } from "@/lib/stores/auth";

const BANNED = [
  "envelope",
  "binding",
  "env var",
  "env-var",
  "payload",
  "capsule_id",
  "wallet_id",
  "tenant_id",
  "COSMP",
  "adapter",
];

function setAdmin(): void {
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
}

beforeEach(() => {
  setAdmin();
  cleanup();
});

describe("Phase 1255 slice 2 — grouped admin navigation", () => {
  it("every nav entry belongs to one of the seven OS sections", () => {
    expect(NAV_GROUP_ORDER).toHaveLength(7);
    for (const item of NAV) {
      expect(NAV_GROUP_ORDER, item.label).toContain(item.group);
    }
  });

  it("core sections carry their expected surfaces", () => {
    const byGroup = (g: string): string[] =>
      NAV.filter((i) => i.group === g).map((i) => i.label);
    expect(byGroup("Command Center")).toContain("Home");
    expect(byGroup("Data & Knowledge")).toEqual(
      expect.arrayContaining(["Data & Knowledge", "Data retention"]),
    );
    expect(byGroup("Work")).toEqual(
      expect.arrayContaining(["Workflows", "Reports", "Analytics"]),
    );
    expect(byGroup("Integrations")).toEqual(
      expect.arrayContaining(["Connectors", "Integrations & MCP", "Voice"]),
    );
    expect(byGroup("System")).toEqual(
      expect.arrayContaining(["System Health", "Settings", "Billing"]),
    );
  });
});

describe("Phase 1255 slice 2 — Command Center panel", () => {
  it("renders blockers, org context, and next-best-actions with real routes", async () => {
    render(
      <MemoryRouter>
        <CommandCenterPanel pendingApprovals={2} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("command-center-panel")).toBeInTheDocument();
    });
    // MSW serves the readiness fixture (schema pending + blocked
    // capabilities) → blockers render and route somewhere real.
    await waitFor(() => {
      expect(
        screen.getAllByTestId("command-center-blocker").length,
      ).toBeGreaterThanOrEqual(1);
    });
    for (const blocker of screen.getAllByTestId("command-center-blocker")) {
      expect(blocker.getAttribute("href")).toBeTruthy();
    }
    // Org context is plain and scoped.
    const org = screen.getByTestId("command-center-org").textContent ?? "";
    expect(org).toContain("scoped to your organization only");
    // Next best actions include the approvals review and route.
    const actions = screen.getAllByTestId("command-center-action");
    expect(actions.length).toBeGreaterThanOrEqual(3);
    expect(actions[0]?.textContent).toContain("2 pending approvals");
    const text = screen.getByTestId("command-center-panel").textContent ?? "";
    for (const banned of BANNED) {
      expect(text, `command center leaked "${banned}"`).not.toContain(banned);
    }
  });
});

describe("Phase 1255 slice 2 — Data & Knowledge hub", () => {
  it("shows sources, destinations, flow, and AI usage in plain language", async () => {
    render(
      <MemoryRouter>
        <DataKnowledgePage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("data-knowledge-page")).toBeInTheDocument();
    expect(screen.getByTestId("data-sources")).toBeInTheDocument();
    expect(screen.getByTestId("data-destinations")).toBeInTheDocument();
    expect(screen.getByTestId("data-flow")).toBeInTheDocument();
    expect(screen.getByTestId("data-ai-usage")).toBeInTheDocument();
    const text =
      screen.getByTestId("data-knowledge-page").textContent ?? "";
    expect(text).toContain("Coming from");
    expect(text).toContain("Can go to");
    expect(text).toContain("AI can use");
    expect(text).toContain("Blocked from AI");
    expect(text).toContain("never scraped");
    for (const banned of BANNED) {
      expect(text, `data knowledge leaked "${banned}"`).not.toContain(banned);
    }
    // Destination rows are real links.
    for (const row of screen.getAllByTestId("data-destination-row")) {
      expect(row.getAttribute("href")).toBeTruthy();
    }
  });
});

describe("Phase 1255 slice 2 — command layer routes", () => {
  it("reaches System Health and the Command Center", async () => {
    render(
      <MemoryRouter>
        <AdminCommandLayer />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByTestId("admin-command-trigger"));
    expect(screen.getByText("Is the system healthy?")).toBeInTheDocument();
    expect(screen.getByText("What should I do next?")).toBeInTheDocument();
  });
});
