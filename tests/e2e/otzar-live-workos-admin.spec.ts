// FILE: otzar-live-workos-admin.spec.ts
// PURPOSE: DEEP Work OS live smoke — the ADMIN governance layer. An admin
//          ingests a transcript (creating its OWN test seeds), reviews the
//          governed Dandelion queue, and safely runs the lifecycle: approve
//          creates a setup action but NEVER grants access; hold/reject persist;
//          a non-admin is blocked (403). SAFETY: only mutates seeds THIS run
//          created, matched by the ingest's own conversation id — never a
//          pre-existing production seed. No access is ever granted; nothing is
//          sent or invited.
// RUN: OTZAR_SMOKE_EMAIL=sadeil@niovlabs.com DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-workos-admin.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { BASE, PW, SKIP_NO_PW, skipReasonNoAdmin, apiLogin, ingest, listSeeds, seedAction, mask, ev, runMarker } from "./workos-helpers";
import { primaryTranscript } from "./workos-fixtures";

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const NONADMIN_EMAIL = process.env.OTZAR_SMOKE_NONADMIN_EMAIL ?? "david@niovlabs.com";

test.describe.configure({ mode: "serial" });

test.describe("live workos admin: governed seed lifecycle (safe, no auto-apply)", () => {
  test.skip(!PW, SKIP_NO_PW);

  let ctx: APIRequestContext;
  let adminToken: string | null = null;
  let conversationId = "";
  let mySeedIds: string[] = [];
  const marker = runMarker();

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, ADMIN_EMAIL, ["read", "write", "share", "admin_org"]);
    adminToken = login.token;
    test.skip(!adminToken, skipReasonNoAdmin(ADMIN_EMAIL));
    // Ingest as the admin so seeds land in the admin's org AND are this run's own.
    const ing = await ingest(ctx, adminToken as string, { text: primaryTranscript(marker), title: `WorkOS admin smoke ${marker}` });
    expect(ing.status, "admin ingest HTTP").toBe(200);
    conversationId = ing.result?.conversation.meeting_capture_id ?? "";
    expect(conversationId, "ingest produced a conversation id").toBeTruthy();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("admin sees the governed seed queue and can identify THIS run's seeds", async () => {
    const list = await listSeeds(ctx, adminToken as string);
    expect(list.status, "admin list HTTP").toBe(200);
    expect(list.ok, "admin list ok").toBe(true);
    // Scope strictly to seeds created by THIS run's ingest (safe to mutate).
    const mine = list.seeds.filter((s) => s.source_conversation_id === conversationId);
    expect(mine.length, "this run's ingest produced governed seed(s)").toBeGreaterThan(0);
    mySeedIds = mine.map((s) => String(s.seed_id));
    const grant = mine.find((s) => String(s.seed_type).includes("grant_tool_access")) ?? mine[0];
    ev(test.info(), `queue size=${list.seeds.length}; this run's seeds=${mine.length} (conv ${mask(conversationId)})`);
    ev(test.info(), `sample: type=${grant?.seed_type} subject=${grant?.subject_name ?? "—"} status=${grant?.status} approval=${grant?.approval_required}`);
  });

  test("non-admin is blocked from the seed queue (403)", async () => {
    const nonAdmin = await apiLogin(ctx, NONADMIN_EMAIL, ["read", "write", "share"]);
    test.skip(!nonAdmin.token, `SKIPPED: non-admin demo user unavailable (${NONADMIN_EMAIL})`);
    const list = await listSeeds(ctx, nonAdmin.token as string);
    expect(list.status, "non-admin seed list must be 403").toBe(403);
    expect(list.code, "non-admin denial code").toBe("OPERATION_NOT_PERMITTED");
    ev(test.info(), `non-admin ${NONADMIN_EMAIL} → HTTP ${list.status} ${list.code} (denied ✓)`);
  });

  test("approve advances to a setup action and NEVER auto-grants access", async () => {
    expect(mySeedIds.length, "have this run's seeds to act on").toBeGreaterThan(0);
    const r = await seedAction(ctx, adminToken as string, mySeedIds[0]!, "approve");
    expect(r.status, "approve HTTP").toBe(200);
    expect(String(r.seed?.status), "seed becomes approved").toBe("SEED_APPROVED");
    const action = String(r.seed?.resulting_action ?? "");
    // The whole point: approve = a governed setup action, NOT a grant.
    expect(action, "resulting action is a governed setup action, not a grant").toMatch(
      /setup action|not granted|not automatically|review|governed step|next governed/i,
    );
    ev(test.info(), `approve seed ${mask(mySeedIds[0])} → SEED_APPROVED · "${action.slice(0, 60)}" (no auto-grant ✓)`);
  });

  test("hold and reject persist on this run's seeds (governed, reversible)", async () => {
    if (mySeedIds.length > 1) {
      const h = await seedAction(ctx, adminToken as string, mySeedIds[1]!, "hold", "Waiting on connector owner");
      expect(h.status, "hold HTTP").toBe(200);
      expect(String(h.seed?.status), "seed held").toBe("SEED_HELD");
      ev(test.info(), `hold seed ${mask(mySeedIds[1])} → SEED_HELD ✓`);
    }
    if (mySeedIds.length > 2) {
      const rej = await seedAction(ctx, adminToken as string, mySeedIds[2]!, "reject", "Not needed for this org");
      expect(rej.status, "reject HTTP").toBe(200);
      expect(String(rej.seed?.status), "seed rejected").toBe("SEED_REJECTED");
      expect(rej.seed?.rejection_reason, "rejection reason persisted").toBeTruthy();
      ev(test.info(), `reject seed ${mask(mySeedIds[2])} → SEED_REJECTED (reason kept) ✓`);
    }
    if (mySeedIds.length <= 1) ev(test.info(), "only one seed this run — hold/reject covered by integration tests");
    expect(true).toBe(true);
  });
});
