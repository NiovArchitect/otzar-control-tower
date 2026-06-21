// FILE: tests/unit/avp2-governed-access-card.test.tsx
// PURPOSE: OTZAR-E2E-1 — render tests for the read-only AVP² governed-access card:
//          the default live demo shows local-live proof + the quote→proof checklist +
//          Federation Cloud routes, a dry-run result shows a not-live status, and the
//          card exposes no send/execute controls.
// CONNECTS TO: src/components/otzar/Avp2GovernedAccessCard.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avp2GovernedAccessCard } from "@/components/otzar/Avp2GovernedAccessCard";
import { DEMO_DRY_RUN_RESULT } from "@/lib/connectors/avp2-governed-access";

describe("Avp2GovernedAccessCard", () => {
  it("1. renders the default local-live demo as live proof", () => {
    render(<Avp2GovernedAccessCard />);
    expect(screen.getByTestId("avp2-governed-access-card")).toBeInTheDocument();
    expect(screen.getByTestId("avp2-status").textContent).toMatch(/Local live proof/i);
    expect(screen.getByTestId("avp2-proof-level").textContent).toBe("LOCAL_LIVE");
  });

  it("2. shows the quote → accept → access receipt → proof checklist", () => {
    render(<Avp2GovernedAccessCard />);
    const steps = screen.getByTestId("avp2-steps");
    for (const label of ["Quote", "Accept", "Access receipt", "Proof"]) {
      expect(steps.textContent).toContain(label);
    }
  });

  it("3. surfaces Federation Cloud routes", () => {
    render(<Avp2GovernedAccessCard />);
    const text = screen.getByTestId("avp2-governed-access-card").textContent ?? "";
    expect(text).toContain("/avp2/e2e");
    expect(text).toContain("/avp2/evidence");
  });

  it("4. delivered=false is shown as acceptable when proof resolved", () => {
    render(<Avp2GovernedAccessCard />);
    expect(screen.getByTestId("avp2-delivered").textContent).toMatch(/Delivered: false/);
    expect(screen.getByTestId("avp2-delivered").textContent).toMatch(/proof reference/i);
  });

  it("5. a dry-run result renders a not-live status", () => {
    render(<Avp2GovernedAccessCard result={DEMO_DRY_RUN_RESULT} />);
    expect(screen.getByTestId("avp2-status").textContent).toMatch(/Not live/i);
    expect(screen.getByTestId("avp2-provenance").textContent).toBe("DRY_RUN");
  });

  it("6. has no send/execute/external-write control", () => {
    render(<Avp2GovernedAccessCard />);
    const text = (screen.getByTestId("avp2-governed-access-card").textContent ?? "").toLowerCase();
    expect(text).not.toContain("send");
    expect(text).not.toContain("execute");
  });
});
