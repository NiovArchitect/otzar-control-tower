// FILE: tests/unit/dandelion-business-activation-walk.test.tsx
// PURPOSE: Page tests for the D6 Dandelion Stage F business-archetype
//          activation admin walk surface (Foundation PR #200 — D6
//          business-archetype activation runtime).
//          Verifies:
//          - Business activation card renders with the doctrine +
//            both Slack + Google form sections
//          - Submit disabled until all 4 required fields filled
//          - Click activates the business envelope via POST
//            /api/v1/org/dandelion/activate/business with the form body
//          - 11 step cards render in order with customer-admin labels
//          - The Slack-binding step (step 6) AND the Google-binding
//            step (step 7) BOTH get the highlight badges
//          - INVALID_GOOGLE_BINDING_INPUT 422 renders the helpful
//            customer-admin message
//          - INVALID_SLACK_BINDING_INPUT 422 renders the helpful
//            customer-admin message
//          - CONNECTOR_BINDING_FAILED 422 renders its message
//          - Privacy invariant: no concrete xoxb-* / ya29.* /
//            private-key JSON / Bearer regex in the rendered success
//            panel — even when the admin pastes one by mistake
//          - Forbidden UI copy guard (14 phrases) on the business
//            card
// CONNECTS TO: src/pages/Onboarding.tsx (BusinessActivationCard),
//              src/lib/api.ts (api.dandelionActivation.activateBusiness),
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
    token: "tok-d6-business",
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

// Successful business-activation response (mirrors Foundation
// PR #200's 11-step ActivationSuccess).
const BUSINESS_SUCCESS_BODY = {
  ok: true as const,
  archetype: "business",
  plan_id: "activation.business.v1",
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
      step_id: "step.dmw.project-customer-scope-extension",
      audit_literal: "ADMIN_ACTION:DMW_PROJECT_CUSTOMER_SCOPE_GRANTED",
      audit_event_id: "33333333-3333-3333-3333-333333333333",
    },
    {
      step_order: 4,
      step_id: "step.role.business-template-assignment",
      audit_literal: "ADMIN_ACTION:ROLE_TEMPLATE_ASSIGNED",
      audit_event_id: "44444444-4444-4444-4444-444444444444",
    },
    {
      step_order: 5,
      step_id: "step.authority.delegated-profile-register",
      audit_literal: "ADMIN_ACTION:DELEGATED_AUTHORITY_REGISTERED",
      audit_event_id: "55555555-5555-5555-5555-555555555555",
    },
    {
      step_order: 6,
      step_id: "step.connector.slack-binding-register",
      audit_literal: "ADMIN_ACTION:CONNECTOR_BINDING_REGISTERED",
      audit_event_id: "66666666-6666-6666-6666-666666666666",
    },
    {
      step_order: 7,
      step_id: "step.connector.google-workspace-binding-register",
      audit_literal: "ADMIN_ACTION:CONNECTOR_BINDING_REGISTERED",
      audit_event_id: "77777777-7777-7777-7777-777777777777",
    },
    {
      step_order: 8,
      step_id: "step.workflow.stage-2-business-templates-register",
      audit_literal: "ADMIN_ACTION:WORKFLOW_TEMPLATE_REGISTERED",
      audit_event_id: "88888888-8888-8888-8888-888888888888",
    },
    {
      step_order: 9,
      step_id: "step.audit.advanced-tier-enable",
      audit_literal: "ADMIN_ACTION:ADVANCED_AUDIT_TIER_ENABLED",
      audit_event_id: "99999999-9999-9999-9999-999999999999",
    },
    {
      step_order: 10,
      step_id: "step.aha.multi-connector-register",
      audit_literal: "ADMIN_ACTION:AHA_MOMENT_REGISTERED",
      audit_event_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    },
    {
      step_order: 11,
      step_id: "step.envelope.mark-activated",
      audit_literal: "ADMIN_ACTION:STARTER_ENVELOPE_ACTIVATED",
      audit_event_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    },
  ],
  activation_audit_event_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
};

async function fillRequiredFields() {
  // Render the page first so the form fields exist; tests that
  // need access to the container can call renderPage() separately
  // before this helper. This helper deliberately renders the page
  // when not already mounted, so individual tests can call
  // fillRequiredFields() as their first line.
  if (screen.queryByTestId("dandelion-business-activation-card") === null) {
    renderPage();
  }
  const user = userEvent.setup();
  await user.type(
    screen.getByTestId("business-slack-display-name-input"),
    "niov-prod-slack",
  );
  await user.type(
    screen.getByTestId("business-slack-secret-ref-input"),
    "SLACK_BOT_TOKEN_PROD",
  );
  await user.type(
    screen.getByTestId("business-google-display-name-input"),
    "niov-prod-google",
  );
  await user.type(
    screen.getByTestId("business-google-secret-ref-input"),
    "GOOGLE_ACCESS_TOKEN_PROD",
  );
  return user;
}

describe("D6 business — card shell", () => {
  it("renders the business activation card on /onboarding", () => {
    renderPage();
    expect(
      screen.getByTestId("dandelion-business-activation-card"),
    ).toBeInTheDocument();
  });

  it("renders the doctrine line about activating the business envelope", () => {
    renderPage();
    expect(
      screen.getAllByText(/Activate the business rollout/i).length,
    ).toBeGreaterThan(0);
  });

  it("renders the privacy notice about both Slack + Google env-var NAMEs", () => {
    renderPage();
    const noticeText =
      screen.getByTestId("business-privacy-notice").textContent ?? "";
    expect(noticeText).toMatch(/Slack and Google env-var NAME/i);
    expect(noticeText).toMatch(/deployment host/i);
    expect(noticeText).toMatch(/Never paste the resolved bot token/i);
    expect(noticeText).toMatch(/OAuth access token/i);
  });

  it("renders all 6 form inputs (Slack 3 + Google 3)", () => {
    renderPage();
    expect(
      screen.getByTestId("business-slack-display-name-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("business-slack-secret-ref-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("business-slack-workspace-id-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("business-google-display-name-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("business-google-secret-ref-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("business-google-workspace-domain-input"),
    ).toBeInTheDocument();
  });

  it("renders the submit button disabled until all 4 required fields are filled", () => {
    renderPage();
    const submit = screen.getByTestId("activate-business-button");
    expect(submit).toBeDisabled();
  });

  it("enables the submit button once all 4 required fields are filled", async () => {
    renderPage();
    await fillRequiredFields();
    await waitFor(() =>
      expect(
        screen.getByTestId("activate-business-button"),
      ).not.toBeDisabled(),
    );
  });

  it("keeps submit disabled when only Slack fields are filled (Google missing)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("business-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("business-slack-secret-ref-input"),
      "SLACK_BOT_TOKEN_PROD",
    );
    expect(screen.getByTestId("activate-business-button")).toBeDisabled();
  });
});

describe("D6 business — successful activation", () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/business`, () =>
        HttpResponse.json(BUSINESS_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it("POSTs the form body with both Slack + Google required fields", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(
        `${API_BASE}/org/dandelion/activate/business`,
        async ({ request }) => {
          posted = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(BUSINESS_SUCCESS_BODY, { status: 200 });
        },
      ),
    );
    const user = await fillRequiredFields();
    await user.type(
      screen.getByTestId("business-slack-workspace-id-input"),
      "T-DEV-1",
    );
    await user.type(
      screen.getByTestId("business-google-workspace-domain-input"),
      "niov.io",
    );
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      slack_display_name: "niov-prod-slack",
      slack_secret_ref: "SLACK_BOT_TOKEN_PROD",
      slack_workspace_id: "T-DEV-1",
      google_display_name: "niov-prod-google",
      google_secret_ref: "GOOGLE_ACCESS_TOKEN_PROD",
      google_workspace_domain: "niov.io",
    });
  });

  it("renders all 11 step cards in order after a successful POST", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    for (let i = 1; i <= 11; i++) {
      expect(screen.getByTestId(`activation-step-${i}`)).toBeInTheDocument();
    }
  });

  it("highlights BOTH step 6 (Slack binding) AND step 7 (Google binding)", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    const step6 = screen.getByTestId("activation-step-6");
    expect(
      within(step6).getByTestId("slack-binding-highlight"),
    ).toBeInTheDocument();
    const step7 = screen.getByTestId("activation-step-7");
    expect(
      within(step7).getByTestId("google-binding-highlight"),
    ).toBeInTheDocument();
  });

  it("renders the project+customer scope label at step 3", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    const step3 = screen.getByTestId("activation-step-3");
    expect(
      within(step3).getByText(/Extended memory to project \+ customer scopes/i),
    ).toBeInTheDocument();
  });

  it("renders the delegated authority label at step 5", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    const step5 = screen.getByTestId("activation-step-5");
    expect(
      within(step5).getByText(/Registered delegated authority profiles/i),
    ).toBeInTheDocument();
  });

  it("renders the advanced audit tier label at step 9", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    const step9 = screen.getByTestId("activation-step-9");
    expect(
      within(step9).getByText(/Enabled the advanced audit tier/i),
    ).toBeInTheDocument();
  });

  it("renders archetype + plan_id badges + truncated audit_event_id", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/archetype: business/)).toBeInTheDocument();
    expect(
      screen.getByText(/plan_id: activation\.business\.v1/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Final audit_event_id bbbbbbbb…/)).toBeInTheDocument();
  });
});

describe("D6 business — failure paths", () => {
  it("renders helpful message on INVALID_GOOGLE_BINDING_INPUT 422", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/business`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "INVALID_GOOGLE_BINDING_INPUT",
            message:
              "business archetype requires google_display_name + google_secret_ref",
          },
          { status: 422 },
        ),
      ),
    );
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-error"),
      ).toBeInTheDocument(),
    );
    const errorText =
      screen.getByTestId("business-activation-error").textContent ?? "";
    expect(errorText).toMatch(/Google Workspace connection/i);
    expect(errorText).toMatch(/credential reference/i);
    expect(
      screen.queryByTestId("business-activation-success"),
    ).not.toBeInTheDocument();
  });

  it("renders helpful message on INVALID_SLACK_BINDING_INPUT 422", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/business`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "INVALID_SLACK_BINDING_INPUT",
            message:
              "business archetype requires slack_display_name + slack_secret_ref",
          },
          { status: 422 },
        ),
      ),
    );
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-error"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("business-activation-success"),
    ).not.toBeInTheDocument();
  });

  it("renders helpful message on CONNECTOR_BINDING_FAILED 422", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/business`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "CONNECTOR_BINDING_FAILED",
            message:
              "google workspace binding registration failed: DUPLICATE_DISPLAY_NAME",
          },
          { status: 422 },
        ),
      ),
    );
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-error"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("business-activation-success"),
    ).not.toBeInTheDocument();
  });

  it("renders error on 403 non-admin", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/business`, () =>
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
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-error"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("business-activation-success"),
    ).not.toBeInTheDocument();
  });
});

describe("D6 business — privacy invariant", () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/business`, () =>
        HttpResponse.json(BUSINESS_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it("Slack secret_ref placeholder is env-var NAME pattern, never a concrete xoxb-* token", () => {
    renderPage();
    const slackSecret = screen.getByTestId(
      "business-slack-secret-ref-input",
    ) as HTMLInputElement;
    expect(slackSecret.placeholder).toMatch(/SLACK_BOT_TOKEN_/);
    expect(slackSecret.placeholder).not.toMatch(/xoxb-[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,}/);
  });

  it("Google secret_ref placeholder is env-var NAME pattern, never a concrete ya29.* token", () => {
    renderPage();
    const googleSecret = screen.getByTestId(
      "business-google-secret-ref-input",
    ) as HTMLInputElement;
    expect(googleSecret.placeholder).toMatch(/GOOGLE_ACCESS_TOKEN_/);
    expect(googleSecret.placeholder).not.toMatch(/ya29\.[A-Za-z0-9_-]{8,}/);
  });

  it("does NOT leak raw ADMIN_ACTION: prefix into the rendered output after activation", async () => {
    const { container } = renderPage();
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ADMIN_ACTION:/);
  });

  it("success panel does NOT contain xoxb-* / ya29.* / private-key JSON / Bearer even if admin pastes concrete tokens by mistake", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("business-slack-display-name-input"),
      "niov-prod-slack",
    );
    // Admin pastes a fake concrete xoxb-* token (this is a misuse;
    // the doc warns against it)
    await user.type(
      screen.getByTestId("business-slack-secret-ref-input"),
      "xoxb-1234567890-FAKETOKEN-test",
    );
    await user.type(
      screen.getByTestId("business-google-display-name-input"),
      "niov-prod-google",
    );
    // Admin pastes a fake concrete ya29.* token (also misuse)
    await user.type(
      screen.getByTestId("business-google-secret-ref-input"),
      "ya29.FAKETOKENBEARERTEST1234567890",
    );
    await user.click(screen.getByTestId("activate-business-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("business-activation-success"),
      ).toBeInTheDocument(),
    );
    const panel = screen.getByTestId("business-activation-success");
    const panelText = panel.textContent ?? "";
    expect(panelText).not.toMatch(/xoxb-[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,}/);
    expect(panelText).not.toMatch(/ya29\.[A-Za-z0-9_-]{8,}/);
    expect(panelText).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
    expect(panelText).not.toMatch(/"private_key":/);
    expect(panelText.toLowerCase()).not.toContain("bearer ");
  });
});

describe("D6 business — forbidden UI copy guard", () => {
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
      http.post(`${API_BASE}/org/dandelion/activate/business`, () =>
        HttpResponse.json(BUSINESS_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it.each(FORBIDDEN_UI_COPY)(
    "does NOT contain the forbidden phrase %s anywhere in the business card after a successful activation",
    async (phrase) => {
      const { container } = renderPage();
      const user = await fillRequiredFields();
      await user.click(screen.getByTestId("activate-business-button"));
      await waitFor(() =>
        expect(
          screen.getByTestId("business-activation-success"),
        ).toBeInTheDocument(),
      );
      const text = (container.textContent ?? "").toLowerCase();
      expect(text).not.toContain(phrase.toLowerCase());
    },
  );
});
