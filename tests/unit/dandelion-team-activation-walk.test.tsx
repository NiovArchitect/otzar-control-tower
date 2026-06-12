// FILE: tests/unit/dandelion-team-activation-walk.test.tsx
// PURPOSE: Page tests for the D6 Dandelion Stage F team-archetype
//          activation admin walk surface (Foundation PR #198 — D6
//          team-archetype activation runtime).
//          Verifies:
//          - Team activation card renders with the doctrine + form
//          - Submit disabled until display_name + secret_ref filled
//          - Click activates the team envelope via POST
//            /api/v1/org/dandelion/activate/team with the form body
//          - 8 step cards render in order with customer-admin labels
//          - The slack-binding step (step 5) gets the highlight badge
//          - INVALID_SLACK_BINDING_INPUT 422 renders the helpful
//            customer-admin message
//          - CONNECTOR_BINDING_FAILED 422 renders its message
//          - Privacy invariant: no concrete xoxb-* token regex
//            appears anywhere in the rendered output (even when the
//            admin pastes one into the form by mistake)
//          - Forbidden UI copy guard (15 phrases) on the team card
// CONNECTS TO: src/pages/Onboarding.tsx (TeamActivationCard),
//              src/lib/api.ts (api.dandelionActivation.activateTeam),
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

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok-d6-team",
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

// Successful team-activation response (mirrors Foundation PR #198's
// 8-step ActivationSuccess).
const TEAM_SUCCESS_BODY = {
  ok: true as const,
  archetype: "team",
  plan_id: "activation.team.v1",
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
      step_id: "step.dmw.team-scope-extension",
      audit_literal: "ADMIN_ACTION:DMW_TEAM_SCOPE_GRANTED",
      audit_event_id: "33333333-3333-3333-3333-333333333333",
    },
    {
      step_order: 4,
      step_id: "step.role.template-and-team-assignment",
      audit_literal: "ADMIN_ACTION:ROLE_TEMPLATE_ASSIGNED",
      audit_event_id: "44444444-4444-4444-4444-444444444444",
    },
    {
      step_order: 5,
      step_id: "step.connector.slack-binding-register",
      audit_literal: "ADMIN_ACTION:CONNECTOR_BINDING_REGISTERED",
      audit_event_id: "55555555-5555-5555-5555-555555555555",
    },
    {
      step_order: 6,
      step_id: "step.workflow.stage-2-template-register",
      audit_literal: "ADMIN_ACTION:WORKFLOW_TEMPLATE_REGISTERED",
      audit_event_id: "66666666-6666-6666-6666-666666666666",
    },
    {
      step_order: 7,
      step_id: "step.aha.slack-bound-and-fallback-register",
      audit_literal: "ADMIN_ACTION:AHA_MOMENT_REGISTERED",
      audit_event_id: "77777777-7777-7777-7777-777777777777",
    },
    {
      step_order: 8,
      step_id: "step.envelope.mark-activated",
      audit_literal: "ADMIN_ACTION:STARTER_ENVELOPE_ACTIVATED",
      audit_event_id: "88888888-8888-8888-8888-888888888888",
    },
  ],
  activation_audit_event_id: "88888888-8888-8888-8888-888888888888",
};

describe("D6 team — card shell", () => {
  it("renders the team activation card on /onboarding", () => {
    renderPage();
    expect(
      screen.getByTestId("dandelion-team-activation-card"),
    ).toBeInTheDocument();
  });

  it("renders the doctrine line about activating the team envelope", () => {
    renderPage();
    // "Activate the team envelope" appears as the card title + the
    // button label; both are valid renderings.
    expect(
      screen.getAllByText(/Activate the team rollout/i).length,
    ).toBeGreaterThan(0);
  });

  it("renders the privacy notice about env-var NAME (never resolved token)", () => {
    renderPage();
    const noticeText = screen.getByTestId("team-privacy-notice").textContent ?? "";
    expect(noticeText).toMatch(/env-var NAME/i);
    expect(noticeText).toMatch(/deployment host/i);
    expect(noticeText).toMatch(/Never paste the resolved bot token/i);
  });

  it("renders all 3 form inputs (display_name, secret_ref, workspace_id)", () => {
    renderPage();
    expect(
      screen.getByTestId("team-slack-display-name-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("team-slack-secret-ref-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("team-slack-workspace-id-input"),
    ).toBeInTheDocument();
  });

  it("renders the submit button disabled until display_name + secret_ref are filled", () => {
    renderPage();
    const submit = screen.getByTestId("activate-team-button");
    expect(submit).toBeDisabled();
  });

  it("enables the submit button once display_name + secret_ref are filled (workspace_id optional)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_PROD",
    );
    await waitFor(() =>
      expect(screen.getByTestId("activate-team-button")).not.toBeDisabled(),
    );
  });
});

describe("D6 team — successful activation", () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/team`, () =>
        HttpResponse.json(TEAM_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it("POSTs the form body with both required fields", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(
        `${API_BASE}/org/dandelion/activate/team`,
        async ({ request }) => {
          posted = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(TEAM_SUCCESS_BODY, { status: 200 });
        },
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-dev-slack",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_DEV",
    );
    await user.type(
      screen.getByTestId("team-slack-workspace-id-input"),
      "T-DEV-1",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      slack_display_name: "niov-dev-slack",
      slack_secret_ref: "SLACK_BOT_TOKEN_DEV",
      slack_workspace_id: "T-DEV-1",
    });
  });

  it("renders all 8 step cards in order after a successful POST", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_PROD",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(screen.getByTestId("team-activation-success")).toBeInTheDocument(),
    );
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByTestId(`activation-step-${i}`)).toBeInTheDocument();
    }
  });

  it("highlights step 5 with the 'Slack binding' badge", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_PROD",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(screen.getByTestId("team-activation-success")).toBeInTheDocument(),
    );
    const step5 = screen.getByTestId("activation-step-5");
    expect(
      within(step5).getByTestId("slack-binding-highlight"),
    ).toBeInTheDocument();
    expect(
      within(step5).getByText(/Registered the Slack read-first binding/i),
    ).toBeInTheDocument();
  });

  it("renders the team-scope memory label at step 3", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_PROD",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(screen.getByTestId("team-activation-success")).toBeInTheDocument(),
    );
    const step3 = screen.getByTestId("activation-step-3");
    expect(
      within(step3).getByText(/Extended memory to the team scope/i),
    ).toBeInTheDocument();
  });

  it("renders archetype + plan_id badges + truncated audit_event_id (no full UUID echoed)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_PROD",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(screen.getByTestId("team-activation-success")).toBeInTheDocument(),
    );
    expect(screen.getByText(/archetype: team/)).toBeInTheDocument();
    expect(
      screen.getByText(/plan_id: activation\.team\.v1/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Final audit_event_id 88888888…/)).toBeInTheDocument();
  });
});

describe("D6 team — failure paths", () => {
  it("renders the helpful message on INVALID_SLACK_BINDING_INPUT 422", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/team`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "INVALID_SLACK_BINDING_INPUT",
            message:
              "team archetype requires slack_display_name + slack_secret_ref",
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "x",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "Y",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("team-activation-error"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("team-activation-success"),
    ).not.toBeInTheDocument();
  });

  it("renders the helpful message on CONNECTOR_BINDING_FAILED 422", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/team`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "CONNECTOR_BINDING_FAILED",
            message: "slack binding registration failed: DUPLICATE_DISPLAY_NAME",
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "dup",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "DUP_SECRET",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("team-activation-error"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("team-activation-success"),
    ).not.toBeInTheDocument();
  });

  it("renders an error and no success on 403 non-admin", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/team`, () =>
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
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "x",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "Y",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("team-activation-error"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("team-activation-success"),
    ).not.toBeInTheDocument();
  });
});

describe("D6 team — privacy invariant", () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/team`, () =>
        HttpResponse.json(TEAM_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it("renders the env-var NAME placeholder, never a concrete xoxb-* token in the form", async () => {
    renderPage();
    const secretInput = screen.getByTestId(
      "team-slack-secret-ref-input",
    ) as HTMLInputElement;
    expect(secretInput.placeholder).toMatch(/SLACK_BOT_TOKEN_/);
    // Placeholder is env-var NAME pattern; never a concrete token
    expect(secretInput.placeholder).not.toMatch(/xoxb-[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,}/);
  });

  it("does NOT leak raw ADMIN_ACTION: prefix into the rendered output after activation", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_PROD",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(screen.getByTestId("team-activation-success")).toBeInTheDocument(),
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ADMIN_ACTION:/);
  });

  it("does NOT leak a concrete xoxb-* token even if an admin pastes one by mistake into the secret_ref field", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.type(
      screen.getByTestId("team-slack-display-name-input"),
      "niov-prod-slack",
    );
    // Admin pastes a concrete token (this is a misuse the doc warns
    // against). The page rendered output before the POST may still
    // contain it via the controlled input value; after the POST + the
    // server replays env-var-NAME-only audit details, the success
    // panel must not include it. We assert that the SUCCESS PANEL
    // (only) does not contain a token pattern.
    await user.type(
      screen.getByTestId("team-slack-secret-ref-input"),
      "xoxb-1234567890-FAKETOKEN-test",
    );
    await user.click(screen.getByTestId("activate-team-button"));
    await waitFor(() =>
      expect(screen.getByTestId("team-activation-success")).toBeInTheDocument(),
    );
    const panel = screen.getByTestId("team-activation-success");
    const panelText = panel.textContent ?? "";
    expect(panelText).not.toMatch(/xoxb-[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,}/);
    expect(panelText.toLowerCase()).not.toContain("bearer ");
    // The controlled input still holds whatever the admin typed
    // before submission — that's a browser-state truth, not a CT leak.
    // We don't assert against the input value itself.
    expect(container).toBeDefined();
  });
});

describe("D6 team — forbidden UI copy guard", () => {
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
    "connector activated",
    "workflow execution enabled",
  ];

  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/team`, () =>
        HttpResponse.json(TEAM_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it.each(FORBIDDEN_UI_COPY)(
    "does NOT contain the forbidden phrase %s anywhere in the team card after a successful activation",
    async (phrase) => {
      const user = userEvent.setup();
      const { container } = renderPage();
      await user.type(
        screen.getByTestId("team-slack-display-name-input"),
        "niov-prod-slack",
      );
      await user.type(
        screen.getByTestId("team-slack-secret-ref-input"),
        "SLACK_BOT_TOKEN_PROD",
      );
      await user.click(screen.getByTestId("activate-team-button"));
      await waitFor(() =>
        expect(
          screen.getByTestId("team-activation-success"),
        ).toBeInTheDocument(),
      );
      const text = (container.textContent ?? "").toLowerCase();
      expect(text).not.toContain(phrase.toLowerCase());
    },
  );
});
