// FILE: tests/unit/avp2-evidence-handoff-panel.test.tsx
// PURPOSE: OTZAR-E2E-6 — render tests for the read-only result/evidence handoff panel:
//          shows result/evidence /tmp paths, paste-validate → proof checklist + delivered
//          note + Federation Cloud /avp2/load route, refuses unsafe/production results with
//          safe codes, and exposes no upload/network/send/execute controls.
// CONNECTS TO: src/components/otzar/Avp2EvidenceHandoffPanel.tsx.

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Avp2EvidenceHandoffPanel } from "@/components/otzar/Avp2EvidenceHandoffPanel";
import { DEMO_LOCAL_LIVE_RESULT } from "@/lib/connectors/avp2-governed-access";

function pasteAndValidate(json: string): void {
  fireEvent.change(screen.getByTestId("avp2-handoff-input"), { target: { value: json } });
  fireEvent.click(screen.getByTestId("avp2-handoff-validate"));
}

describe("Avp2EvidenceHandoffPanel", () => {
  it("1. renders the result + evidence /tmp paths", () => {
    render(<Avp2EvidenceHandoffPanel />);
    const text = screen.getByTestId("avp2-handoff-panel").textContent ?? "";
    expect(text).toContain("/tmp/avp2-e2e-result.json");
    expect(text).toContain("/tmp/avp-positive-evidence.json");
    expect(text).toMatch(/After running the sidecar/i);
  });

  it("2. pasting a valid live result shows live proof + the checklist", () => {
    render(<Avp2EvidenceHandoffPanel />);
    pasteAndValidate(JSON.stringify(DEMO_LOCAL_LIVE_RESULT));
    expect(screen.getByTestId("avp2-handoff-status").textContent).toMatch(/Local live proof/i);
    expect(screen.getByTestId("avp2-handoff-proof-level").textContent).toBe("LOCAL_LIVE");
    const checklist = screen.getByTestId("avp2-handoff-checklist").textContent ?? "";
    for (const label of ["Quote", "Accept", "Access receipt", "Proof"]) expect(checklist).toContain(label);
  });

  it("3. renders the delivered=false explanation", () => {
    render(<Avp2EvidenceHandoffPanel />);
    pasteAndValidate(JSON.stringify(DEMO_LOCAL_LIVE_RESULT));
    expect(screen.getByTestId("avp2-handoff-delivered-note").textContent).toMatch(/Delivered false is acceptable when proof resolved/i);
  });

  it("4. renders the Federation Cloud load route in the next action", () => {
    render(<Avp2EvidenceHandoffPanel />);
    pasteAndValidate(JSON.stringify(DEMO_LOCAL_LIVE_RESULT));
    expect(screen.getByTestId("avp2-handoff-next").textContent).toContain("/avp2/load");
    expect(screen.getByTestId("avp2-handoff-routes").textContent).toContain("/avp2/load");
  });

  it("5. a PRODUCTION_LIVE paste shows a safe error (no render)", () => {
    render(<Avp2EvidenceHandoffPanel />);
    pasteAndValidate(JSON.stringify({ ...DEMO_LOCAL_LIVE_RESULT, proof_level: "PRODUCTION_LIVE" }));
    expect(screen.getByTestId("avp2-handoff-error").textContent).toContain("PRODUCTION_PROOF_REFUSED");
    expect(screen.queryByTestId("avp2-handoff-summary")).toBeNull();
  });

  it("6. an unsafe (token) paste shows a safe error, never the token", () => {
    render(<Avp2EvidenceHandoffPanel />);
    pasteAndValidate(`${JSON.stringify(DEMO_LOCAL_LIVE_RESULT)} access_token=sk_live_x`);
    const err = screen.getByTestId("avp2-handoff-error").textContent ?? "";
    expect(err).toContain("SECRET_MARKER_IN_RESULT_TEXT");
    expect(err).not.toContain("sk_live");
  });

  it("7. exposes no upload/network/send/execute controls (only Validate)", () => {
    const { container } = render(<Avp2EvidenceHandoffPanel />);
    // No file-upload input.
    expect(container.querySelector('input[type="file"]')).toBeNull();
    // No action button other than the read-only Validate.
    expect(screen.queryByRole("button", { name: /upload|send|execute|run|submit/i })).toBeNull();
    expect(screen.getByTestId("avp2-handoff-validate").textContent).toMatch(/Validate result/i);
  });
});
