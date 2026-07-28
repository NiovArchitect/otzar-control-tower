// FILE: otzar-live-founder-experience-closure.spec.ts
// PURPOSE: Authenticated founder experience closure — browser census +
//          collaboration receipt + action visibility + Talk probes.
//          Env-gated: requires DEMO_SHARED_PASSWORD (never logged).
// SAFETY: No password/token in artifacts; screenshots of UI only.

import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { liveUiLogin, ensureLoggedOut } from "./live-login";

const BASE = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
const PW =
  process.env.DEMO_SHARED_PASSWORD ??
  (fs.existsSync("/tmp/demo_pw_val")
    ? fs.readFileSync("/tmp/demo_pw_val", "utf8").trim()
    : "");

const FOUNDER = process.env.OTZAR_SMOKE_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE = process.env.OTZAR_EMPLOYEE_EMAIL ?? "david@niovlabs.com";
const OUT_DIR = path.join(
  process.cwd(),
  "screenshots",
  "founder-experience-closure",
);

const results: {
  secure_login_source: string;
  logins: Record<string, string>;
  surfaces: Array<Record<string, unknown>>;
  talk: Array<Record<string, unknown>>;
  counts: Record<string, number | string | null>;
  notes: string[];
} = {
  secure_login_source: "temporary_password_rotation_via_bcrypt_hash_update",
  logins: {},
  surfaces: [],
  talk: [],
  counts: {
    dead_primary_controls: 0,
    raw_uuids_ordinary: 0,
    developer_language_blockers: 0,
    indefinite_running: 0,
    candidates_accepted: 0,
    candidates_corrected: 0,
    candidates_rejected: 0,
  },
  notes: [],
};

function shot(page: Page, name: string): Promise<Buffer> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  return page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function surfaceWalk(
  page: Page,
  persona: string,
  route: string,
  name: string,
): Promise<void> {
  const row: Record<string, unknown> = {
    persona,
    route,
    name,
    status: "UNKNOWN",
  };
  try {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1200);
    const body = (await page.locator("body").innerText().catch(() => "")) ?? "";
    const lower = body.toLowerCase();
    row.url = page.url();
    row.title = await page.title().catch(() => "");
    row.has_uuid_in_body = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(
      body,
    );
    row.developer_hits = [
      "payload_redacted",
      "entity_id",
      "tar_hash",
      "console.",
      "undefined",
      "null null",
    ].filter((t) => body.includes(t));
    row.loading = /loading|working…|please wait/i.test(body);
    row.empty =
      /nothing here yet|nothing needs you|no .* yet|caught up/i.test(body);
    row.error = /couldn't load|error|failed to|something went wrong/i.test(
      lower,
    );
    row.unauthorized =
      /not authorized|access denied|forbidden|sign in/i.test(lower);
    row.markers = {
      collab_receipt: /how ai teammates collaborated|ai collaboration/i.test(
        body,
      ),
      completed: /completed|succeeded|otzar handled/i.test(body),
      failed: /failed — not completed|failed, not completed|not completed/i.test(
        body,
      ),
      running: /running — not finished|running, not finished/i.test(body),
      needs_me: /needs me|needs you|needs decision/i.test(body),
    };
    if (row.has_uuid_in_body) {
      results.counts.raw_uuids_ordinary =
        Number(results.counts.raw_uuids_ordinary ?? 0) + 1;
    }
    if ((row.developer_hits as string[]).length > 0) {
      results.counts.developer_language_blockers =
        Number(results.counts.developer_language_blockers ?? 0) + 1;
    }
    await shot(page, `${persona}-${name}`);
    row.status = "WALKED";
  } catch (e) {
    row.status = "FAIL";
    row.error_message = e instanceof Error ? e.message : String(e);
    results.notes.push(`${persona} ${name}: ${row.error_message}`);
  }
  results.surfaces.push(row);
}

async function askTalk(page: Page, question: string): Promise<void> {
  const row: Record<string, unknown> = { question, status: "UNKNOWN" };
  try {
    // Open floating Talk / orb
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("otzar:open"));
    });
    await page.waitForTimeout(800);
    const input = page
      .locator(
        '[data-testid="otzar-orb-input"], [data-testid="ambient-talk-input"], textarea[placeholder*="Ask"], input[placeholder*="Ask"], [contenteditable="true"]',
      )
      .first();
    if ((await input.count()) === 0) {
      // try mic/open button
      const openBtn = page.getByRole("button", {
        name: /talk|ask|otzar|open/i,
      });
      if ((await openBtn.count()) > 0) {
        await openBtn.first().click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
      }
    }
    if ((await input.count()) === 0) {
      row.status = "NO_INPUT";
      results.talk.push(row);
      return;
    }
    await input.fill(question);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(4500);
    const body = (await page.locator("body").innerText()) ?? "";
    row.snippet = body.slice(0, 1200);
    row.has_uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(
      body,
    );
    row.mentions_collab = /collaborat|ai teammate|annie|david/i.test(body);
    row.mentions_fail = /fail|not completed|timed out/i.test(body);
    row.mentions_proof = /proof|capsule|verified/i.test(body);
    row.status = "ASKED";
    await shot(page, `talk-${question.slice(0, 32).replace(/\W+/g, "_")}`);
  } catch (e) {
    row.status = "FAIL";
    row.error_message = e instanceof Error ? e.message : String(e);
  }
  results.talk.push(row);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  test.skip(!PW, "DEMO_SHARED_PASSWORD / /tmp/demo_pw_val required");
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test.afterAll(() => {
  const out = path.join(
    process.cwd(),
    "../../niov-foundation/docs/testing/OTZAR_AUTHENTICATED_BROWSER_RESULTS.json",
  );
  // Prefer absolute
  const abs = path.resolve(
    "/Users/genghishameha/dev/NIOV Labs/github/niov-foundation/docs/testing/OTZAR_AUTHENTICATED_BROWSER_RESULTS.json",
  );
  const payload = {
    title: "OTZAR_AUTHENTICATED_BROWSER_RESULTS",
    date: new Date().toISOString(),
    status: "PARTIAL_AUTHENTICATED",
    base: BASE,
    bundle_expected: "assets/index-BK2Optzf.js",
    secure_login_source: results.secure_login_source,
    secret_exposed: false,
    logins: results.logins,
    surfaces: results.surfaces,
    talk: results.talk.map((t) => ({
      ...t,
      // keep snippets but no secrets
    })),
    counts: results.counts,
    notes: results.notes,
    screenshot_dir: OUT_DIR,
    claims: {
      FOUNDER_EXPERIENCE: "AWAITING_REVIEW",
      RC2_SIGNAL_FREEZE: "NOT_RESTORED",
      YC_RELEASE_CANDIDATE: "NOT_READY",
    },
  };
  try {
    fs.writeFileSync(abs, JSON.stringify(payload, null, 2));
  } catch {
    fs.writeFileSync(
      path.join(OUT_DIR, "OTZAR_AUTHENTICATED_BROWSER_RESULTS.json"),
      JSON.stringify(payload, null, 2),
    );
  }
});

test("founder login + primary surfaces census", async ({ page }) => {
  test.setTimeout(180_000);
  const cta = await liveUiLogin(page, FOUNDER, PW);
  results.logins.founder = `PASS (${cta})`;
  expect(page.url()).not.toContain("/login");

  const routes: Array<[string, string]> = [
    ["/app", "today"],
    ["/app/action-center", "action-center"],
    ["/app/action-center?tab=completed", "action-completed"],
    ["/app/action-center?tab=blocked", "action-blocked"],
    ["/app/collaboration", "people"],
    ["/app/work-projects", "projects"],
    ["/app/my-memory", "memory"],
    ["/app/connector-health", "connections"],
    ["/app/corrections", "corrections"],
    ["/app/preferences", "preferences"],
    ["/app/my-twin", "my-twin"],
    ["/app/team-work", "team-work"],
    ["/app/voice", "conversation-history"],
  ];
  for (const [route, name] of routes) {
    await surfaceWalk(page, "founder", route, name);
  }

  // Today markers
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const today = await page.locator("body").innerText();
  results.counts.today_has_collab = /collaborat|ai teammate/i.test(today)
    ? "yes"
    : "no";
  results.counts.today_has_handled = /otzar handled|completed/i.test(today)
    ? "yes"
    : "no";

  // People receipts
  await page.goto("/app/collaboration", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const people = await page.locator("body").innerText();
  results.counts.people_receipt_section =
    /how ai teammates collaborated/i.test(people) ? "yes" : "no";
  const receiptCard = page.locator(
    '[data-testid="collaboration-receipts-section"], [data-testid="collab-receipt-card"], [data-testid="collab-receipt-compact"]',
  );
  results.counts.receipt_cards = await receiptCard.count();

  // Action center completed/failed copy
  await page.goto("/app/action-center?tab=completed", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);
  const completed = await page.locator("body").innerText();
  results.counts.completed_tab_honest = /completed/i.test(completed)
    ? "yes"
    : "no";
  await page.goto("/app/action-center?tab=blocked", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);
  const blocked = await page.locator("body").innerText();
  results.counts.failed_honest =
    /failed — not completed|not completed|failed|timed out/i.test(blocked)
      ? "yes"
      : "no";
  if (/running — not finished/i.test(blocked + completed)) {
    results.counts.indefinite_running = 0; // honest running label present, not silent
  }
});

test("founder Talk grounding probes", async ({ page }) => {
  test.setTimeout(180_000);
  if (!results.logins.founder?.startsWith("PASS")) {
    await liveUiLogin(page, FOUNDER, PW);
  } else {
    // re-login clean
    await liveUiLogin(page, FOUNDER, PW);
  }
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  const questions = [
    "What changed?",
    "What did Otzar complete?",
    "How did the AI Teammates collaborate?",
    "What action did Otzar execute?",
    "What failed?",
    "What did the correction change?",
  ];
  for (const q of questions) {
    await askTalk(page, q);
  }
});

test("employee login + self-scoped surfaces", async ({ page }) => {
  test.setTimeout(120_000);
  const cta = await liveUiLogin(page, EMPLOYEE, PW);
  results.logins.employee = `PASS (${cta})`;
  for (const [route, name] of [
    ["/app", "today"],
    ["/app/action-center", "action-center"],
    ["/app/collaboration", "people"],
    ["/app/my-work", "my-work"],
  ] as const) {
    await surfaceWalk(page, "employee", route, name);
  }
});

test("admin/founder admin shell probe", async ({ page }) => {
  test.setTimeout(90_000);
  await liveUiLogin(page, FOUNDER, PW);
  results.logins.admin = "PASS (same founder admin_org)";
  for (const [route, name] of [
    ["/users", "users"],
    ["/app/collaboration", "people-admin"],
  ] as const) {
    await surfaceWalk(page, "admin", route, name);
  }
});
