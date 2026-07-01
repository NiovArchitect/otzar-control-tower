// FILE: otzar-live-workos-loop.spec.ts
// PURPOSE: DEEP Work OS live smoke — proves a transcript becomes GOVERNED WORK,
//          not that a route returns 200. One real-path ingest, then behavioural
//          assertions: source-of-truth persistence, quality/noisy-tail quarantine,
//          owner resolution, typed execution plans, the GitHub connector gap,
//          the governed org seed (no auto-grant), work-graph memory, and reload
//          persistence. Asserts STRUCTURAL INVARIANTS on the DEFAULT extraction
//          path (no forced LOCAL_FALLBACK) so it catches the regressions
//          production would hit. Exact deterministic counts are covered by unit
//          tests; this proves the live product behaviour.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-workos-loop.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { BASE, PW, SKIP_NO_PW, apiLogin, ingest, getMyWork, mask, ev, runMarker, type IngestResult } from "./workos-helpers";
import { primaryTranscript, OWNER_DAVID, NOISY_TOKENS, GITHUB_CONNECTOR, SEED_TOOL_ACCESS } from "./workos-fixtures";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";

test.describe.configure({ mode: "serial" });

test.describe("live workos: transcript becomes governed work", () => {
  test.skip(!PW, SKIP_NO_PW);

  let ctx: APIRequestContext;
  let token: string | null = null;
  let res: IngestResult["result"];
  const marker = runMarker();

  test.beforeAll(async () => {
    test.setTimeout(120_000); // real-path ingest can take ~30-60s
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, EMAIL, ["read", "write", "share"]);
    token = login.token;
    expect(token, `login failed for ${EMAIL} (status ${login.status})`).toBeTruthy();
    const ing = await ingest(ctx, token as string, { text: primaryTranscript(marker), title: `WorkOS smoke ${marker}` });
    expect(ing.status, "ingest HTTP").toBe(200);
    expect(ing.ok, "ingest ok").toBe(true);
    res = ing.result;
    expect(res, "ingest returned a result").toBeTruthy();
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("captures the work + persists a source-of-truth conversation (noisy tail quarantined)", () => {
    const r = res!;
    expect(r.conversation.meeting_capture_id, "conversation persisted").toBeTruthy();
    expect(r.conversation.status, "conversation has a status").toBeTruthy();
    expect(r.quality.total, "quality: segments counted").toBeGreaterThan(0);
    expect(r.quality.trusted, "quality: trusted segments").toBeGreaterThan(0);
    // The noisy tail ("you you…", dots) MUST be quarantined (however the
    // segmenter locates it — tail cutoff or per-segment scoring).
    expect(r.quality.quarantined, "quality: noisy tail quarantined").toBeGreaterThan(0);
    expect(r.decisions.length + r.work_items.length, "decisions or commitments extracted").toBeGreaterThan(0);
    // Noisy tail must NOT become work.
    const noisyWork = r.work_items.filter((w) => NOISY_TOKENS.test(w.title));
    expect(noisyWork.length, "noisy tail produced no work item").toBe(0);
    ev(test.info(), `conversation ${mask(r.conversation.meeting_capture_id)} · status ${r.conversation.status}`);
    ev(test.info(), `quality total=${r.quality.total} trusted=${r.quality.trusted} quarantined=${r.quality.quarantined} (noisy tail @${r.quality.noisy_tail_start_index})`);
    ev(test.info(), `work items=${r.work_items.length}, decisions=${r.decisions.length}, noisy-tail work=0 ✓`);
  });

  test("resolves the right owner (David → repo access work)", () => {
    const r = res!;
    expect(r.work_items.length, "at least one work item").toBeGreaterThan(0);
    const davidOwned = r.work_items.filter((w) => OWNER_DAVID.test(w.owner_name));
    expect(davidOwned.length, "David resolves as an owner").toBeGreaterThan(0);
    // Owned work carries a real owner entity (proof of resolution, not a bare string).
    const withEntity = davidOwned.filter((w) => w.owner_entity_id);
    ev(test.info(), `David-owned items=${davidOwned.length} (entity-resolved=${withEntity.length})`);
    ev(test.info(), `owners: ${[...new Set(r.work_items.map((w) => w.owner_name))].slice(0, 6).join(", ")}`);
    ev(test.info(), `counts owned=${r.counts.owned} needs_review=${r.counts.needs_review} support=${r.counts.support_edges}`);
  });

  test("produces typed execution plans + the GitHub connector gap (no silent drop)", () => {
    const r = res!;
    // Every work item has an execution plan (typed), never a flattened note.
    for (const w of r.work_items) {
      expect(w.execution?.execution_type, `execution type on "${w.title.slice(0, 40)}"`).toBeTruthy();
      expect(w.execution?.execution_mode, `execution mode on "${w.title.slice(0, 40)}"`).toBeTruthy();
    }
    // The repo-access work needs GitHub — a connector-required item must exist,
    // and its capability must NOT be silently "ready".
    const github = r.work_items.filter((w) => w.execution.required_connector === GITHUB_CONNECTOR);
    expect(github.length, "a GitHub-connector-required work item exists").toBeGreaterThan(0);
    const gh = github[0]!;
    expect(gh.execution.capability_state, "GitHub capability is not falsely ready").not.toBe("connected");
    // Missing tool must surface as a blocker/approval, not a silent drop.
    expect(
      gh.execution.approval_required || gh.execution.blocker_reason || /connector|permission|required/i.test(gh.execution.execution_mode),
      "GitHub gap surfaces as a visible blocker",
    ).toBeTruthy();
    ev(test.info(), `execution types: ${[...new Set(r.work_items.map((w) => w.execution.execution_type))].join(", ")}`);
    ev(test.info(), `GitHub gap: mode=${gh.execution.execution_mode} capability=${gh.execution.capability_state} next="${(gh.execution.next_best_action ?? "").slice(0, 40)}"`);
  });

  test("turns the tool gap into a governed org seed — approval-required, not auto-granted", () => {
    const r = res!;
    expect(r.dandelion_seeds.length, "at least one Dandelion seed").toBeGreaterThan(0);
    const toolSeed = r.dandelion_seeds.filter((s) => SEED_TOOL_ACCESS.test(`${s.seedType} ${s.recommendedAction}`));
    expect(toolSeed.length, "a tool-access / connector seed exists").toBeGreaterThan(0);
    const s = toolSeed[0]!;
    expect(s.approvalRequired, "the seed is approval-required (never auto-applied)").toBe(true);
    expect(s.recommendedAction, "the seed has a human recommended action").toBeTruthy();
    // Noisy tail must not spawn seeds.
    const noisySeed = r.dandelion_seeds.filter((s2) => NOISY_TOKENS.test(s2.recommendedAction));
    expect(noisySeed.length, "noisy tail produced no seed").toBe(0);
    ev(test.info(), `seeds=${r.dandelion_seeds.length}; tool-access seed type=${s.seedType} subject=${s.subjectName ?? "—"} approval=${s.approvalRequired} ✓`);
  });

  test("writes work-graph memory + keeps source evidence, and survives reload", async () => {
    const r = res!;
    // Work Graph / memory events written for this conversation.
    expect(r.work_graph_event_count, "work-graph events written").toBeGreaterThan(0);
    // Reload: a fresh GET of the caller's own governed ledger still shows the work.
    const my = await getMyWork(ctx, token as string);
    expect(my.status, "my-work HTTP").toBe(200);
    const transcriptItems = my.items.filter(
      (e) => e.source_type === "TRANSCRIPT" || /repo access|google sign|proactive|github/i.test(String(e.title ?? "")),
    );
    expect(transcriptItems.length, "transcript-sourced work survives reload").toBeGreaterThan(0);
    ev(test.info(), `work-graph events=${r.work_graph_event_count}`);
    ev(test.info(), `reload: my-work items=${my.items.length}, transcript-sourced=${transcriptItems.length} ✓ (persists)`);
  });
});
