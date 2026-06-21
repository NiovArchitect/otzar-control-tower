// FILE: tests/unit/avp2-evidence-handoff.test.ts
// PURPOSE: OTZAR-E2E-6 — lock the result/evidence handoff model: live vs not-live summary,
//          delivered_ok logic, production/payment/listing/marker refusal, Federation Cloud
//          routes, the operator next action (/avp2/load), and the default evidence path.
// CONNECTS TO: src/lib/avp2/e2e-handoff.ts.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAvp2HandoffSummary, buildFederationCloudEvidenceHandoff, validateAvp2ResultFileText,
  HANDOFF_EVIDENCE_PATH, type Avp2HandoffSummary,
} from "@/lib/avp2/e2e-handoff";
import { DEMO_LOCAL_LIVE_RESULT, DEMO_DRY_RUN_RESULT } from "@/lib/connectors/avp2-governed-access";
import type { E2EResult } from "@/lib/avp2/e2e-contracts";

const clone = (): E2EResult => JSON.parse(JSON.stringify(DEMO_LOCAL_LIVE_RESULT)) as E2EResult;
const handoff = (r: E2EResult): Avp2HandoffSummary => buildAvp2HandoffSummary({ result: r });

describe("AVP² result/evidence handoff model", () => {
  it("1. PASS LIVE_LOCAL_RUN result builds a live handoff", () => {
    const h = handoff(DEMO_LOCAL_LIVE_RESULT);
    expect(h.ok).toBe(true);
    expect(h.is_live).toBe(true);
    expect(h.status).toBe("PASS");
    expect(h.proof_level).toBe("LOCAL_LIVE");
  });
  it("2. DRY_RUN result builds a non-live handoff", () => {
    const h = handoff(DEMO_DRY_RUN_RESULT);
    expect(h.is_live).toBe(false);
    expect(h.status).toBe("SKIP");
  });
  it("3. delivered=false with proof_resolved=true → delivered_ok true", () => {
    expect(handoff(DEMO_LOCAL_LIVE_RESULT).result_summary.delivered_ok).toBe(true);
  });
  it("4. delivered=false with proof_resolved=false → delivered_ok false", () => {
    const r = clone(); r.summary.proof_resolved = false;
    expect(handoff(r).result_summary.delivered_ok).toBe(false);
  });
  it("5. PRODUCTION_LIVE rejected", () => {
    const r = clone(); r.proof_level = "PRODUCTION_LIVE";
    const h = handoff(r);
    expect(h.ok).toBe(false);
    expect(h.errors).toContain("PRODUCTION_PROOF_REFUSED");
  });
  it("6. real_payment true rejected", () => {
    const r = { ...clone(), echo: { real_payment: true } } as unknown as E2EResult;
    expect(handoff(r).errors).toContain("REAL_PAYMENT_REFUSED");
  });
  it("7. public_listing true rejected", () => {
    const r = { ...clone(), echo: { public_listing: true } } as unknown as E2EResult;
    expect(handoff(r).errors).toContain("PUBLIC_LISTING_REFUSED");
  });
  it("8. access_token marker rejected (via paste validator)", () => {
    const text = `${JSON.stringify(DEMO_LOCAL_LIVE_RESULT)} access_token=x`;
    expect(validateAvp2ResultFileText(text).errors).toContain("SECRET_MARKER_IN_RESULT_TEXT");
  });
  it("9. private_key marker rejected (via paste validator)", () => {
    expect(validateAvp2ResultFileText(`${JSON.stringify(DEMO_LOCAL_LIVE_RESULT)} private_key here`).ok).toBe(false);
  });
  it("10. raw content marker rejected", () => {
    const r = clone(); r.otzar_display.message = "leaked content body here";
    expect(handoff(r).errors).toContain("UNSAFE_MARKER");
  });
  it("11. Federation Cloud routes present", () => {
    const fc = handoff(DEMO_LOCAL_LIVE_RESULT).federation_cloud;
    expect(fc.load_route).toBe("/avp2/load");
    expect(fc.evidence_route).toBe("/avp2/evidence");
    expect(fc.timeline_route).toBe("/avp2/evidence/timeline");
    expect(fc.e2e_route).toBe("/avp2/e2e");
  });
  it("12. operator next action mentions /avp2/load", () => {
    expect(handoff(DEMO_LOCAL_LIVE_RESULT).operator_next_action).toContain("/avp2/load");
  });
  it("13. default evidence path is /tmp/avp-positive-evidence.json", () => {
    expect(buildFederationCloudEvidenceHandoff(DEMO_LOCAL_LIVE_RESULT).evidence_path).toBe(HANDOFF_EVIDENCE_PATH);
    expect(HANDOFF_EVIDENCE_PATH).toBe("/tmp/avp-positive-evidence.json");
  });
  it("13b. paste validator accepts a clean result and returns it", () => {
    const v = validateAvp2ResultFileText(JSON.stringify(DEMO_LOCAL_LIVE_RESULT));
    expect(v.ok).toBe(true);
    expect(v.result?.proof_level).toBe("LOCAL_LIVE");
  });
  it("13c. a PASS result with non-live provenance warns (not is_live)", () => {
    const r = clone(); r.provenance = "EVIDENCE_DERIVED";
    const h = handoff(r);
    expect(h.is_live).toBe(false);
    expect(h.warnings).toContain("PASS_BUT_NOT_LIVE_PROVENANCE");
  });
  it("14. docs mention the result/evidence files, /avp2/load, no production proof, and doctrine", () => {
    const doc = readFileSync(resolve(process.cwd(), "docs/avp2-governed-access-connector.md"), "utf8");
    expect(doc).toContain("/tmp/avp2-e2e-result.json");
    expect(doc).toContain("/tmp/avp-positive-evidence.json");
    expect(doc).toContain("/avp2/load");
    expect(doc).toMatch(/No production proof|PRODUCTION_LIVE refused/);
    expect(doc).toContain("The agent does not scrape the website.");
  });
});
