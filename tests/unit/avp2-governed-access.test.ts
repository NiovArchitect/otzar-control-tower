// FILE: tests/unit/avp2-governed-access.test.ts
// PURPOSE: OTZAR-E2E-1 — lock the AVP² governed-access connector: intent creation +
//          validation (safe governance, no secrets), result validation (refuse production
//          proof / payment / public listing / production data / raw markers), the Otzar
//          display mapper (Federation Cloud links, delivered-false acceptable on proof,
//          live only for LIVE_LOCAL_RUN), the connector stub, fixtures, and docs/doctrine.
// CONNECTS TO: src/lib/avp2/*, src/lib/connectors/avp2-governed-access.ts.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createAvp2GovernedAccessIntent, validateAvp2EndToEndIntent, validateAvp2EndToEndResult,
  type E2EResult,
} from "@/lib/avp2/e2e-contracts";
import { mapAvp2ResultToOtzarArtifact } from "@/lib/avp2/e2e-display";
import {
  buildAvp2GovernedAccessDryRun, buildAvp2GovernedAccessRequest, parseAvp2RunnerResult,
  mapAvp2RunnerResultToWorkArtifact, DEMO_LOCAL_LIVE_RESULT, DEMO_DRY_RUN_RESULT,
} from "@/lib/connectors/avp2-governed-access";

const readFixture = (name: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), "src/fixtures", name), "utf8"));
const cloneResult = (): E2EResult => JSON.parse(JSON.stringify(DEMO_LOCAL_LIVE_RESULT)) as E2EResult;

describe("AVP² governed access connector", () => {
  // ── Intent ──
  it("0. client-agnostic: a non-Otzar origin validates with no UNEXPECTED_ORIGIN warning", () => {
    const intent = { ...createAvp2GovernedAccessIntent(), origin: "agent" as const };
    const v = validateAvp2EndToEndIntent(intent);
    expect(v.ok).toBe(true);
    expect(v.warnings.some((w) => w.code === "UNEXPECTED_ORIGIN")).toBe(false);
    expect(validateAvp2EndToEndIntent({ ...createAvp2GovernedAccessIntent(), origin: "mystery" }).warnings.some((w) => w.code === "UNEXPECTED_ORIGIN")).toBe(true);
  });
  it("1. default intent validates", () => expect(validateAvp2EndToEndIntent(createAvp2GovernedAccessIntent()).ok).toBe(true));
  it("2. invalid schema fails", () => expect(validateAvp2EndToEndIntent({ intent_schema: "X" }).ok).toBe(false));
  it("3. real_payment true fails", () => { const i = createAvp2GovernedAccessIntent(); i.governance.real_payment = true; expect(validateAvp2EndToEndIntent(i).errors.some((e) => e.code === "REAL_PAYMENT_TRUE")).toBe(true); });
  it("4. public_listing true fails", () => { const i = createAvp2GovernedAccessIntent(); i.governance.public_listing = true; expect(validateAvp2EndToEndIntent(i).errors.some((e) => e.code === "PUBLIC_LISTING_TRUE")).toBe(true); });
  it("5. production_data true fails", () => { const i = createAvp2GovernedAccessIntent(); i.governance.production_data = true; expect(validateAvp2EndToEndIntent(i).errors.some((e) => e.code === "PRODUCTION_DATA_TRUE")).toBe(true); });
  it("6. quote_required false fails", () => { const i = createAvp2GovernedAccessIntent(); i.governance.quote_required = false; expect(validateAvp2EndToEndIntent(i).errors.some((e) => e.code === "QUOTE_NOT_REQUIRED")).toBe(true); });
  it("7. proof_required false fails", () => { const i = createAvp2GovernedAccessIntent(); i.governance.proof_required = false; expect(validateAvp2EndToEndIntent(i).errors.some((e) => e.code === "PROOF_NOT_REQUIRED")).toBe(true); });
  it("8. access_token marker fails", () => { const i = createAvp2GovernedAccessIntent({ selector: "access_token=abc" }); expect(validateAvp2EndToEndIntent(i).errors.some((e) => e.code === "UNSAFE_MARKER")).toBe(true); });
  it("9. private_key marker fails", () => { const i = createAvp2GovernedAccessIntent({ selector: "private_key here" }); expect(validateAvp2EndToEndIntent(i).errors.some((e) => e.code === "UNSAFE_MARKER")).toBe(true); });

  // ── Result ──
  it("10. valid PASS result validates", () => expect(validateAvp2EndToEndResult(DEMO_LOCAL_LIVE_RESULT).ok).toBe(true));
  it("11. PRODUCTION_LIVE result fails", () => { const r = cloneResult(); r.proof_level = "PRODUCTION_LIVE"; expect(validateAvp2EndToEndResult(r).errors.some((e) => e.code === "PRODUCTION_PROOF_REFUSED")).toBe(true); });
  it("12. result with real_payment true fails", () => { const r = { ...cloneResult(), echo: { real_payment: true } }; expect(validateAvp2EndToEndResult(r).errors.some((e) => e.code === "REAL_PAYMENT_REFUSED")).toBe(true); });
  it("13. result with public_listing true fails", () => { const r = { ...cloneResult(), echo: { public_listing: true } }; expect(validateAvp2EndToEndResult(r).errors.some((e) => e.code === "PUBLIC_LISTING_REFUSED")).toBe(true); });
  it("14. result with raw content marker fails", () => { const r = cloneResult(); r.otzar_display.message = "leaked content body here"; expect(validateAvp2EndToEndResult(r).errors.some((e) => e.code === "UNSAFE_MARKER")).toBe(true); });
  it("14b. result reporting secrets_not_redacted fails", () => { const r = { ...cloneResult(), security: { secrets_redacted: false } }; expect(validateAvp2EndToEndResult(r).errors.some((e) => e.code === "SECRETS_NOT_REDACTED")).toBe(true); });

  // ── Display mapper ──
  it("15. display mapper produces an Otzar artifact", () => {
    const a = mapAvp2ResultToOtzarArtifact(DEMO_LOCAL_LIVE_RESULT);
    expect(a.kind).toBe("AVP2_GOVERNED_ACCESS");
    expect(a.steps.length).toBe(9);
    expect(a.steps.find((s) => s.key === "proof")?.status).toBe("PASS");
  });
  it("15a. mapper prefers client_display over otzar_display when they differ", () => {
    const r = { ...cloneResult(), client_display: { title: "CLIENT TITLE", message: "cm", next_action: "cn" } };
    const a = mapAvp2ResultToOtzarArtifact(r);
    expect(a.title).toBe("CLIENT TITLE");
    expect(a.summary).toBe("cm");
    expect(a.next_action).toBe("cn");
  });
  it("15b. mapper falls back to legacy otzar_display-only results (no client_display)", () => {
    const r = cloneResult();
    delete (r as { client_display?: unknown }).client_display;
    const a = mapAvp2ResultToOtzarArtifact(r);
    expect(a.title).toBe("Governed access completed");
    expect(a.is_live).toBe(true);
  });
  it("16. artifact includes Federation Cloud links", () => {
    const a = mapAvp2ResultToOtzarArtifact(DEMO_LOCAL_LIVE_RESULT);
    expect(a.federation_cloud_links.evidence_route).toBe("/avp2/evidence");
    expect(a.federation_cloud_links.e2e_route).toBe("/avp2/e2e");
    expect(a.federation_cloud_links.registry_route).toBe("/avp2/registry");
  });
  it("17. delivered false is acceptable when proof resolved", () => {
    const a = mapAvp2ResultToOtzarArtifact(DEMO_LOCAL_LIVE_RESULT);
    expect(a.delivered).toBe(false);
    expect(a.proof_resolved).toBe(true);
    expect(a.delivered_ok).toBe(true);
  });
  it("18. dry-run fixture maps to a non-live status", () => {
    const a = mapAvp2ResultToOtzarArtifact(DEMO_DRY_RUN_RESULT);
    expect(a.is_live).toBe(false);
    expect(a.status).toBe("SKIP");
    expect(a.provenance).toBe("DRY_RUN");
  });
  it("19. live fixture maps to a completed (live) status", () => {
    const a = mapAvp2ResultToOtzarArtifact(DEMO_LOCAL_LIVE_RESULT);
    expect(a.is_live).toBe(true);
    expect(a.status).toBe("PASS");
    expect(a.proof_level).toBe("LOCAL_LIVE");
  });

  // ── Connector stub ──
  it("20. dry-run descriptor carries the safe command and never executes live", () => {
    const d = buildAvp2GovernedAccessDryRun();
    expect(d.mode).toBe("dry-run");
    expect(d.command).toBe("npm run e2e:otzar-avp2 -- --dry-run --json");
    expect(d.executes_live).toBe(false);
    expect(validateAvp2EndToEndIntent(d.intent).ok).toBe(true);
  });
  it("20b. live-local descriptor is explicit-only", () => {
    expect(buildAvp2GovernedAccessRequest({}, { mode: "live-local" }).command).toBe("npm run e2e:otzar-avp2 -- --strict --json");
    expect(buildAvp2GovernedAccessRequest().executes_live).toBe(false);
  });
  it("20c. parse + map a runner result string into a work artifact", () => {
    const out = mapAvp2RunnerResultToWorkArtifact(JSON.stringify(DEMO_LOCAL_LIVE_RESULT));
    expect(out.ok).toBe(true);
    expect(out.artifact?.is_live).toBe(true);
  });
  it("20d. parse refuses an unsafe (production) result", () => {
    const bad = { ...cloneResult(), proof_level: "PRODUCTION_LIVE" };
    expect(parseAvp2RunnerResult(bad).ok).toBe(false);
  });

  // ── Fixtures + docs ──
  it("21. intent fixture exists and validates", () => expect(validateAvp2EndToEndIntent(readFixture("avp2-e2e-intent.demo.json")).ok).toBe(true));
  it("22. local-live + dry-run result fixtures exist and validate", () => {
    expect(validateAvp2EndToEndResult(readFixture("avp2-e2e-result.local-live.example.json")).ok).toBe(true);
    expect(validateAvp2EndToEndResult(readFixture("avp2-e2e-result.dry-run.example.json")).ok).toBe(true);
  });
  it("23. docs exist and include doctrine", () => {
    const doc = readFileSync(resolve(process.cwd(), "docs/avp2-governed-access-connector.md"), "utf8");
    expect(doc).toContain("The agent does not scrape the website.");
    expect(doc).toContain("The agent asks for a quote.");
    expect(doc).toContain("The agent does not execute freely.");
    expect(doc).toContain("Foundation is the trust substrate.");
    expect(doc).toContain("Publisher Gateway is the AVP² edge adapter.");
    expect(doc).toContain("Foundation remains the source of governance truth in live mode.");
    expect(doc).toContain("Otzar is the user/work interface.");
    expect(doc).toContain("Federation Cloud is the governed machine-economy control surface.");
  });
});
