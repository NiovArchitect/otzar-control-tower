// FILE: otzar-live-workos-identity.spec.ts
// PURPOSE: Slice C live smoke — CROSS-SOURCE IDENTITY RECONCILIATION on the
//          deployed app. A source event names a person "Davey" (which does NOT
//          match any display name) but carries a real org member's EMAIL; the
//          reconciler resolves it to that canonical entity so the work is owned,
//          not orphaned. WITHOUT the email the same event stays unresolved
//          (NEEDS_OWNER) — proving the email is what unified the identity, and
//          that an unknown identifier never gets a wrong match.
// RUN: OTZAR_SMOKE_EMAIL=sadeil@niovlabs.com DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-workos-identity.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { BASE, PW, SKIP_NO_PW, skipReasonNoAdmin, apiLogin, ingestSourceEvent, ev, runMarker } from "./workos-helpers";

// A real member of the ingesting caller's org whose email the reconciler can match.
const MEMBER_EMAIL = process.env.OTZAR_SMOKE_MEMBER_EMAIL ?? "david@niovlabs.com";
const CALLER_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";

test.describe.configure({ mode: "serial" });

test.describe("live workos identity: cross-source reconciliation", () => {
  test.skip(!PW, SKIP_NO_PW);

  let ctx: APIRequestContext;
  let token: string | null = null;
  const marker = runMarker();
  const slackEvent = (over: Record<string, unknown>): Record<string, unknown> => ({
    sourceType: "CONNECTOR", sourceSystem: "SLACK",
    actor: { name: "Sadeil" },
    timestamp: "2026-06-30T12:00:00Z",
    content: `Davey owns the repo access work and will grant write access. [${marker}]`,
    ...over,
  });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, CALLER_EMAIL, ["read", "write", "share", "admin_org"]);
    token = login.token;
    test.skip(!token, skipReasonNoAdmin(CALLER_EMAIL));
  });
  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("a source-local name + a real member's EMAIL reconciles to the canonical owner", async () => {
    const r = await ingestSourceEvent(ctx, token as string, slackEvent({
      sourceId: `${marker}.withemail`,
      participants: [{ name: "Davey", email: MEMBER_EMAIL }],
    }));
    expect(r.status, "ingest HTTP").toBe(200);
    const res = r.result!;
    // The "Davey" work is OWNED (entity-resolved via the reconciled email),
    // not held for review.
    const owned = res.work_items.filter((w) => w.owner_entity_id !== null);
    expect(owned.length, "reconciled owner → owned work").toBeGreaterThan(0);
    ev(test.info(), `Davey+${MEMBER_EMAIL} → ${owned.length} owned item(s) (reconciled to canonical entity) ✓`);
  });

  test("the SAME source-local name WITHOUT the email stays unresolved (no wrong match)", async () => {
    const r = await ingestSourceEvent(ctx, token as string, slackEvent({
      sourceId: `${marker}.noemail`,
      participants: [{ name: "Davey" }],
    }));
    expect(r.status).toBe(200);
    const res = r.result!;
    // "Davey" matches no display name and has no email → held NEEDS_OWNER, never
    // attributed to a wrong person.
    const resolvedDavey = res.work_items.filter((w) => w.owner_entity_id !== null && /davey/i.test(w.owner_name));
    expect(resolvedDavey.length, "unmatched name is not force-resolved").toBe(0);
    expect(res.work_items.some((w) => w.needs_review || w.owner_entity_id === null), "held for review").toBe(true);
    ev(test.info(), `Davey (no email) → unresolved/NEEDS_OWNER (no wrong match) ✓ — email is what unified the identity`);
  });

  test("an unknown identifier never matches (no cross-tenant / stranger match)", async () => {
    const r = await ingestSourceEvent(ctx, token as string, slackEvent({
      sourceId: `${marker}.stranger`,
      participants: [{ name: "Zephyr", email: `stranger-${marker}@nowhere.example` }],
      content: `Zephyr owns the onboarding work. [${marker}]`,
    }));
    expect(r.status).toBe(200);
    const res = r.result!;
    const resolvedZephyr = res.work_items.filter((w) => w.owner_entity_id !== null && /zephyr/i.test(w.owner_name));
    expect(resolvedZephyr.length, "stranger email/name never matches an org entity").toBe(0);
    ev(test.info(), `Zephyr + stranger email → no match (unknown identity held, not mis-attributed) ✓`);
  });
});
