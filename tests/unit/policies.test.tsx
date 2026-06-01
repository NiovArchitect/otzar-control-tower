// FILE: tests/unit/policies.test.tsx
// PURPOSE: Page tests for the Section 9 Control Tower Policies
//          page at /policies. Verifies: nav entry, page header,
//          frameworks list rendering, per-framework live posture
//          merge, honest empty + safe error + Retry, evaluated-at
//          timestamp surfaces, forbidden-copy + no-leak guards.
// CONNECTS TO: src/pages/Policies.tsx, src/lib/api.ts
//              (api.compliance.*), src/lib/types/foundation.ts
//              (ComplianceFramework + FrameworkComplianceState),
//              src/lib/nav.ts, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MemoryRouter } from "react-router-dom";
import { PoliciesPage } from "@/pages/Policies";
import { useAuthStore } from "@/lib/stores/auth";
import { NAV } from "@/lib/nav";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  } as never);
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PoliciesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setAuth();
});

const FORBIDDEN_UI_COPY = [
  "ai decided",
  "is a final decision",
  "this final decision",
  "the final decision is",
  "guaranteed compliant",
  "regulator approved",
  "no fine risk",
  "automatically execute",
  "winner",
  "ranked #1",
  "employee risk",
  "employee score",
  "manager surveillance",
  "psychological profile",
  "full transcript",
  "chain-of-thought",
  "the system decided",
];

const FORBIDDEN_NO_LEAK_TOKENS = [
  "raw_payload",
  "payload_content",
  "raw_memory_content",
  "raw_capsule_content",
  "raw_transcript",
  "prompt_text",
  "embedding_vector",
  "storage_location",
  "bridge_id",
  "secret_ref",
  "connector_payload",
  // ComplianceFramework's rules field is an opaque Json blob
  // — never render it raw.
  '"rules":',
];

describe("Section 9 Control Tower Policies — nav + page shell", () => {
  it("registers /policies in the main nav", () => {
    const entry = NAV.find((n) => n.to === "/policies");
    expect(entry).toBeDefined();
  });

  it("renders the page header", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /^Policies$/ }),
    ).toBeInTheDocument();
  });
});

describe("Section 9 Control Tower Policies — frameworks list", () => {
  it("renders all 3 canonical frameworks from the fixture", async () => {
    renderPage();
    const list = await screen.findByTestId("policies-list");
    const rows = within(list).getAllByTestId("policy-row");
    expect(rows.length).toBe(3);
    expect(screen.getByText("HIPAA")).toBeInTheDocument();
    expect(screen.getByText("FERPA")).toBeInTheDocument();
    expect(screen.getByText("FedRAMP")).toBeInTheDocument();
  });

  it("merges per-framework live posture into the rows", async () => {
    renderPage();
    await screen.findByTestId("policies-list");
    // HIPAA is compliant in the fixture (since 2026-05-30; 0 failures).
    expect(
      screen.getByText(/Compliant \(24h window\)/i),
    ).toBeInTheDocument();
    // FERPA has 2 failures in the fixture.
    expect(
      screen.getByText(/Failures in 24h window/i),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("policy-failures-FERPA"),
    ).toHaveTextContent(/^2$/);
  });

  it("surfaces evaluated-at timestamp", async () => {
    renderPage();
    await screen.findByTestId("policies-list");
    const at = screen.getByTestId("policies-evaluated-at");
    expect(at).toHaveTextContent(/Posture evaluated at 2026-05-31/);
  });

  it("renders honest empty state when frameworks list is empty", async () => {
    server.use(
      http.get(`${API_BASE}/compliance/frameworks`, () =>
        HttpResponse.json(
          { ok: true, frameworks: [] },
          { status: 200 },
        ),
      ),
    );
    renderPage();
    const empty = await screen.findByTestId("policies-list-empty");
    expect(empty).toHaveTextContent(/No compliance frameworks/i);
  });

  it("renders safe error block with Retry when frameworks list fails", async () => {
    server.use(
      http.get(`${API_BASE}/compliance/frameworks`, () =>
        HttpResponse.json(
          { ok: false, code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    renderPage();
    const err = await screen.findByTestId("policies-list-error");
    expect(err).toHaveTextContent(/Failed to load compliance frameworks/i);
    expect(
      within(err).getByRole("button", { name: /Retry/i }),
    ).toBeInTheDocument();
  });

  it("renders safe amber notice when posture fails but frameworks succeed", async () => {
    server.use(
      http.get(`${API_BASE}/compliance/state`, () =>
        HttpResponse.json(
          { ok: false, code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    renderPage();
    await screen.findByTestId("policies-list");
    expect(
      screen.getByTestId("policies-state-error"),
    ).toHaveTextContent(/Live posture data could not be loaded/i);
  });
});

describe("Section 9 Control Tower Policies — forbidden-copy + no-leak guards", () => {
  it("never displays any forbidden ADR-0077-family UI copy", async () => {
    const { container } = renderPage();
    await screen.findByTestId("policies-list");
    const text = (container.textContent ?? "").toLowerCase();
    for (const forbidden of FORBIDDEN_UI_COPY) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("never leaks raw rules JSON / secret refs / chain-of-thought / connector payload tokens", async () => {
    const { container } = renderPage();
    await screen.findByTestId("policies-list");
    const lower = (container.textContent ?? "").toLowerCase();
    // Plain raw tokens.
    for (const token of FORBIDDEN_NO_LEAK_TOKENS) {
      if (token.startsWith('"')) {
        // JSON-shape token — exact-case raw HTML string check.
        expect(container.innerHTML).not.toContain(token);
      } else {
        expect(lower).not.toContain(token);
      }
    }
  });
});
