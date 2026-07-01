// FILE: otzar-live-workos-writeback.spec.ts
// PURPOSE: Slice F live smoke — GOVERNED CONNECTOR WRITE-BACK. A caller-owned
//          WorkLedger commitment is bridged to a governed INVOKE_CONNECTOR
//          Action, requires dual-control approval (no auto-send), is approved
//          by a DISTINCT resolver, executes through the existing Action
//          scheduler/executor, and posts a REAL Slack chat.postMessage — the
//          receipt carries a real channel + ts (mode:"real", NOT the fixture
//          zero-ts). Then the ledger reconciles to EXECUTED with the
//          proposed_action_id linked.
//
//          REQUIRES (skips clearly otherwise, never fakes):
//            - OTZAR_WORK_WRITEBACK_LIVE=on (the deploy has the flag on + the
//              Slack env + an admin-registered SLACK_WRITE binding)
//            - OTZAR_APPROVER_EMAIL: a DISTINCT org admin who resolves the
//              dual-control escalation (source ≠ resolver). Same shared
//              password (PW). Without it the dual-control post cannot complete
//              and the test skips (honest — the governance requires two people).
// RUN: OTZAR_WORK_WRITEBACK_LIVE=on OTZAR_APPROVER_EMAIL=sadeil@niovlabs.com \
//      OTZAR_SMOKE_EMAIL=vishesh@niovlabs.com DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-workos-writeback.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import {
  BASE, PW, SKIP_NO_PW, apiLogin, ev, runMarker,
  createCommitment, executeCommitment, reconcileExecution, approveEscalation,
  getAction, getActionAttempts, getLedgerEntry,
} from "./workos-helpers";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const APPROVER_EMAIL = process.env.OTZAR_APPROVER_EMAIL ?? "";
const WRITEBACK_ON = process.env.OTZAR_WORK_WRITEBACK_LIVE === "on";
const FIXTURE_TS = "0000000000.000000";

test.describe.configure({ mode: "serial" });

test.describe("live workos write-back: governed Slack chat.postMessage", () => {
  test.skip(!PW, SKIP_NO_PW);
  test.skip(!WRITEBACK_ON, "SKIPPED: set OTZAR_WORK_WRITEBACK_LIVE=on once the deploy has write-back enabled");
  test.skip(APPROVER_EMAIL.length === 0, "SKIPPED: set OTZAR_APPROVER_EMAIL to a DISTINCT org admin (dual-control needs a second resolver)");

  let ctx: APIRequestContext;
  let token: string | null = null;
  let approverToken: string | null = null;
  const marker = runMarker();
  const codeword = `wbk${marker.replace(/[^a-z0-9]/gi, "")}`;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, EMAIL, ["read", "write", "share"]);
    token = login.token;
    expect(token, `login failed for ${EMAIL}`).toBeTruthy();
    const appr = await apiLogin(ctx, APPROVER_EMAIL, ["read", "write"]);
    approverToken = appr.token;
    expect(approverToken, `approver login failed for ${APPROVER_EMAIL}`).toBeTruthy();
  });
  test.afterAll(async () => { await ctx?.dispose(); });

  test("commitment → governed Action → dual-control approval → REAL Slack post → ledger EXECUTED", async () => {
    test.setTimeout(180_000);

    // 1. Test-marked commitment with a SLACK execution plan.
    const created = await createCommitment(ctx, token as string, {
      title: `Otzar Slice F live ${codeword}: post status to the team channel`,
      summary: `governed write-back ${codeword}`,
      requiredConnector: "SLACK",
    });
    expect(created.ok, `create commitment (${created.status})`).toBe(true);
    const lid = created.ledger_entry_id as string;
    expect(lid).toBeTruthy();

    // 2. Bridge to a governed Action. It must require approval (no auto-send):
    //    a dual-control escalation is created; nothing is posted yet.
    const ex = await executeCommitment(ctx, token as string, lid);
    expect(ex.status, "execute HTTP").toBe(200);
    if (ex.outcome === "blocked_setup_required") {
      throw new Error(`SLACK_WRITE binding not registered for this org (${ex.reason}) — an admin must register it first`);
    }
    expect(ex.outcome, `execute outcome (${ex.reason ?? ""})`).toBe("action_created");
    expect(ex.action_status, "action gated on approval (no auto-send)").toBe("PROPOSED");
    expect(ex.escalation_id, "dual-control escalation present").toBeTruthy();
    const actionId = ex.action_id as string;

    // 3. No auto-send: the Action is PROPOSED and nothing executed yet.
    const pre = await getAction(ctx, token as string, actionId);
    expect(pre.action_status, "still PROPOSED before approval").toBe("PROPOSED");

    // 4. A DISTINCT resolver approves the dual-control escalation. With the
    //    approval-linkage wire, this flips the paired Action PROPOSED → APPROVED.
    const appr = await approveEscalation(ctx, approverToken as string, ex.escalation_id as string);
    expect(appr.ok, `escalation approval (${appr.code ?? ""})`).toBe(true);

    // 5. Poll the Action to terminal — the scheduler admits APPROVED and the
    //    executor runs the SlackWriteProvider → real chat.postMessage.
    let status = "";
    for (let i = 0; i < 24; i++) {
      const a = await getAction(ctx, token as string, actionId);
      status = a.action_status ?? "";
      if (status === "SUCCEEDED" || status === "FAILED" || status === "TIMED_OUT" || status === "EXPIRED") break;
      await new Promise((r) => setTimeout(r, 5_000));
    }
    expect(status, "Action executed to SUCCEEDED via the governed lifecycle").toBe("SUCCEEDED");

    // 6. The receipt proves a REAL Slack post (mode:"real" + a real ts, NOT the
    //    fixture zero-ts) through the SlackWriteProvider — not a downgrade.
    const at = await getActionAttempts(ctx, token as string, actionId);
    const latest = at.attempts[0] as
      | { outcome?: string; result_metadata?: { connector_type?: string; delivery_metadata?: Record<string, unknown> } }
      | undefined;
    const delivery = latest?.result_metadata?.delivery_metadata ?? {};
    expect(latest?.result_metadata?.connector_type, "connector_type SLACK_WRITE").toBe("SLACK_WRITE");
    expect(delivery["provider"], "SlackWriteProvider ran").toBe("SlackWriteProvider");
    expect(delivery["mode"], "REAL Slack post (not fixture)").toBe("real");
    expect(String(delivery["channel"] ?? ""), "real Slack channel in receipt").toMatch(/^C[A-Z0-9]+$/);
    expect(String(delivery["ts"] ?? ""), "real Slack ts (not fixture zero-ts)").not.toBe(FIXTURE_TS);
    expect(String(delivery["ts"] ?? ""), "real Slack ts shape").toMatch(/^\d+\.\d+$/);
    ev(test.info(), `real Slack post: channel ${String(delivery["channel"])} ts ${String(delivery["ts"])} ✓`);

    // 7. Reconcile → ledger EXECUTED, proposed_action_id linked.
    const rec = await reconcileExecution(ctx, token as string, lid);
    expect(rec.ledger_status, "ledger reconciled to EXECUTED").toBe("EXECUTED");
    const entry = await getLedgerEntry(ctx, token as string, lid);
    expect(entry.entry?.["status"], "ledger EXECUTED").toBe("EXECUTED");
    expect(entry.entry?.["proposed_action_id"], "ledger linked to the governed Action").toBe(actionId);
    ev(test.info(), `ledger ${lid.slice(0, 8)} EXECUTED, linked to action ${actionId.slice(0, 8)} ✓`);
  });
});
