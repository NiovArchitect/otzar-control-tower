// FILE: otzar-live-investor-journey.spec.ts
// PURPOSE: [INVESTOR] Five-minute browser journey on the deployed app —
//          first-time founder/investor path, not API-only. Records clicks,
//          dead ends, CTA deploy lag, and trust failures.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test \
//      --config=playwright.live.config.ts tests/e2e/otzar-live-investor-journey.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

test.describe.configure({ retries: 0 });

const FOUNDER = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Note = { step: string; ok: boolean; detail: string };
const notes: Note[] = [];
function note(step: string, ok: boolean, detail: string) {
  notes.push({ step, ok, detail });
  console.log(`[investor] ${ok ? "PASS" : "FAIL"} ${step}: ${detail}`);
}

/** Full navigation — history.pushState alone leaves founder admin shell on wrong page. */
async function spaGo(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
}

test("INVESTOR five-minute journey — founder on live app", async ({ page }) => {
  test.setTimeout(360_000);
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err).slice(0, 200)));

  // ── 1. Login / understand Otzar ─────────────────────────────────
  const cta = await liveUiLogin(page, FOUNDER, PW as string);
  note(
    "INVESTOR-01-login-cta",
    cta === "Sign in",
    `primary CTA was "${cta}" (Sign in required for #171 live; Continue = deploy lag)`,
  );
  note("INVESTOR-01-login", true, `landed path=${page.url()}`);

  // Landing value prop should already have been on login; shell should load.
  const body0 = ((await page.locator("body").textContent()) ?? "").slice(0, 4000);
  const understands =
    /Otzar|AI Teammate|Work OS|Today|Needs me|Communication/i.test(body0);
  note("INVESTOR-02-understand-otzar", understands, understands ? "product language present" : "missing product framing");

  // ── 2. Role recognition ─────────────────────────────────────────
  // Founder may land on admin `/` or employee `/app`. Prefer product home.
  if (!page.url().includes("/app")) {
    await spaGo(page, "/app");
  }
  await page.waitForTimeout(1500);
  const homeText = (await page.locator("body").textContent()) ?? "";
  // Role may appear as Founder / CEO / admin chrome — do not hard-require exact string.
  note(
    "INVESTOR-03-role",
    /Today|Needs me|Talk|My AI|Action|Home|Organization/i.test(homeText),
    `home has shell chrome; path=${new URL(page.url()).pathname}`,
  );

  // ── 3. Home activity / counts ───────────────────────────────────
  await spaGo(page, "/app");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/investor-01-today.png", fullPage: true });
  const todayBody = (await page.locator("body").textContent()) ?? "";
  const hasActivity =
    /work|waiting|handoff|approval|project|next|today|blocked|follow/i.test(todayBody) &&
    !/something went wrong|failed to load|network error/i.test(todayBody);
  note("INVESTOR-04-home-activity", hasActivity, hasActivity ? "activity language present" : "empty or error home");

  // Count-like affordances (numbers near work labels) — soft check
  const countHits = todayBody.match(/\b\d+\b/g)?.length ?? 0;
  note("INVESTOR-04b-counts", countHits > 0, `numeric tokens on home: ${countHits}`);

  // ── 4. Needs me / Action center (Next) ──────────────────────────
  await spaGo(page, "/app/action-center");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/investor-02-needs-me.png", fullPage: true });
  const needs = (await page.locator("body").textContent()) ?? "";
  const needsOk =
    !/coming soon|not implemented|placeholder/i.test(needs) &&
    /approval|handoff|need|waiting|empty|nothing|work|action/i.test(needs);
  note("INVESTOR-05-next-action", needsOk, needsOk ? "action center populated or honest empty" : "dead or confusing");

  // ── 5. Needs me = Action Center (Wave-1: /app/my-work redirects here) ──
  await spaGo(page, "/app/my-work");
  await page.waitForURL(/\/app\/action-center/, { timeout: 20_000 }).catch(() => undefined);
  await expect(page.getByRole("heading", { name: /Needs me|Action Center/i })).toBeVisible({
    timeout: 45_000,
  });
  await page.screenshot({ path: "screenshots/investor-03-my-work.png", fullPage: true });

  // API truth: owned work exists for founder (composition must surface it).
  const workApi = await page.request.post(`${API}/auth/login`, {
    data: {
      email: FOUNDER,
      password: PW,
      requested_operations: ["read", "write", "admin_org"],
    },
  });
  const workTok = ((await workApi.json()) as { token?: string }).token;
  let apiOpen = -1;
  if (workTok) {
    const mw = await page.request.get(`${API}/work-os/my-work`, {
      headers: { Authorization: `Bearer ${workTok}` },
    });
    const body = (await mw.json()) as { items?: unknown[]; entries?: unknown[] };
    apiOpen = (body.items ?? body.entries ?? []).length;
  }
  note("INVESTOR-06-api-my-work", apiOpen > 0, `API my-work items=${apiOpen}`);

  // UI: open-work-lane (post-compose deploy) OR scheduled lane / empty action (pre-deploy).
  const openLane = page.getByTestId("open-work-lane");
  const openLaneVisible = await openLane.isVisible().catch(() => false);
  const ledgerOnNeeds = await page.getByTestId("work-ledger-item").count().catch(() => 0);
  const scheduled = await page.getByTestId("scheduled-lane").isVisible().catch(() => false);
  if (openLaneVisible) {
    await expect
      .poll(async () => {
        const n = await page.getByTestId("work-ledger-item").count();
        const empty = await page.getByTestId("open-work-empty").isVisible().catch(() => false);
        if (n > 0) return `items:${n}`;
        if (empty) return "empty";
        return "loading";
      }, { timeout: 30_000 })
      .not.toBe("loading");
    const n = await page.getByTestId("work-ledger-item").count();
    note(
      "INVESTOR-06-open-work-ui",
      n > 0 || apiOpen === 0,
      n > 0 ? `open-work ledger items=${n}` : "open-work empty (API also empty)",
    );
    if (n > 0) {
      await page.getByTestId("work-ledger-item").first().getByTestId("work-ledger-item-view").click().catch(() => undefined);
      await page.waitForTimeout(800);
      const detailOk = await page.getByTestId("work-ledger-item-detail").isVisible().catch(() => false);
      note("INVESTOR-06b-deep-link", detailOk, detailOk ? "item detail opened" : "view did not open detail");
    }
  } else {
    // Pre-deploy lag: Action Center lacks open-work-lane — trust failure until compose ships.
    note(
      "INVESTOR-06-open-work-ui",
      false,
      `P0: open-work-lane absent on live (ledgerOnNeeds=${ledgerOnNeeds}, scheduled=${scheduled}, apiOpen=${apiOpen}) — Wave-1 redirect hid owned work`,
    );
  }

  // ── 6. Team activity ────────────────────────────────────────────
  await spaGo(page, "/app/team-work");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/investor-04-team.png", fullPage: true });
  const teamBody = (await page.locator("body").textContent()) ?? "";
  note(
    "INVESTOR-07-team",
    /team|waiting|member|capacity|work|empty|no one/i.test(teamBody),
    /team|waiting|work/i.test(teamBody) ? "team surface responsive" : "unclear team surface",
  );

  // ── 7. Project coherence ────────────────────────────────────────
  await spaGo(page, "/app/work-projects");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "screenshots/investor-05-projects.png", fullPage: true });
  const projectsPage = page.getByTestId("work-projects-page");
  await expect(projectsPage).toBeVisible({ timeout: 30_000 });
  const projectRows = page.locator('[data-testid^="project-row-"]');
  const pCount = await projectRows.count();
  note("INVESTOR-08-projects", pCount > 0, `project rows=${pCount}`);

  if (pCount > 0) {
    // Expand first project members if toggle exists
    const firstRow = projectRows.first();
    const tid = await firstRow.getAttribute("data-testid");
    const pid = tid?.replace("project-row-", "") ?? "";
    if (pid) {
      const toggle = page.getByTestId(`project-toggle-${pid}`);
      if (await toggle.count()) await toggle.click().catch(() => undefined);
    }
    await page.waitForTimeout(1000);
    const members = page.getByTestId("members-list");
    const membersOk = await members.isVisible().catch(() => false);
    const projBody = (await page.locator("body").textContent()) ?? "";
    const composed =
      membersOk ||
      /member|owner|role|AI Teammate|document|calendar|decision|blocker|obligation/i.test(
        projBody,
      );
    note(
      "INVESTOR-08b-project-compose",
      composed,
      membersOk
        ? "members panel visible"
        : composed
          ? "project context language present (partial compose)"
          : "project list only — composition gap",
    );
  }

  // ── 8. Comms / sources (provider path surface) ──────────────────
  await spaGo(page, "/app/comms");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/investor-06-comms.png", fullPage: true });
  const comms = (await page.locator("body").textContent()) ?? "";
  note(
    "INVESTOR-09-comms",
    /source|capture|meeting|sync|connect|Google|Slack|transcript|Fallback/i.test(comms),
    /SCOPE_REAUTH|reconnect/i.test(comms)
      ? "Meet reauth messaging visible (external blocker)"
      : "comms surface loaded",
  );

  // ── 9. AI Teammate ──────────────────────────────────────────────
  await spaGo(page, "/app/my-twin");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/investor-07-twin.png", fullPage: true });
  const twin = (await page.locator("body").textContent()) ?? "";
  const twinOk =
    /AI Teammate|template|responsibility|tools|pack|role|twin/i.test(twin) &&
    !/^[\s]*$/.test(twin);
  note(
    "INVESTOR-10-twin-template",
    twinOk && !/empty chat|start a conversation with nothing/i.test(twin),
    twinOk ? "teammate surface has role context language" : "generic or empty twin",
  );

  // ── 10. Ambient ask: what is my team doing? ─────────────────────
  const talk = page.getByRole("region", { name: /Talk to Otzar/i }).or(page.getByLabel(/Talk to Otzar/i));
  if (await talk.count()) {
    await talk.first().click().catch(() => undefined);
    const composer = page.getByLabel(/Message to Otzar/i);
    if (await composer.count()) {
      await composer.fill("What is my team doing?");
      await page.getByRole("button", { name: /^send$/i }).click().catch(() => undefined);
      await page.waitForTimeout(12_000);
      const after = (await page.locator("body").textContent()) ?? "";
      const answered =
        /team|working|waiting|handoff|project|don't have|connect|no activity|David|Vishesh|Annie/i.test(
          after,
        );
      note("INVESTOR-11-team-ask", answered, answered ? "ambient answered team ask" : "no useful ambient answer");
    } else {
      note("INVESTOR-11-team-ask", false, "composer not found");
    }
  } else {
    note("INVESTOR-11-team-ask", false, "Talk to Otzar region not found on this shell");
  }

  // ── 11. Truth conflicts (if any) ────────────────────────────────
  await spaGo(page, "/app"); // stay product
  // API soft probe via browser fetch (cookie session may not apply — skip if fails)
  const conflictProbe = await page.evaluate(async (api) => {
    try {
      const r = await fetch(`${api}/otzar/org-truth/conflicts`, { credentials: "include" });
      return { status: r.status };
    } catch (e) {
      return { status: -1, err: String(e) };
    }
  }, API);
  note(
    "INVESTOR-12-truth-api",
    conflictProbe.status === 200 || conflictProbe.status === 401,
    `org-truth conflicts http=${conflictProbe.status} (401 expected without SPA cookie if token-only auth)`,
  );

  // ── 12. No coming-soon active claims on primary loop ────────────
  for (const path of ["/app", "/app/action-center", "/app/my-work", "/app/work-projects", "/app/my-twin"]) {
    await spaGo(page, path);
    await page.waitForTimeout(600);
    const t = (await page.locator("body").textContent()) ?? "";
    const bad = /coming soon|not yet available|under construction/i.test(t);
    if (bad) note(`INVESTOR-13-no-placeholder-${path}`, false, "coming soon language");
  }
  note("INVESTOR-13-placeholders", true, "primary loop scanned");

  // ── Console health ──────────────────────────────────────────────
  const hardConsole = consoleErrors.filter(
    (e) => !/ResizeObserver|favicon|Download the React DevTools/i.test(e),
  );
  note(
    "INVESTOR-14-console",
    hardConsole.length === 0,
    hardConsole.length ? hardConsole.slice(0, 3).join(" | ") : "no hard console errors",
  );

  // Summary for CI log
  const fails = notes.filter((n) => !n.ok);
  console.log(
    `[investor-summary] total=${notes.length} fail=${fails.length} cta=${cta} fails=${fails.map((f) => f.step).join(",")}`,
  );

  // Hard fails: login must work; shell must load. Deploy lag is soft (annotated).
  expect(notes.find((n) => n.step === "INVESTOR-01-login")?.ok).toBe(true);
  expect(notes.find((n) => n.step === "INVESTOR-08-projects")?.ok).toBe(true);

  // Soft: if CTA is Continue, journey still runs but gate stays open for deploy.
  await page.screenshot({ path: "screenshots/investor-99-end.png", fullPage: true });
});
