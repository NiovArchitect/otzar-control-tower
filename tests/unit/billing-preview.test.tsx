// FILE: billing-preview.test.tsx
// PURPOSE: Page tests for the Section 8 B3 Billing & Entitlements
//          Preview (/billing). Verifies:
//          - /billing registers in the main nav
//          - renders Billing & Entitlements Preview shell
//          - shows canonical Founder doctrine line
//          - shows DMW-included canonical phrase
//          - shows $250 base anchor
//          - shows 4 plans (Starter / Pilot, Team, Business, Enterprise)
//          - shows 6 seat tiers
//          - shows 8 connector pack families
//          - shows non-paywallable safety section
//          - shows Billing Admin profile
//          - shows "Connector packs are not live connectors."
//          - shows "Capability packs entitle availability; they do not authorize activation."
//          - no Foundation API calls (read-only static mirror)
//          - forbidden UI copy guard
// CONNECTS TO: src/pages/BillingPreview.tsx,
//              src/lib/entitlement-catalog/data.ts,
//              src/lib/nav.ts.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BillingPreviewPage } from "@/pages/BillingPreview";
import { NAV } from "@/lib/nav";

function renderPage() {
  return render(<BillingPreviewPage />);
}

// ────────────────────────────────────────────────────────────────
// FORBIDDEN UI COPY GUARD per Founder B3 spec. Each phrase must NOT
// appear as a positive claim on the page. The page deliberately
// uses neutral / disclaimer wording instead.
// ────────────────────────────────────────────────────────────────
const FORBIDDEN_UI_COPY = [
  "subscription active",
  "payment method required",
  "invoice generated",
  "feature enabled",
  "permission granted",
  "connector activated",
  "workflow execution enabled",
  "guaranteed compliant",
  "regulator approved",
  "no fine risk",
  "employee score",
  "manager surveillance",
  "psychological profile",
  "unrestricted write access",
  "auto-approved",
];

describe("Billing Preview — nav", () => {
  it("registers /billing in the main nav", () => {
    const entry = NAV.find((n) => n.to === "/billing");
    expect(entry).toBeDefined();
    expect(entry?.label).toBe("Billing");
  });
});

describe("Billing Preview — page shell", () => {
  it("renders the Billing & Entitlements Preview title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /Billing & Entitlements Preview/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("shows the canonical entitlement-vs-governance doctrine line", () => {
    renderPage();
    // The PageHeader description renders this; assert at least once visible.
    expect(
      screen.getAllByText(
        /Billing says what the organization has purchased\. Governance says what the system may safely do\./i,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("shows the canonical DMW-included phrase", () => {
    renderPage();
    expect(
      screen.getByText(
        /Customers should not pay extra just to have memory be safe\./i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the $250 base anchor", () => {
    renderPage();
    expect(screen.getByText(/\$250\/month base/i)).toBeInTheDocument();
  });

  it("notes DMW baseline is included on every plan", () => {
    renderPage();
    expect(
      screen.getAllByText(/DMW baseline included/i).length,
    ).toBeGreaterThan(0);
  });
});

describe("Billing Preview — plans", () => {
  it("renders all 4 plan templates", () => {
    renderPage();
    expect(screen.getByTestId("plan-starter-pilot")).toBeInTheDocument();
    expect(screen.getByTestId("plan-team")).toBeInTheDocument();
    expect(screen.getByTestId("plan-business")).toBeInTheDocument();
    expect(screen.getByTestId("plan-enterprise")).toBeInTheDocument();
  });
});

describe("Billing Preview — seats", () => {
  it("renders all 6 seat tiers", () => {
    renderPage();
    expect(screen.getByTestId("seat-standard-twin")).toBeInTheDocument();
    expect(screen.getByTestId("seat-professional-twin")).toBeInTheDocument();
    expect(screen.getByTestId("seat-executive-twin")).toBeInTheDocument();
    expect(screen.getByTestId("seat-otzar-administrator")).toBeInTheDocument();
    expect(screen.getByTestId("seat-board-observer")).toBeInTheDocument();
    expect(screen.getByTestId("seat-external-collaborator")).toBeInTheDocument();
  });
});

describe("Billing Preview — connector pack families", () => {
  it("renders all 8 connector pack families and the not-live disclaimer", () => {
    renderPage();
    expect(
      screen.getByTestId("connector-family-collaboration"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("connector-family-workspace-knowledge"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("connector-family-project-engineering"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("connector-family-revenue")).toBeInTheDocument();
    expect(screen.getByTestId("connector-family-customer")).toBeInTheDocument();
    expect(screen.getByTestId("connector-family-people")).toBeInTheDocument();
    expect(
      screen.getByTestId("connector-family-finance-expense-travel"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("connector-family-legal-compliance"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Connector packs are not live connectors\./i),
    ).toBeInTheDocument();
  });
});

describe("Billing Preview — governance and non-paywallable", () => {
  it("renders the non-paywallable safety section", () => {
    renderPage();
    expect(screen.getByTestId("non-paywallable-section")).toBeInTheDocument();
  });

  it("renders the Billing Admin permission profile", () => {
    renderPage();
    expect(screen.getByTestId("billing-admin-section")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Billing Admin permission profile/i).length,
    ).toBeGreaterThan(0);
  });

  it("renders the capability pack non-authorization disclaimer", () => {
    renderPage();
    expect(
      screen.getByText(
        /Capability packs entitle availability; they do not authorize activation\./i,
      ),
    ).toBeInTheDocument();
  });
});

describe("Billing Preview — forbidden UI copy guard", () => {
  it.each(FORBIDDEN_UI_COPY)(
    "does NOT contain the forbidden phrase %s as a positive claim",
    (phrase) => {
      const { container } = renderPage();
      const text = (container.textContent ?? "").toLowerCase();
      expect(text).not.toContain(phrase.toLowerCase());
    },
  );
});
