// FILE: otzar-live-workos-ux-coherence.spec.ts
// PURPOSE: PROD-UX-AMBIENT acceptance layer — scenario smokes proving the P0
//          product flows END-TO-END against the DEPLOYED app (app.otzar.ai) +
//          API (api.otzar.ai). Each scenario asserts the HONEST outcome for
//          whatever real data the org carries — no assumption of demo rows,
//          no fake completion, and skips are labeled SKIPPED (never passed):
//            UX-1  P0B  Today attention count is real and routes to the item
//            UX-2  P0A  My Work renders the governed loop (no dead buttons)
//            UX-3  P0R  every my-work item carries the routing decision + why
//            UX-4  P0C  a saved conversation reopens with its source surface
//            UX-5  P0H  the orb drags, persists per device, never blocks CTAs
//            UX-6  P0G  voice state is honest in a mic-less browser
//            UX-7  P0E  Dandelion seeds project subject_key for grouped queues
//            UX-8  P0F  the governed slack-write setup route answers honestly
// ENV-GATED: DEMO_SHARED_PASSWORD (+ OTZAR_SMOKE_EMAIL, admin email for 7/8).
// READ-MOSTLY: nothing here creates work, posts messages, or approves actions.
// RUN: OTZAR_SMOKE_EMAIL=vishesh@niovlabs.com DEMO_SHARED_PASSWORD=… \
//      npm run test:e2e:live:workos:ux-coherence
// CONNECTS TO: workos-helpers.ts, playwright.live.config.ts,
//              docs/otzar/PRODUCTION_WORKOS_COHERENCE_REPAIR.md.

import { test, expect, type Page } from "@playwright/test";
import {
  apiLogin,
  ev,
  getMyWork,
  listSeeds,
  mask,
  PW,
  SKIP_NO_PW,
} from "./workos-helpers";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";

const ROUTING_LANES = new Set([
  "silent_capture", "silent_routing", "notify_owner", "draft_ready",
  "execute_when_allowed", "ask_approval", "escalate", "blocked",
  "setup_required", "identity_review",
]);

async function uiLogin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  // The session is only established once the app leaves /login — navigating
  // before that races the auth redirect and every guard bounces back.
  await page.waitForURL(/\/app/, { timeout: 25_000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
}

// Sessions are DELIBERATELY in-memory (auth store doctrine: no localStorage/
// cookies) — a full page load drops the session by design. In-app movement is
// therefore CLIENT-SIDE routing, exactly like a real user clicking nav.
async function spaGoto(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await page.waitForLoadState("networkidle");
}

test.describe("PROD-UX ux-coherence — live scenario smokes", () => {
  test.skip(!PW, SKIP_NO_PW);

  test("UX-1 P0B — Today attention is real-signal-backed and routes", async ({ page }, testInfo) => {
    // The REAL landing surface is AmbientWorkSurface ("Needs you" panel with
    // real-signal deep links). FocusHome is dead code (not routed) — recorded
    // as a product-truth gap in the smoke matrix.
    await uiLogin(page);
    await expect(page.getByTestId("ambient-work-surface")).toBeVisible();
    const needsPanel = page.getByTestId("needs-me-panel");
    if ((await needsPanel.count()) === 0) {
      // Zero attention = NO panel at all (doctrine: no card spam).
      ev(testInfo, "P0B: zero attention → no 'Needs you' panel (honest calm)");
      return;
    }
    const link = page.getByTestId("needs-approvals").or(page.getByTestId("needs-replies")).first();
    const text = (await link.textContent()) ?? "";
    ev(testInfo, `P0B: attention => "${text.trim().slice(0, 80)}"`);
    await link.click();
    await page.waitForLoadState("networkidle");
    // The click must ROUTE somewhere real (action center / comms) —
    // never remain a dead card on the home surface.
    expect(page.url()).toMatch(/\/app\/(action-center|comms)/);
    ev(testInfo, `P0B: routed to ${new URL(page.url()).pathname}`);
  });

  test("UX-2 P0A — My Work renders the governed loop with live-only actions", async ({ page }, testInfo) => {
    await uiLogin(page);
    await spaGoto(page, "/app/my-work");
    const items = page.getByTestId("work-ledger-item");
    await expect(items.first().or(page.getByTestId("my-work-empty"))).toBeVisible({ timeout: 15_000 });
    const n = await items.count();
    ev(testInfo, `P0A: ${n} work item(s) on My Work`);
    if (n === 0) {
      // Honest empty state, not a blank screen.
      await expect(page.getByTestId("my-work-empty")).toBeVisible();
      return;
    }
    // Every rendered card opens its View/Why without a dead control.
    const first = items.first();
    await first.getByTestId("work-ledger-item-view").click();
    await expect(first.getByTestId("work-ledger-item-detail")).toBeVisible();
    ev(testInfo, "P0A: first item opened View/Why (live control)");
  });

  test("UX-3 P0R — my-work items carry the routing decision + plain why", async ({ request }, testInfo) => {
    const login = await apiLogin(request, EMAIL, ["read"]);
    test.skip(login.token === null, `SKIPPED: login failed (${login.code ?? login.status})`);
    const work = await getMyWork(request, login.token as string);
    expect(work.status).toBe(200);
    if (work.items.length === 0) {
      ev(testInfo, "P0R: caller has no work items — nothing to project (honest)");
      return;
    }
    const first = work.items[0] as Record<string, unknown>;
    const routing = first.routing as Record<string, unknown> | undefined;
    // The FND P0R projection must be deployed for this to hold. An absent
    // field is an explicit SKIP with the deployment named — never a pass.
    test.skip(
      routing === undefined,
      "SKIPPED: Foundation routing projection (PR #518) not deployed to api.otzar.ai yet",
    );
    expect(ROUTING_LANES.has(String(routing!.lane))).toBe(true);
    const reason = String(routing!.reason ?? "");
    expect(reason.length).toBeGreaterThan(10);
    // Reasons are humanized: no underscores, no raw enum tokens.
    expect(reason).not.toMatch(/_|MCP\b|NEEDS_[A-Z]/);
    ev(testInfo, `P0R: lane=${String(routing!.lane)} · "${reason.slice(0, 70)}"`);
  });

  test("UX-4 P0C — a saved conversation reopens its original source", async ({ page }, testInfo) => {
    await uiLogin(page);
    await spaGoto(page, "/app/meeting-captures");
    await expect(page.getByTestId("meeting-captures-page")).toBeVisible({ timeout: 15_000 });
    // Captures with a stored transcript expose "View original source".
    const openers = page.getByTestId("meeting-capture-view-source");
    const n = await openers.count();
    if (n === 0) {
      ev(testInfo, "P0C: no reopenable captures for this caller (honest empty)");
      await expect(page.getByTestId("meeting-captures-page")).toBeVisible();
      return;
    }
    await openers.first().click();
    // The caller-scoped transcript panel opens and reaches a terminal state
    // (ready with text, or an honest denial) — never a wedged spinner.
    const panel = page.getByTestId("meeting-capture-source-panel").first();
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await panel.getAttribute("data-status")) ?? "", { timeout: 15_000 })
      .not.toBe("loading");
    const status = (await panel.getAttribute("data-status")) ?? "";
    ev(testInfo, `P0C: capture reopened → source panel status=${status}`);
    // ready = transcript shown · empty/denied = honest caller-scoped truth ·
    // error is a broken flow and fails.
    expect(["ready", "empty", "denied"]).toContain(status);
  });

  test("UX-5 P0H — the orb drags, snaps to an edge, and persists per device", async ({ page }, testInfo) => {
    await uiLogin(page);
    const orb = page.getByTestId("ambient-otzar-bar");
    await expect(orb).toBeVisible();
    const before = await orb.boundingBox();
    expect(before).not.toBeNull();
    // Drag the collapsed orb toward the LEFT edge, mid-screen.
    const startX = before!.x + before!.width / 2;
    const startY = before!.y + before!.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(120, 320, { steps: 8 });
    await page.mouse.up();
    // Snapped to the left edge (data attribute set by the component).
    const wrapper = page.locator('[data-orb-edge="left"]');
    await expect(wrapper.first()).toBeVisible();
    // A completed drag must NOT count as a click (the dock stays closed).
    await expect(page.getByLabel(/Message to Otzar/i)).toHaveCount(0);
    // Per-DEVICE persistence: the position is stored under the versioned key.
    // Sessions are in-memory by doctrine, so "persists" means it survives a
    // fresh page load + NEW login on the same device.
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("otzar.orb.position.v1"),
    );
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).edge).toBe("left");
    await uiLogin(page); // full reload → session dropped by design → re-login
    const after = await page.getByTestId("ambient-otzar-bar").boundingBox();
    expect(after).not.toBeNull();
    expect(after!.x).toBeLessThan(before!.x);
    ev(testInfo, `P0H: orb dragged right→left, stored+survived re-login (x ${Math.round(before!.x)}→${Math.round(after!.x)})`);
  });

  test("UX-6 P0G — voice state is honest in a mic-less browser", async ({ page }, testInfo) => {
    await uiLogin(page);
    // Expand the orb (tap, not drag).
    await expect(page.getByTestId("ambient-otzar-bar")).toBeVisible();
    await page.getByTestId("ambient-otzar-bar").click();
    const region = page.getByRole("region", { name: /Talk to Otzar/i });
    await expect(region).toBeVisible();
    const body = (await region.textContent()) ?? "";
    // Honest voice-mode line is present and never claims active listening
    // in a browser that has not captured anything.
    expect(body).toMatch(/Voice input:/i);
    expect(body).not.toMatch(/Listening…/);
    // Whatever engine is active, the line names a real mode.
    expect(body).toMatch(
      /browser STT|secure server transcription|desktop mic|text only/i,
    );
    ev(testInfo, "P0G: honest voice-mode line rendered in the dock");
  });

  test("UX-7 P0E — Dandelion seeds project subject_key for grouped queues", async ({ request }, testInfo) => {
    // admin_org must be REQUESTED at login for admin capabilities to attach.
    const login = await apiLogin(request, ADMIN_EMAIL, ["read", "write", "share", "admin_org"]);
    test.skip(login.token === null, `SKIPPED: admin login failed (${login.code ?? login.status})`);
    const seeds = await listSeeds(request, login.token as string);
    test.skip(seeds.status === 403, "SKIPPED: caller lacks org-admin");
    expect(seeds.status).toBe(200);
    if (seeds.seeds.length === 0) {
      ev(testInfo, "P0E: seed queue empty (honest) — grouping has nothing to group");
      return;
    }
    // P0D/P0E projection: person-setup seeds carry a stable subject_key so
    // the UI can group one person into ONE surface.
    const personSeeds = seeds.seeds.filter(
      (s) => String(s.seed_type ?? s.seedType ?? "").toLowerCase().includes("person") ||
             String(s.recommended_action ?? s.recommendedAction ?? "").includes("person"),
    );
    const withKey = seeds.seeds.filter((s) => typeof s.subject_key === "string" && (s.subject_key as string).length > 0);
    ev(testInfo, `P0E: ${seeds.seeds.length} seeds · ${personSeeds.length} person-class · ${withKey.length} carry subject_key`);
    expect(withKey.length).toBeGreaterThan(0);
  });

  test("UX-8 P0F — governed slack-write setup answers honestly (no writes)", async ({ request }, testInfo) => {
    // admin_org must be REQUESTED at login for admin capabilities to attach.
    const login = await apiLogin(request, ADMIN_EMAIL, ["read", "write", "share", "admin_org"]);
    test.skip(login.token === null, `SKIPPED: admin login failed (${login.code ?? login.status})`);
    // READ-ONLY probe: an empty body must be rejected with the honest
    // validation/flag state — this proves the route is live + governed
    // WITHOUT creating a binding.
    const r = await request.post(
      `${process.env.OTZAR_API_BASE_URL ?? "https://api.otzar.ai"}/api/v1/work-os/connector-bindings/slack-write`,
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` },
        data: {},
        failOnStatusCode: false,
      },
    );
    const j = (await r.json().catch(() => ({}))) as { code?: string };
    // Flag-off → 404 FEATURE_DISABLED; flag-on → 422 MISSING_DEFAULT_CHANNEL.
    // Both are honest, governed answers; anything else is a broken route.
    expect([404, 422]).toContain(r.status());
    expect(["FEATURE_DISABLED", "MISSING_DEFAULT_CHANNEL"]).toContain(j.code ?? "");
    ev(testInfo, `P0F: slack-write route => ${r.status()} ${j.code ?? ""} (${mask(login.token)})`);
  });
});
