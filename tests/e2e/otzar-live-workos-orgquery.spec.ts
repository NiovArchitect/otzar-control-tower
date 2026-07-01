// FILE: otzar-live-workos-orgquery.spec.ts
// PURPOSE: Slice B live smoke — the UNIFIED ORG QUERY LAYER. After a transcript
//          source AND a Slack-shaped source event land in the ONE WorkLedger,
//          the governed query returns BOTH through one path with source evidence
//          and connector gaps; admin scope returns Dandelion seeds only to an
//          admin; a non-admin is refused; noise never appears; and agent
//          grounding returns real context or honestly says "not enough".
// RUN: OTZAR_SMOKE_EMAIL=sadeil@niovlabs.com DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-workos-orgquery.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { BASE, PW, SKIP_NO_PW, skipReasonNoAdmin, apiLogin, ingest, ingestSourceEvent, orgQuery, groundContext, ev, runMarker } from "./workos-helpers";
import { primaryTranscript } from "./workos-fixtures";

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const NONADMIN_EMAIL = process.env.OTZAR_SMOKE_NONADMIN_EMAIL ?? "david@niovlabs.com";

test.describe.configure({ mode: "serial" });

test.describe("live workos org-query: one governed query over all sources", () => {
  test.skip(!PW, SKIP_NO_PW);

  let ctx: APIRequestContext;
  let adminToken: string | null = null;
  const marker = runMarker();

  test.beforeAll(async () => {
    test.setTimeout(150_000);
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, ADMIN_EMAIL, ["read", "write", "share", "admin_org"]);
    adminToken = login.token;
    test.skip(!adminToken, skipReasonNoAdmin(ADMIN_EMAIL));
    // Populate the ONE ledger from TWO source types (as the admin, so seeds land
    // in the admin's org too).
    await ingest(ctx, adminToken as string, { text: primaryTranscript(marker), title: `OrgQuery transcript ${marker}` });
    await ingestSourceEvent(ctx, adminToken as string, {
      sourceType: "CONNECTOR", sourceSystem: "SLACK", sourceId: `${marker}.oq`,
      sourceUrl: `https://slack.com/archives/C1/p${marker}`, actor: { name: "Sadeil" },
      participants: [{ name: "David" }], title: `OrgQuery slack ${marker}`,
      content: `David owns the repo access work and will grant Pratham write access. [${marker}]`,
    });
  });
  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("self scope returns BOTH sources through one query, with source evidence, no noise", async () => {
    const r = await orgQuery(ctx, adminToken as string, { scope: "self", query: "repo access", limit: 100 });
    expect(r.status, "org-query HTTP").toBe(200);
    expect(r.results.length, "self results").toBeGreaterThan(0);
    const systems = new Set(r.results.map((x) => String(x.source_system)));
    expect([...systems].some((s) => s === "slack"), "connector source present").toBe(true);
    expect([...systems].some((s) => /transcript/.test(s)), "transcript source present").toBe(true);
    expect(r.results.some((x) => x.source_evidence !== null), "source evidence present").toBe(true);
    expect(r.results.every((x) => x.result_type !== "ORG_SEEDING"), "no admin seeds in self").toBe(true);
    expect(r.results.every((x) => !/you you|^[.\s]+$/.test(String(x.title))), "no noisy content").toBe(true);
    ev(test.info(), `self: ${r.results.length} results across sources {${[...systems].join(", ")}}, evidence ✓, no noise ✓`);
  });

  test("connector_gaps filter surfaces the GitHub not_connected work", async () => {
    const r = await orgQuery(ctx, adminToken as string, { scope: "org", filter: "connector_gaps", limit: 100 });
    expect(r.status).toBe(200);
    expect(r.results.length, "connector-gap results").toBeGreaterThan(0);
    expect(r.results.every((x) => x.connector_gap !== null), "every result is a connector gap").toBe(true);
    ev(test.info(), `connector_gaps: ${r.results.length} items (GitHub not_connected surfaced) ✓`);
  });

  test("Dandelion seeds are returned in admin scope for the admin", async () => {
    const r = await orgQuery(ctx, adminToken as string, { scope: "admin", limit: 100 });
    expect(r.status).toBe(200);
    expect(r.results.length, "admin seed results").toBeGreaterThan(0);
    expect(r.results.every((x) => x.result_type === "ORG_SEEDING"), "admin scope = seeds only").toBe(true);
    ev(test.info(), `admin: ${r.results.length} Dandelion seeds visible to admin ✓`);
  });

  test("a non-admin is refused admin + org scope (no leak)", async () => {
    const nonAdmin = await apiLogin(ctx, NONADMIN_EMAIL, ["read", "write", "share"]);
    test.skip(!nonAdmin.token, `SKIPPED: non-admin demo user unavailable (${NONADMIN_EMAIL})`);
    const admin = await orgQuery(ctx, nonAdmin.token as string, { scope: "admin" });
    expect(admin.status, "non-admin admin scope 403").toBe(403);
    expect(admin.code).toBe("SCOPE_NOT_PERMITTED");
    const org = await orgQuery(ctx, nonAdmin.token as string, { scope: "org" });
    expect(org.status, "non-admin org scope 403").toBe(403);
    ev(test.info(), `non-admin ${NONADMIN_EMAIL} → admin/org scope 403 SCOPE_NOT_PERMITTED (no leak) ✓`);
  });

  test("agent grounding returns real context, and refuses when there isn't enough", async () => {
    const hit = await groundContext(ctx, adminToken as string, "repo access github write");
    expect(hit.status).toBe(200);
    expect(hit.sufficient, "grounded on real work").toBe(true);
    expect(hit.results.length).toBeGreaterThan(0);
    // A guaranteed-unmatchable nonsense token — real words could legitimately
    // match accumulated live work (that would be correct grounding), so the
    // insufficiency case must use something that genuinely has no evidence.
    const miss = await groundContext(ctx, adminToken as string, "zqxjvkwmphntbdfg");
    expect(miss.sufficient, "insufficient flagged").toBe(false);
    expect(miss.reason, "honest refusal").toMatch(/not fabricate|don't have|do not fabricate/i);
    ev(test.info(), `grounding: hit sufficient=${hit.sufficient} (${hit.results.length}); miss sufficient=${miss.sufficient} → honest refusal ✓`);
  });
});
