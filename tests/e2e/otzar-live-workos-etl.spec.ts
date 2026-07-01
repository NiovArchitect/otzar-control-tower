// FILE: otzar-live-workos-etl.spec.ts
// PURPOSE: Slice A live smoke — a NON-transcript source (a Slack-shaped source
//          event) enters the SAME canonical WorkLedger as transcripts, live. It
//          resolves the owner, carries source_type + source evidence, runs the
//          execution planner (GitHub gap), writes work-graph/seeds, and is
//          idempotent (re-posting the SAME event → 409 ALREADY_INGESTED, no dup
//          work). Proves intake is un-siloed on the deployed app.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-workos-etl.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { BASE, PW, SKIP_NO_PW, apiLogin, ingestSourceEvent, getMyWork, ev, runMarker } from "./workos-helpers";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";

test.describe.configure({ mode: "serial" });

test.describe("live workos ETL: non-transcript source → the one WorkLedger", () => {
  test.skip(!PW, SKIP_NO_PW);

  let ctx: APIRequestContext;
  let token: string | null = null;
  const marker = runMarker();
  const sourceId = `${marker}.slack`;
  const slackSource = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    sourceType: "CONNECTOR",
    sourceSystem: "SLACK",
    sourceId,
    sourceUrl: `https://slack.com/archives/C1/p${marker}`,
    actor: { name: "Sadeil", handle: "@sadeil" },
    participants: [{ name: "David" }],
    title: `ETL smoke ${marker}`,
    content: [
      `David owns the repo access work and will grant Pratham write access. [${marker}]`,
      "you you you",
      "....",
    ].join("\n"),
    ...over,
  });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, EMAIL, ["read", "write", "share"]);
    token = login.token;
    expect(token, `login failed for ${EMAIL}`).toBeTruthy();
  });
  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("a Slack-shaped source event becomes governed work with source evidence (same path)", async () => {
    const r = await ingestSourceEvent(ctx, token as string, slackSource());
    expect(r.status, "source-event ingest HTTP").toBe(200);
    expect(r.ok, "ingest ok").toBe(true);
    const res = r.result!;
    // Owner resolved from the content (David), noisy lines quarantined.
    expect(res.work_items.length, "work items created").toBeGreaterThan(0);
    expect(res.work_items.some((w) => /david/i.test(w.owner_name)), "David resolves as owner").toBe(true);
    const noisy = res.work_items.filter((w) => /you you|^[.\s]+$/.test(w.title));
    expect(noisy.length, "noise minted no work").toBe(0);
    // Execution planner ran; GitHub gap surfaces.
    const gh = res.work_items.find((w) => w.execution.required_connector === "GITHUB");
    expect(gh, "GitHub-connector work item").toBeTruthy();
    // Work-graph + seeds still generate.
    expect(res.work_graph_event_count, "work-graph events").toBeGreaterThan(0);
    ev(test.info(), `slack event → ${res.work_items.length} items, David owner ✓, GitHub gap=${gh?.execution.capability_state}, wg=${res.work_graph_event_count}`);
  });

  test("the non-transcript work entered the SAME governed ledger (my-work)", async () => {
    const my = await getMyWork(ctx, token as string);
    expect(my.status, "my-work HTTP").toBe(200);
    // The Slack-sourced work is in the caller's one work record.
    const slackSourced = my.items.filter(
      (e) => e.source_type === "CONNECTOR" || /repo access|github/i.test(String(e.title ?? "")),
    );
    expect(slackSourced.length, "connector-sourced work in the one ledger").toBeGreaterThan(0);
    ev(test.info(), `my-work has ${slackSourced.length} connector/GitHub-sourced items (one ledger ✓)`);
  });

  test("re-ingesting the SAME source event is idempotent (409, no duplicate work)", async () => {
    const before = (await getMyWork(ctx, token as string)).items.length;
    const dup = await ingestSourceEvent(ctx, token as string, slackSource());
    expect(dup.status, "duplicate ingest HTTP").toBe(409);
    expect(dup.code, "duplicate code").toBe("ALREADY_INGESTED");
    const after = (await getMyWork(ctx, token as string)).items.length;
    expect(after, "no duplicate work created").toBe(before);
    ev(test.info(), `re-ingest same event → 409 ALREADY_INGESTED; my-work unchanged (${before}→${after}) ✓`);
  });

  test("transcripts are refused here (they stay on /comms/ingest — honest path separation)", async () => {
    const r = await ingestSourceEvent(ctx, token as string, slackSource({ sourceSystem: "TRANSCRIPT", sourceId: `${marker}.t` }));
    expect(r.status, "transcript refused on source-event endpoint").toBe(400);
    ev(test.info(), "TRANSCRIPT rejected on /ingest/source-event (400) — paths kept honest ✓");
  });
});
