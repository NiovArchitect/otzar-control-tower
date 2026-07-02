// FILE: tests/unit/dandelion-enterprise-activation-walk.test.tsx
// PURPOSE: Page tests for the D6 Dandelion Stage F enterprise-
//          archetype activation admin walk surface (Foundation
//          PR #202 — D6 enterprise-archetype activation runtime).
//          Verifies:
//          - Enterprise activation card renders with the doctrine +
//            both Slack + Google form sections
//          - Submit disabled until all 4 required fields filled
//          - Click activates the enterprise envelope via POST
//            /api/v1/org/dandelion/activate/enterprise with the
//            form body
//          - 14 step cards render in order with customer-admin
//            labels
//          - Steps 8 + 9 get connector-binding highlight badges
//          - Steps 10 + 11 get NEW DUAL-CONTROL highlight badges
//            (truthfully recording catalog design-intent;
//            actual dual-control approval flow forward-substrate)
//          - Step 3 (enterprise scope) + step 5 (delegated
//            authority) + step 6 (break-glass) + step 7
//            (LawfulBasis) + step 12 (board observer) labels
//          - INVALID_GOOGLE_BINDING_INPUT 422 renders helpful
//            customer-admin message
//          - 403 non-admin → error message (no success)
//          - Privacy invariant: no concrete xoxb-* / ya29.* /
//            private-key JSON / Bearer regex in success panel —
//            even when the admin pastes concrete tokens by mistake
//          - Forbidden UI copy guard (14 phrases) on the enterprise
//            card
// CONNECTS TO: src/pages/Onboarding.tsx (EnterpriseActivationCard),
//              src/lib/api.ts (api.dandelionActivation.activateEnterprise),
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
    token: "tok-d6-enterprise",
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

// Successful enterprise-activation response (mirrors Foundation
// PR #202's 14-step ActivationSuccess).
const ENTERPRISE_SUCCESS_BODY = {
  ok: true as const,
  archetype: "enterprise",
  plan_id: "activation.enterprise.v1",
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
      step_id: "step.dmw.full-scope-extension",
      audit_literal: "ADMIN_ACTION:DMW_ENTERPRISE_SCOPE_GRANTED",
      audit_event_id: "33333333-3333-3333-3333-333333333333",
    },
    {
      step_order: 4,
      step_id: "step.role.enterprise-template-assignment",
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
      step_id: "step.break-glass.grant-registry-enable",
      audit_literal: "ADMIN_ACTION:BREAK_GLASS_REGISTRY_ENABLED",
      audit_event_id: "66666666-6666-6666-6666-666666666666",
    },
    {
      step_order: 7,
      step_id: "step.lawful-basis.attestation-surface-enable",
      audit_literal: "ADMIN_ACTION:LAWFUL_BASIS_ATTESTATION_ENABLED",
      audit_event_id: "77777777-7777-7777-7777-777777777777",
    },
    {
      step_order: 8,
      step_id: "step.connector.slack-binding-register",
      audit_literal: "ADMIN_ACTION:CONNECTOR_BINDING_REGISTERED",
      audit_event_id: "88888888-8888-8888-8888-888888888888",
    },
    {
      step_order: 9,
      step_id: "step.connector.google-workspace-binding-register",
      audit_literal: "ADMIN_ACTION:CONNECTOR_BINDING_REGISTERED",
      audit_event_id: "99999999-9999-9999-9999-999999999999",
    },
    {
      step_order: 10,
      step_id: "step.workflow.stage-2-enterprise-templates-register",
      audit_literal: "ADMIN_ACTION:WORKFLOW_TEMPLATE_REGISTERED_DUAL_CONTROL",
      audit_event_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    },
    {
      step_order: 11,
      step_id: "step.audit.regulator-grade-enable",
      audit_literal: "ADMIN_ACTION:REGULATOR_GRADE_AUDIT_ENABLED_DUAL_CONTROL",
      audit_event_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    },
    {
      step_order: 12,
      step_id: "step.board.observer-scope-register",
      audit_literal: "ADMIN_ACTION:BOARD_OBSERVER_SCOPE_REGISTERED",
      audit_event_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    },
    {
      step_order: 13,
      step_id: "step.aha.enterprise-multi-connector-register",
      audit_literal: "ADMIN_ACTION:AHA_MOMENT_REGISTERED",
      audit_event_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    },
    {
      step_order: 14,
      step_id: "step.envelope.mark-activated",
      audit_literal: "ADMIN_ACTION:STARTER_ENVELOPE_ACTIVATED",
      audit_event_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    },
  ],
  activation_audit_event_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
};

async function fillRequiredFields() {
  if (
    screen.queryByTestId("dandelion-enterprise-activation-card") === null
  ) {
    renderPage();
  }
  const user = userEvent.setup();
  await user.type(
    screen.getByTestId("enterprise-slack-display-name-input"),
    "niov-prod-slack",
  );
  await user.type(
    screen.getByTestId("enterprise-slack-secret-ref-input"),
    "SLACK_BOT_TOKEN_PROD",
  );
  await user.type(
    screen.getByTestId("enterprise-google-display-name-input"),
    "niov-prod-google",
  );
  await user.type(
    screen.getByTestId("enterprise-google-secret-ref-input"),
    "GOOGLE_ACCESS_TOKEN_PROD",
  );
  return user;
}

describe("D6 enterprise — card shell", () => {
  it("renders the enterprise activation card on /onboarding", () => {
    renderPage();
    expect(
      screen.getByTestId("dandelion-enterprise-activation-card"),
    ).toBeInTheDocument();
  });

  it("renders the doctrine line about activating the enterprise envelope", () => {
    renderPage();
    expect(
      screen.getAllByText(/Activate the enterprise rollout/i).length,
    ).toBeGreaterThan(0);
  });

  it("renders the privacy notice about both Slack + Google env-var NAMEs", () => {
    renderPage();
    const noticeText =
      screen.getByTestId("enterprise-privacy-notice").textContent ?? "";
    expect(noticeText).toMatch(/Slack and Google env-var NAME/i);
    expect(noticeText).toMatch(/deployment host/i);
    expect(noticeText).toMatch(/Never paste the resolved bot token/i);
    expect(noticeText).toMatch(/OAuth access token/i);
  });

  it("renders all 6 form inputs (Slack 3 + Google 3)", () => {
    renderPage();
    expect(
      screen.getByTestId("enterprise-slack-display-name-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("enterprise-slack-secret-ref-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("enterprise-slack-workspace-id-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("enterprise-google-display-name-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("enterprise-google-secret-ref-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("enterprise-google-workspace-domain-input"),
    ).toBeInTheDocument();
  });

  it("renders the submit button disabled until all 4 required fields are filled", () => {
    renderPage();
    expect(
      screen.getByTestId("activate-enterprise-button"),
    ).toBeDisabled();
  });

  it("enables the submit button once all 4 required fields are filled", async () => {
    renderPage();
    await fillRequiredFields();
    await waitFor(() =>
      expect(
        screen.getByTestId("activate-enterprise-button"),
      ).not.toBeDisabled(),
    );
  });
});

describe("D6 enterprise — successful activation", () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/enterprise`, () =>
        HttpResponse.json(ENTERPRISE_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it("POSTs the form body with all 6 fields when both optional workspace identifiers are filled", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(
        `${API_BASE}/org/dandelion/activate/enterprise`,
        async ({ request }) => {
          posted = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(ENTERPRISE_SUCCESS_BODY, { status: 200 });
        },
      ),
    );
    const user = await fillRequiredFields();
    await user.type(
      screen.getByTestId("enterprise-slack-workspace-id-input"),
      "T-PROD-1",
    );
    await user.type(
      screen.getByTestId("enterprise-google-workspace-domain-input"),
      "niov.io",
    );
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      slack_display_name: "niov-prod-slack",
      slack_secret_ref: "SLACK_BOT_TOKEN_PROD",
      slack_workspace_id: "T-PROD-1",
      google_display_name: "niov-prod-google",
      google_secret_ref: "GOOGLE_ACCESS_TOKEN_PROD",
      google_workspace_domain: "niov.io",
    });
  });

  it("renders all 14 step cards in order after a successful POST", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    for (let i = 1; i <= 14; i++) {
      expect(
        screen.getByTestId(`activation-step-${i}`),
      ).toBeInTheDocument();
    }
  });

  it("highlights step 8 (Slack binding) AND step 9 (Google binding) AND steps 10 + 11 (DUAL-CONTROL)", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    const step8 = screen.getByTestId("activation-step-8");
    expect(
      within(step8).getByTestId("slack-binding-highlight"),
    ).toBeInTheDocument();
    const step9 = screen.getByTestId("activation-step-9");
    expect(
      within(step9).getByTestId("google-binding-highlight"),
    ).toBeInTheDocument();
    const step10 = screen.getByTestId("activation-step-10");
    expect(
      within(step10).getByTestId("dual-control-highlight"),
    ).toBeInTheDocument();
    const step11 = screen.getByTestId("activation-step-11");
    expect(
      within(step11).getByTestId("dual-control-highlight"),
    ).toBeInTheDocument();
  });

  it("renders the enterprise-scope memory label at step 3", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId("activation-step-3")).getByText(
        /Extended memory to full enterprise scope/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the break-glass label at step 6", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    const step6 = screen.getByTestId("activation-step-6");
    expect(
      within(step6).getByText(/Enabled the break-glass grant registry/i),
    ).toBeInTheDocument();
    expect(
      within(step6).getByText(/underlying substrate forward-substrate/i),
    ).toBeInTheDocument();
  });

  it("renders the LawfulBasis attestation label at step 7", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    const step7 = screen.getByTestId("activation-step-7");
    expect(
      within(step7).getByText(/Enabled the lawful-basis attestation/i),
    ).toBeInTheDocument();
  });

  it("renders the board observer label at step 12", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    const step12 = screen.getByTestId("activation-step-12");
    expect(
      within(step12).getByText(/Registered the board observer scope/i),
    ).toBeInTheDocument();
    expect(
      within(step12).getByText(/no per-employee detail/i),
    ).toBeInTheDocument();
  });

  it("renders archetype + plan_id badges + truncated audit_event_id", async () => {
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/archetype: enterprise/)).toBeInTheDocument();
    expect(
      screen.getByText(/plan_id: activation\.enterprise\.v1/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Final audit_event_id eeeeeeee…/)).toBeInTheDocument();
  });
});

describe("D6 enterprise — failure paths", () => {
  it("renders helpful message on INVALID_GOOGLE_BINDING_INPUT 422", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/enterprise`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "INVALID_GOOGLE_BINDING_INPUT",
            message:
              "enterprise archetype requires google_display_name + google_secret_ref",
          },
          { status: 422 },
        ),
      ),
    );
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-error"),
      ).toBeInTheDocument(),
    );
    const errorText =
      screen.getByTestId("enterprise-activation-error").textContent ?? "";
    expect(errorText).toMatch(/Google Workspace connection/i);
    expect(errorText).toMatch(/credential reference/i);
    expect(
      screen.queryByTestId("enterprise-activation-success"),
    ).not.toBeInTheDocument();
  });

  it("renders error on 403 non-admin", async () => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/enterprise`, () =>
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
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-error"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("enterprise-activation-success"),
    ).not.toBeInTheDocument();
  });
});

describe("D6 enterprise — privacy invariant", () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/org/dandelion/activate/enterprise`, () =>
        HttpResponse.json(ENTERPRISE_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it("Slack secret_ref placeholder is env-var NAME pattern, never a concrete xoxb-* token", () => {
    renderPage();
    const slackSecret = screen.getByTestId(
      "enterprise-slack-secret-ref-input",
    ) as HTMLInputElement;
    expect(slackSecret.placeholder).toMatch(/SLACK_BOT_TOKEN_/);
    expect(slackSecret.placeholder).not.toMatch(/xoxb-[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,}/);
  });

  it("Google secret_ref placeholder is env-var NAME pattern, never a concrete ya29.* token", () => {
    renderPage();
    const googleSecret = screen.getByTestId(
      "enterprise-google-secret-ref-input",
    ) as HTMLInputElement;
    expect(googleSecret.placeholder).toMatch(/GOOGLE_ACCESS_TOKEN_/);
    expect(googleSecret.placeholder).not.toMatch(/ya29\.[A-Za-z0-9_-]{8,}/);
  });

  it("does NOT leak raw ADMIN_ACTION: prefix into the rendered output after activation", async () => {
    const { container } = renderPage();
    const user = await fillRequiredFields();
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ADMIN_ACTION:/);
  });

  it("success panel does NOT contain xoxb-* / ya29.* / private-key JSON / Bearer even if admin pastes concrete tokens by mistake", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByTestId("enterprise-slack-display-name-input"),
      "niov-prod-slack",
    );
    await user.type(
      screen.getByTestId("enterprise-slack-secret-ref-input"),
      "xoxb-1234567890-FAKETOKEN-test",
    );
    await user.type(
      screen.getByTestId("enterprise-google-display-name-input"),
      "niov-prod-google",
    );
    await user.type(
      screen.getByTestId("enterprise-google-secret-ref-input"),
      "ya29.FAKETOKENBEARERTEST1234567890",
    );
    await user.click(screen.getByTestId("activate-enterprise-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("enterprise-activation-success"),
      ).toBeInTheDocument(),
    );
    const panel = screen.getByTestId("enterprise-activation-success");
    const panelText = panel.textContent ?? "";
    expect(panelText).not.toMatch(/xoxb-[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,}/);
    expect(panelText).not.toMatch(/ya29\.[A-Za-z0-9_-]{8,}/);
    expect(panelText).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
    expect(panelText).not.toMatch(/"private_key":/);
    expect(panelText.toLowerCase()).not.toContain("bearer ");
  });
});

describe("D6 enterprise — forbidden UI copy guard", () => {
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
      http.post(`${API_BASE}/org/dandelion/activate/enterprise`, () =>
        HttpResponse.json(ENTERPRISE_SUCCESS_BODY, { status: 200 }),
      ),
    );
  });

  it.each(FORBIDDEN_UI_COPY)(
    "does NOT contain the forbidden phrase %s anywhere in the enterprise card after a successful activation",
    async (phrase) => {
      const { container } = renderPage();
      const user = await fillRequiredFields();
      await user.click(screen.getByTestId("activate-enterprise-button"));
      await waitFor(() =>
        expect(
          screen.getByTestId("enterprise-activation-success"),
        ).toBeInTheDocument(),
      );
      const text = (container.textContent ?? "").toLowerCase();
      expect(text).not.toContain(phrase.toLowerCase());
    },
  );
});
