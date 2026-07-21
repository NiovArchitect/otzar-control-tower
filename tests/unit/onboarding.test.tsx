// FILE: onboarding.test.tsx
// PURPOSE: Page tests for the ADR-0080 Wave 3 Dandelion Preview
//          (/onboarding). Verifies:
//          - /onboarding registers in the main nav
//          - renders Dandelion Preview shell
//          - shows canonical Founder doctrine line
//          - shows catalog counts (roles + tools + workflows + presets)
//          - shows Executive Assistant spotlight
//          - shows SAP Concur in EA tool/workflow context
//          - shows "Travel Booking + Expense Shell" aha moment
//          - shows "Connector presets are not live connectors."
//          - shows "Catalog entries are not permissions."
//          - shows governed envelope panel
//          - no Foundation API calls (read-only static mirror)
//          - forbidden UI copy guard (12 forbidden phrases)
// CONNECTS TO: src/pages/Onboarding.tsx, src/lib/ootb-catalog/data.ts,
//              src/lib/nav.ts.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnboardingPage } from "@/pages/Onboarding";
import { NAV } from "@/lib/nav";

// The OnboardingPage now hosts a D6 admin walk card that uses
// useMutation, which requires a QueryClientProvider ancestor. Wrap
// every render in a fresh per-test client so tests stay isolated.
// MemoryRouter is required for Organization breadcrumb Links.
function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ────────────────────────────────────────────────────────────────
// FORBIDDEN UI COPY GUARD per Founder Wave 3 spec. Each phrase here
// is matched at the positive-claim form — the page MUST NOT assert
// any of these as live state. The page IS permitted to use these as
// catalog-disclaimer text (e.g., "Workforce monitoring framing
// forbidden") which is why we match on substring at lower-case but
// the page deliberately uses NEUTRAL substitute wording for guard
// fields ("Workforce scoring" / "Workforce monitoring framing")
// rather than the literal forbidden tokens.
// ────────────────────────────────────────────────────────────────
const FORBIDDEN_UI_COPY = [
  "permission granted",
  "auto-approved",
  "full inbox access",
  "unrestricted write access",
  "employee score",
  "manager surveillance",
  "psychological profile",
  "guaranteed compliant",
  "regulator approved",
  "no fine risk",
  "digital twin profile created",
  "autonomous execution enabled",
  "ai decided",
  "ready to execute",
  "user configured",
];

describe("ADR-0080 Wave 3 — Organization starter-shape step (nav + route)", () => {
  it("registers Onboarding route (hidden from primary nav; reached from Organization)", () => {
    const entry = NAV.find((n) => n.to === "/onboarding");
    expect(entry).toBeDefined();
    expect(entry?.label).toBe("Onboarding");
    // RC2 jobs model: not a competing primary admin tab.
    expect(entry?.hidden).toBe(true);
  });
});

describe("ADR-0080 Wave 3 — Organization starter-shape shell + doctrine", () => {
  it("renders as a step inside Organization, not a separate product", () => {
    renderPage();
    expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recommended starter shape", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-back-to-setup")).toHaveAttribute(
      "href",
      "/setup",
    );
  });

  it("shows calm read-only doctrine (no builder codename as the lead)", () => {
    renderPage();
    expect(screen.getByTestId("dandelion-doctrine-card")).toBeInTheDocument();
    expect(screen.getByTestId("dandelion-doctrine-line")).toHaveTextContent(
      /Recommended defaults|Nothing activates until governance/i,
    );
  });

  it("declares catalog entries are not permissions", () => {
    renderPage();
    expect(
      screen.getByText("Catalog entries are not permissions."),
    ).toBeInTheDocument();
  });

  it("declares connector presets are not live connectors", () => {
    renderPage();
    const notice = screen.getByTestId("connector-not-live-notice");
    expect(notice).toHaveTextContent(
      "Connector presets are not live connectors. Nothing is connected from this page.",
    );
  });

  it("declares the preview does not activate tools/users/permissions/workflows/Twin profiles", () => {
    renderPage();
    expect(
      screen.getByText(
        "This preview does not activate tools, users, permissions, workflows, or AI Teammate profiles.",
      ),
    ).toBeInTheDocument();
  });

  it("does not lead with ambient builder hero or multi-system orientation", () => {
    renderPage();
    expect(screen.queryByTestId("ambient-workos-doctrine")).toBeNull();
    expect(screen.queryByTestId("admin-setup-orientation")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Getting started with Otzar/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Dandelion Preview/i })).toBeNull();
  });
});

describe("ADR-0080 Wave 3 Dandelion Preview -- catalog counts", () => {
  it("shows the canonical catalog counts (roles 15, departments 10, tools 95, workflows 30, connector presets 14, dandelion flows 1, total 187)", () => {
    renderPage();
    const counts = screen.getByTestId("dandelion-counts-card");
    expect(within(counts).getByTestId("count-roles")).toHaveTextContent("15");
    expect(within(counts).getByTestId("count-departments")).toHaveTextContent(
      "10",
    );
    expect(
      within(counts).getByTestId("count-company-variants"),
    ).toHaveTextContent("15");
    expect(within(counts).getByTestId("count-tools")).toHaveTextContent("95");
    expect(within(counts).getByTestId("count-workflows")).toHaveTextContent(
      "30",
    );
    expect(
      within(counts).getByTestId("count-connector-presets"),
    ).toHaveTextContent("14");
    expect(
      within(counts).getByTestId("count-dandelion-flows"),
    ).toHaveTextContent("1");
    expect(within(counts).getByTestId("count-total")).toHaveTextContent("187");
  });
});

describe("ADR-0080 Wave 3 Dandelion Preview -- role browser + EA spotlight", () => {
  it("shows the 15-row role list with Executive Assistant flagged as the deepest worked example", () => {
    renderPage();
    const list = screen.getByTestId("role-list");
    const rows = within(list).getAllByTestId(/^role-row-role\./);
    expect(rows.length).toBe(15);
    expect(
      screen.getByTestId("role-row-role.executive-assistant.v1"),
    ).toHaveTextContent("Executive Assistant");
    expect(screen.getByTestId("badge-deepest-example")).toBeInTheDocument();
  });

  it("renders the Executive Assistant spotlight with all required sections", () => {
    renderPage();
    const spot = screen.getByTestId("dandelion-ea-spotlight");
    expect(
      within(spot).getByTestId("ea-supported-executives"),
    ).toBeInTheDocument();
    expect(
      within(spot).getByTestId("ea-possible-direct-reports"),
    ).toBeInTheDocument();
    expect(within(spot).getByTestId("ea-workflows")).toBeInTheDocument();
    expect(within(spot).getByTestId("ea-tools")).toBeInTheDocument();
    expect(
      within(spot).getByTestId("ea-permission-bundles"),
    ).toBeInTheDocument();
    expect(within(spot).getByTestId("ea-aha-moments")).toBeInTheDocument();
    expect(within(spot).getByTestId("ea-safe-fallback")).toBeInTheDocument();
    expect(
      within(spot).getByTestId("ea-forbidden-inferences"),
    ).toBeInTheDocument();
  });

  it("shows SAP Concur in the EA tool list (Founder doctrine)", () => {
    renderPage();
    const eaTools = screen.getByTestId("ea-tools");
    expect(eaTools).toHaveTextContent(/SAP Concur/);
    // Concur family also includes Expensify / Ramp / Brex / Navan
    expect(eaTools).toHaveTextContent(/Expensify/);
    expect(eaTools).toHaveTextContent(/Ramp/);
    expect(eaTools).toHaveTextContent(/Brex/);
    expect(eaTools).toHaveTextContent(/Navan/);
  });

  it("shows the 'Travel Booking + Expense Shell' aha moment (Founder doctrine)", () => {
    renderPage();
    const aha = screen.getByTestId("ea-aha-moments");
    expect(aha).toHaveTextContent("Travel Booking + Expense Shell");
  });

  it("shows all 5 canonical aha moments under EA", () => {
    renderPage();
    const aha = screen.getByTestId("ea-aha-moments");
    expect(aha).toHaveTextContent("Tomorrow's Executive Brief");
    expect(aha).toHaveTextContent("Travel Booking + Expense Shell");
    expect(aha).toHaveTextContent("Executive Commitment Follow-Up Draft");
    expect(aha).toHaveTextContent("Board Meeting Prep Packet");
    expect(aha).toHaveTextContent("Focus Time Protection");
  });

  it("shows EA permission bundles with default state", () => {
    renderPage();
    const bundles = screen.getByTestId("ea-permission-bundles");
    expect(bundles).toHaveTextContent("Calendar Delegate");
    expect(bundles).toHaveTextContent("Email Draft / Triage");
    expect(bundles).toHaveTextContent("Travel Coordinator");
    expect(bundles).toHaveTextContent("Expense Assistant");
    expect(bundles).toHaveTextContent("Board Packet Coordinator");
    expect(bundles).toHaveTextContent("Focus Time Protector");
    expect(bundles).toHaveTextContent("Visitor / Vendor Coordinator");
    expect(bundles).toHaveTextContent("DISABLED_UNTIL_APPROVED");
    expect(bundles).toHaveTextContent("ENABLED");
  });

  it("shows the EA preview-only notice", () => {
    renderPage();
    expect(screen.getByTestId("ea-preview-only-notice")).toHaveTextContent(
      "Preview only — no calendar, inbox, travel, or expense system is connected here.",
    );
  });
});

describe("ADR-0080 Wave 3 Dandelion Preview -- tool + workflow + connector + flow + envelope panels", () => {
  it("renders the tool profile browser with representative cross-category samples", () => {
    renderPage();
    expect(screen.getByTestId("dandelion-tool-browser")).toBeInTheDocument();
    expect(screen.getByTestId("tool-row-tool.slack.v1")).toBeInTheDocument();
    expect(screen.getByTestId("tool-row-tool.sap-concur.v1")).toBeInTheDocument();
    expect(
      screen.getByTestId("tool-row-tool.salesforce.v1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("tool-row-tool.github.v1")).toBeInTheDocument();
  });

  it("renders the workflow browser with the Travel Booking + Expense Shell workflow row", () => {
    renderPage();
    const wfBrowser = screen.getByTestId("dandelion-workflow-browser");
    expect(
      within(wfBrowser).getByTestId(
        "workflow-row-workflow.travel-booking-expense-shell.v1",
      ),
    ).toHaveTextContent("Travel Booking + Expense Shell");
  });

  it("renders the connector preset preview with Travel + Expense and Google Workspace presets", () => {
    renderPage();
    const presets = screen.getByTestId("dandelion-connector-preset-preview");
    expect(
      within(presets).getByTestId("connector-preset-preset.travel-expense-read-first.v1"),
    ).toHaveTextContent("Travel + Expense (Read-First)");
    expect(
      within(presets).getByTestId(
        "connector-preset-preset.google-workspace-read-first.v1",
      ),
    ).toHaveTextContent("Google Workspace (Read-First)");
  });

  it("renders the Dandelion three-tier flow preview", () => {
    renderPage();
    const flow = screen.getByTestId("dandelion-flow-preview");
    expect(flow).toHaveTextContent("Company-level Dandelion");
    expect(flow).toHaveTextContent("Department-level Dandelion");
    expect(flow).toHaveTextContent("User-level Dandelion");
    expect(
      screen.getByTestId("flow-governance-review-points"),
    ).toBeInTheDocument();
  });

  it("renders the governed envelope panel with all required envelope fields", () => {
    renderPage();
    const env = screen.getByTestId("governed-envelope-panel");
    expect(env).toHaveTextContent("object_type");
    expect(env).toHaveTextContent("sensitivity_level");
    expect(env).toHaveTextContent("policy_purpose");
    expect(env).toHaveTextContent("scope_defaults");
    expect(env).toHaveTextContent("permission_defaults");
    expect(env).toHaveTextContent("audit_expectations");
    expect(env).toHaveTextContent("allowed_consumers");
    expect(env).toHaveTextContent("forbidden_consumers");
  });
});

describe("ADR-0080 Wave 3 Dandelion Preview -- role depth roadmap (Founder addendum)", () => {
  it("renders the role depth roadmap with DEEP + STARTER + NOT_YET_MODELED groups", () => {
    renderPage();
    expect(screen.getByTestId("role-depth-roadmap")).toBeInTheDocument();
    expect(screen.getByTestId("role-depth-group-DEEP")).toBeInTheDocument();
    expect(screen.getByTestId("role-depth-group-STARTER")).toBeInTheDocument();
    expect(
      screen.getByTestId("role-depth-group-NOT_YET_MODELED"),
    ).toBeInTheDocument();
  });

  it("flags Executive Assistant as DEEP in the roadmap", () => {
    renderPage();
    const deep = screen.getByTestId("role-depth-group-DEEP");
    expect(deep).toHaveTextContent("Executive Assistant");
  });

  it("flags CTO + CMO + AI Engineer + General Employee as NOT_YET_MODELED (Wave 2.1 priorities)", () => {
    renderPage();
    const notYet = screen.getByTestId("role-depth-group-NOT_YET_MODELED");
    expect(notYet).toHaveTextContent("CTO");
    expect(notYet).toHaveTextContent("CMO");
    expect(notYet).toHaveTextContent("AI Engineer");
    expect(notYet).toHaveTextContent(
      "General Employee / Individual Contributor",
    );
    expect(notYet).toHaveTextContent("Public Relations");
  });

  it("shows the honest-depth statement recommending Wave 2.1 expansion", () => {
    renderPage();
    expect(screen.getByTestId("role-depth-honesty-line")).toHaveTextContent(
      /Wave 2\.1 role-depth expansion is the recommended next slice/,
    );
  });
});

describe("ADR-0080 Wave 3 Dandelion Preview -- EA collaboration map (Founder addendum)", () => {
  it("renders the EA collaboration map with upward + cross-functional + approval-path entries", () => {
    renderPage();
    const map = screen.getByTestId("collaboration-map-panel");
    expect(map).toHaveTextContent("Executive Assistant");
    expect(screen.getByTestId("collab-upward")).toBeInTheDocument();
    expect(screen.getByTestId("collab-cross_functional")).toBeInTheDocument();
    expect(screen.getByTestId("collab-approval_path")).toBeInTheDocument();
    expect(screen.getByTestId("collab-escalation_path")).toBeInTheDocument();
  });
});

describe("ADR-0080 Wave 3 Dandelion Preview -- DMW education (Founder addendum)", () => {
  it("renders the canonical user-facing DMW line", () => {
    renderPage();
    expect(screen.getByTestId("dmw-user-line")).toHaveTextContent(
      "Your Memory Wallet is how Otzar remembers safely.",
    );
  });

  it("renders the canonical architecture DMW line", () => {
    renderPage();
    expect(screen.getByTestId("dmw-architecture-line")).toHaveTextContent(
      "Dandelion shapes the starter profile; the DMW scopes memory; Foundation governance authorizes use.",
    );
  });

  it("declares the DMW is auto-provisioned (no crypto setup required)", () => {
    renderPage();
    const dmw = screen.getByTestId("dmw-education-panel");
    expect(dmw).toHaveTextContent(/provisioned automatically/);
    expect(dmw).toHaveTextContent(/No crypto setup is required/);
  });
});

describe("ADR-0080 Wave 6 connector-priority ranking panel", () => {
  it("renders the Suggested first-connector ranking panel with the suggest-only notice", () => {
    renderPage();
    const panel = screen.getByTestId("connector-priority-ranking-panel");
    expect(panel).toBeInTheDocument();
    expect(
      screen.getByTestId("connector-priority-suggest-only-notice"),
    ).toHaveTextContent(
      "Suggest-only — derived deterministically from the static catalog",
    );
    expect(
      screen.getByTestId("connector-priority-suggest-only-notice"),
    ).toHaveTextContent("Nothing is connected from this page.");
  });

  it("renders all 14 ConnectorPreset rows ranked", () => {
    renderPage();
    const list = screen.getByTestId("priority-ranking-list");
    const rows = within(list).getAllByTestId(/^priority-row-preset\./);
    expect(rows.length).toBe(14);
  });

  it("ranks Slack #1 (Founder-doctrine alignment with Section 10 audit)", () => {
    renderPage();
    const slackRow = screen.getByTestId(
      "priority-row-preset.slack-read-first.v1",
    );
    expect(
      within(slackRow).getByTestId(
        "priority-rank-preset.slack-read-first.v1",
      ),
    ).toHaveTextContent("1");
    expect(
      within(slackRow).getByTestId(
        "priority-score-preset.slack-read-first.v1",
      ),
    ).toHaveTextContent("16");
  });

  it("surfaces the 4 forward-substrate inputs declared by the matrix", () => {
    renderPage();
    const fwd = screen.getByTestId("priority-forward-substrate-inputs");
    expect(fwd).toHaveTextContent("Dandelion_collected_demand");
    expect(fwd).toHaveTextContent("customer_demand");
    expect(fwd).toHaveTextContent("launch_necessity");
    expect(fwd).toHaveTextContent("demo_impact");
  });

  it("shows the matrix version", () => {
    renderPage();
    expect(
      screen.getByTestId("connector-priority-ranking-panel"),
    ).toHaveTextContent("wave-6-v1.0.0");
  });
});

describe("ADR-0080 Wave 3 Dandelion Preview -- forbidden UI copy guard", () => {
  it("does not contain any of the forbidden phrases", () => {
    renderPage();
    const text = document.body.textContent?.toLowerCase() ?? "";
    for (const phrase of FORBIDDEN_UI_COPY) {
      expect(text).not.toContain(phrase.toLowerCase());
    }
  });
});

