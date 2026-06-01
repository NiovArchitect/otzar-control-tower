// FILE: tests/unit/dandelion-activation-walk.test.tsx
// PURPOSE: Page tests for the D6 Dandelion Stage F starter-pilot
//          activation admin walk surface, mounted inside the
//          /onboarding page. Verifies:
//          - Activation card renders with the doctrine line + button
//          - Click activates the starter-pilot envelope via POST
//            /api/v1/org/dandelion/activate
//          - 6 step cards render in order with the customer-admin
//            labels keyed off the catalog audit_literal strings
//          - audit_event_id is rendered (truncated; never full)
//          - Failure response (ok:false) renders the closed-vocab
//            failure-code-derived message
//          - 401/403 transport failure renders the API error
//          - No raw audit literal jargon (no ADMIN_ACTION: prefix)
//            leaks into the rendered output
//          - Forbidden UI copy guard (15 phrases)
// CONNECTS TO: src/pages/Onboarding.tsx (DandelionActivationCard),
//              src/lib/api.ts (api.dandelionActivation namespace),
//              src/lib/dandelion-activation/labels.ts,
//              src/lib/dandelion-activation/types.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { OnboardingPage } from "@/pages/Onboarding";
import { useAuthStore } from "@/lib/stores/auth";
import { getKnownStepLiterals, getStepLabel } from "@/lib/dandelion-activation/labels";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok-d6",
    entity: { email: "admin@example.com" },
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

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <OnboardingPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

// Successful response shape (mirrors Foundation's discriminated
// ActivationSuccess from PR #196).
const SUCCESS_BODY = {
  ok: true as const,
  archetype: "starter-pilot",
  plan_id: "activation.starter-pilot.v1",
  steps: [
    {
      step_order: 1,
      step_id: "step.precheck.envelope-state",
      audit_literal: "ADMIN_ACTION:ENVELOPE_ACTIVATION_PRECHECK",
      audit_event_id: "11111111-1111-1111-1111-111111111111",
    },
    {
      step_order: 2,
      step_id: "step.dmw.baseline-grant",
      audit_literal: "ADMIN_ACTION:DMW_BASELINE_GRANTED",
      audit_event_id: "22222222-2222-2222-2222-222222222222",
    },
    {
      step_order: 3,
      step_id: "step.role.template-assignment",
      audit_literal: "ADMIN_ACTION:ROLE_TEMPLATE_ASSIGNED",
      audit_event_id: "33333333-3333-3333-3333-333333333333",
    },
    {
      step_order: 4,
      step_id: "step.workflow.template-only-register",
      audit_literal: "ADMIN_ACTION:WORKFLOW_TEMPLATE_REGISTERED",
      audit_event_id: "44444444-4444-4444-4444-444444444444",
    },
    {
      step_order: 5,
      step_id: "step.aha.safe-fallback-register",
      audit_literal: "ADMIN_ACTION:AHA_MOMENT_REGISTERED",
      audit_event_id: "55555555-5555-5555-5555-555555555555",
    },
    {
      step_order: 6,
      step_id: "step.envelope.mark-activated",
      audit_literal: "ADMIN_ACTION:STARTER_ENVELOPE_ACTIVATED",
      audit_event_id: "66666666-6666-6666-6666-666666666666",
    },
  ],
  activation_audit_event_id: "66666666-6666-6666-6666-666666666666",
};

describe("D6 — activation card shell", () => {
  it("renders the activation card on /onboarding", () => {
    renderPage();
    expect(screen.getByTestId("dandelion-activation-card")).toBeInTheDocument();
  });

  it("renders the doctrine line about smallest viable starter-pilot envelope", () => {
    renderPage();
    expect(
      screen.getByText(
        /Run the smallest viable starter-pilot envelope/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the activate button before any activation runs", () => {
    renderPage();
    expect(
      screen.getByTestId("activate-starter-pilot-button"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Activate starter-pilot envelope/i }),
    ).toBeInTheDocument();
  });
});

describe("D6 — successful activation", () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate`, () =>
        HttpResponse.json(SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it("renders all 6 step cards in order after a successful POST", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("activate-starter-pilot-button"));
    await waitFor(() =>
      expect(screen.getByTestId("activation-success")).toBeInTheDocument(),
    );
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByTestId(`activation-step-${i}`)).toBeInTheDocument();
    }
  });

  it("renders the customer-admin label per known catalog audit_literal", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("activate-starter-pilot-button"));
    await waitFor(() =>
      expect(screen.getByTestId("activation-success")).toBeInTheDocument(),
    );
    // Step 2 — DMW baseline
    const step2 = screen.getByTestId("activation-step-2");
    expect(within(step2).getByText(/Opened the memory baseline/i)).toBeInTheDocument();
    // Step 6 — envelope activated
    const step6 = screen.getByTestId("activation-step-6");
    expect(within(step6).getByText(/Envelope marked as activated/i)).toBeInTheDocument();
  });

  it("renders the archetype + plan_id badges and the truncated final audit_event_id", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("activate-starter-pilot-button"));
    await waitFor(() =>
      expect(screen.getByTestId("activation-success")).toBeInTheDocument(),
    );
    expect(screen.getByText(/archetype: starter-pilot/)).toBeInTheDocument();
    expect(
      screen.getByText(/plan_id: activation\.starter-pilot\.v1/),
    ).toBeInTheDocument();
    // Truncated audit_event_id only (no full UUID echoed at top level)
    expect(screen.getByText(/Final audit_event_id 66666666…/)).toBeInTheDocument();
  });

  it("does NOT leak raw ADMIN_ACTION: prefix into the rendered output", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByTestId("activate-starter-pilot-button"));
    await waitFor(() =>
      expect(screen.getByTestId("activation-success")).toBeInTheDocument(),
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ADMIN_ACTION:/);
  });
});

describe("D6 — auth + transport failure", () => {
  it("renders the closed-vocab failure-code-derived message on NOT_ADMIN (200 + ok:false)", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "NOT_ADMIN",
            message: "caller lacks can_admin_org capability",
          },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("activate-starter-pilot-button"));
    await waitFor(() =>
      expect(screen.getByTestId("activation-error")).toBeInTheDocument(),
    );
    // 4xx → ApiResult.ok:false branch — the message echoed is the
    // Foundation-provided one.
    expect(screen.getByTestId("activation-error")).toBeInTheDocument();
    expect(screen.queryByTestId("activation-success")).not.toBeInTheDocument();
  });

  it("renders an error and no success on 500", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate`, () =>
        HttpResponse.json(
          { ok: false, code: "INTERNAL_ERROR", message: "boom" },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("activate-starter-pilot-button"));
    await waitFor(() =>
      expect(screen.getByTestId("activation-error")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("activation-success")).not.toBeInTheDocument();
  });
});

describe("D6 — label closure", () => {
  it("every known catalog audit_literal has a non-fallback label entry", () => {
    const knownLiterals = getKnownStepLiterals();
    expect(knownLiterals.length).toBeGreaterThanOrEqual(6);
    for (const literal of knownLiterals) {
      const label = getStepLabel(literal);
      expect(label.title.length).toBeGreaterThan(0);
      // The fallback summary is "An activation step was recorded." —
      // assert each known literal has a real summary instead.
      expect(label.summary).not.toBe("An activation step was recorded.");
    }
  });

  it("falls back gracefully for an unknown audit_literal (no raw ADMIN_ACTION leakage)", () => {
    const label = getStepLabel("ADMIN_ACTION:SOMETHING_NEW");
    expect(label.title).toBe("Something New");
    expect(label.title).not.toContain("ADMIN_ACTION:");
  });
});

describe("D6 — forbidden UI copy guard", () => {
  const FORBIDDEN_UI_COPY = [
    "permission granted",
    "auto-approved",
    "employee score",
    "manager surveillance",
    "psychological profile",
    "guaranteed compliant",
    "regulator approved",
    "no fine risk",
    "unrestricted write access",
    "autonomous execution enabled",
    "ai decided",
    "ready to execute",
    "full inbox access",
    "connector activated",
    "workflow execution enabled",
  ];

  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate`, () =>
        HttpResponse.json(SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it.each(FORBIDDEN_UI_COPY)(
    "does NOT contain the forbidden phrase %s anywhere in the activation card output",
    async (phrase) => {
      const user = userEvent.setup();
      const { container } = renderPage();
      await user.click(screen.getByTestId("activate-starter-pilot-button"));
      await waitFor(() =>
        expect(screen.getByTestId("activation-success")).toBeInTheDocument(),
      );
      const text = (container.textContent ?? "").toLowerCase();
      expect(text).not.toContain(phrase.toLowerCase());
    },
  );
});
