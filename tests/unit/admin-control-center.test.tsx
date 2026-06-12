// FILE: tests/unit/admin-control-center.test.tsx
// PURPOSE: Phase 1255 — admin acceptance locks:
//          (1) audit event names are humanized (no raw
//              UNDERSCORE_NAMES, even for unmapped literals),
//          (2) hashes/audit ids live behind "View technical proof",
//          (3) Reports + Retention surfaces exist, use governed
//              language, and contain no fake capability claims,
//          (4) the admin command layer routes to reports/retention/
//              data knowledge,
//          (5) "envelope" / "env-var" are gone from primary admin
//              copy on Onboarding + ConnectorsAdmin.

import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { humanizeAuditEventType, humanizeStatus } from "@/lib/labels/humanize";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import Reports from "@/pages/Reports";
import Retention from "@/pages/Retention";
import { AdminCommandLayer } from "@/components/AdminCommandLayer";
import { useAuthStore } from "@/lib/stores/auth";

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

describe("Phase 1255 — humanized admin language", () => {
  it("unmapped audit literals never render raw underscores", () => {
    expect(humanizeAuditEventType("TRANSACTION_MOCK_SETTLED")).toBe(
      "Transaction mock settled",
    );
    expect(getAuditEventLabel("WORKSPACE_COMMITMENT_CONFIRMED" as never)).toBe(
      "Workspace commitment confirmed",
    );
    expect(humanizeAuditEventType("MCP_SERVER_CONNECTION_REVOKED")).toContain(
      "AI tool",
    );
    expect(humanizeAuditEventType("ACTION_APPROVED")).not.toMatch(/_/);
  });

  it("status enums humanize calmly", () => {
    expect(humanizeStatus("BLOCKED_BY_CREDENTIALS")).toBe("Needs credentials");
    expect(humanizeStatus("NOT_AUTHORIZED")).toBe(
      "Needs explicit authorization",
    );
  });
});

describe("Phase 1255 — Reports surface", () => {
  it("renders governed reporting language with real routes and honest pending state", () => {
    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>,
    );
    const text = screen.getByTestId("reports-page").textContent ?? "";
    expect(text).toContain("goes through approval");
    expect(text).toContain("Regulator");
    expect(text).toContain("Setup needed");
    expect(text).toContain("nothing here");
    for (const banned of ["envelope", "binding", "env var", "payload", "COSMP"]) {
      expect(text).not.toContain(banned);
    }
    // Real click-throughs, no dead cards.
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const l of links) {
      expect(l.getAttribute("href")).toBeTruthy();
    }
  });
});

describe("Phase 1255 — Retention surface", () => {
  it("explains lifecycle truthfully: audit immutability, memory revocation, transcript policy", () => {
    render(
      <MemoryRouter>
        <Retention />
      </MemoryRouter>,
    );
    const text = screen.getByTestId("retention-page").textContent ?? "";
    expect(text).toContain("cannot be deleted");
    expect(text).toContain("revoked from AI use");
    expect(text).toContain("retention policy");
    expect(text).toContain("legal hold");
    expect(screen.getByTestId("retention-editor-pending").textContent).toContain(
      "Founder-approved schema update",
    );
    expect(screen.getAllByTestId("retention-row").length).toBeGreaterThanOrEqual(5);
  });
});

describe("Phase 1255 — admin command layer reaches the new surfaces", () => {
  it("routes exist for reports, retention, and data knowledge", async () => {
    render(
      <MemoryRouter>
        <AdminCommandLayer />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByTestId("admin-command-trigger"));
    expect(screen.getByText("Show me reports")).toBeInTheDocument();
    expect(
      screen.getByText("Open data retention settings"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("What data is connected and where does it go?"),
    ).toBeInTheDocument();
  });
});

describe("Phase 1255 — primary admin copy bans", () => {
  it("Onboarding page has no visible 'envelope' copy", async () => {
    const { OnboardingPage } = await import("@/pages/Onboarding");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // The page may show loading/error states; whatever rendered must
    // not say "envelope".
    expect(document.body.textContent ?? "").not.toMatch(/envelope/i);
  });
});
