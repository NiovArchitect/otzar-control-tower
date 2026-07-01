// FILE: otzar-live-workos-goal.spec.ts
// PURPOSE: Slice D live smoke — the GOAL LAYER on the deployed app. Create an
//          objective, ingest work, LINK the work to the goal, and read back a
//          DETERMINISTIC progress rollup — the "40% to target" the audit found
//          missing. Also: goals list self-scoped; a non-manager can't create an
//          org goal (403). Goals are their own surface, computed from the one
//          WorkLedger — no new data model.
// RUN: OTZAR_SMOKE_EMAIL=vishesh@niovlabs.com DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-workos-goal.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { BASE, PW, SKIP_NO_PW, apiLogin, ingest, createGoal, linkWorkToGoal, goalProgress, listGoals, ev, runMarker } from "./workos-helpers";
import { primaryTranscript } from "./workos-fixtures";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";

test.describe.configure({ mode: "serial" });

test.describe("live workos goal: objectives + work↔goal + progress", () => {
  test.skip(!PW, SKIP_NO_PW);

  let ctx: APIRequestContext;
  let token: string | null = null;
  let goalId = "";
  let workId = "";
  const marker = runMarker();

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, EMAIL, ["read", "write", "share"]);
    token = login.token;
    expect(token, `login failed for ${EMAIL}`).toBeTruthy();
    // A fresh transcript gives us a linkable work item id.
    const ing = await ingest(ctx, token as string, { text: primaryTranscript(marker), title: `Goal smoke ${marker}` });
    workId = ing.result?.work_items.find((w) => w.ledger_entry_id)?.ledger_entry_id ?? "";
  });
  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("creates a goal, links real work, and reads back a deterministic progress rollup", async () => {
    const g = await createGoal(ctx, token as string, { title: `Ship the launch demo [${marker}]`, target: "Q3", description: "Launch readiness" });
    expect(g.status, "create goal HTTP").toBe(200);
    expect(g.ok).toBe(true);
    goalId = String(g.goal?.goal_id ?? "");
    expect(goalId.length, "goal id").toBeGreaterThan(0);
    expect(g.goal?.scope).toBe("personal");
    expect(g.goal?.status).toBe("GOAL_ACTIVE");

    expect(workId.length, "have a work item to link").toBeGreaterThan(0);
    const link = await linkWorkToGoal(ctx, token as string, goalId, workId);
    expect(link.status, "link HTTP").toBe(200);
    expect(link.ok).toBe(true);

    const p = await goalProgress(ctx, token as string, goalId);
    expect(p.status, "progress HTTP").toBe(200);
    expect(p.ok).toBe(true);
    expect(p.linked_count, "linked work counted").toBeGreaterThanOrEqual(1);
    expect(p.progress_pct, "progress is a 0-100 rollup").toBeGreaterThanOrEqual(0);
    expect(p.progress_pct).toBeLessThanOrEqual(100);
    ev(test.info(), `goal ${goalId.slice(0, 8)}… linked=${p.linked_count} done=${p.done_count} → ${p.progress_pct}% (deterministic rollup) ✓`);
  });

  test("the goal appears in the caller's self-scoped goal list", async () => {
    const l = await listGoals(ctx, token as string, "self");
    expect(l.status).toBe(200);
    expect(l.goals.some((x) => x.goal_id === goalId), "created goal is listed").toBe(true);
    ev(test.info(), `self goals list contains the created objective ✓`);
  });

  test("a non-manager cannot create an ORG goal (403)", async () => {
    const g = await createGoal(ctx, token as string, { title: `Org objective [${marker}]`, scope: "org" });
    expect(g.status, "org goal by non-manager → 403").toBe(403);
    expect(g.code).toBe("NOT_PERMITTED");
    ev(test.info(), `non-manager org goal → 403 NOT_PERMITTED (authority enforced) ✓`);
  });
});
