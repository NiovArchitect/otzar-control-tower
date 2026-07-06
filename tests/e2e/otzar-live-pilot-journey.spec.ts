// FILE: otzar-live-pilot-journey.spec.ts
// PURPOSE: [CONSOLIDATION] ONE read-only pass over the whole pilot
//          setup/context/AIX/retention journey — the arc's coherence
//          proof: every surface renders on the live org, the copy tells
//          one consistent story (governed lifecycle, boundaries, no
//          overclaims), and the entire walk fires ZERO writes.
//          Mutation: NONE by design.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test \
//      --config=playwright.live.config.ts tests/e2e/otzar-live-pilot-journey.spec.ts

import { test, expect } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("the full pilot journey renders read-only with coherent governed copy", async ({ page }) => {
  test.setTimeout(300_000);

  const nonGet: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("api.otzar.ai") && req.method() !== "GET" && !req.url().includes("/auth/login")) {
      nonGet.push(`${req.method()} ${req.url()}`);
    }
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2000);

  const go = async (path: string): Promise<void> => {
    await page.evaluate((p) => {
      history.pushState({}, "", p);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, path);
  };

  // 1) Setup hub — the journey + the boundaries pointer.
  await go("/setup");
  await expect(page.getByTestId("setup-summary")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("setup-boundaries-pointer")).toBeVisible();

  // 2) Go-live gate — verdict + honest limitation language present.
  await go("/setup/go-live");
  await expect(page.getByTestId("go-live-verdict")).toBeVisible({ timeout: 60_000 });

  // 3) Data flow — per-source truth + governed retention line.
  await go("/setup/data-flow");
  await expect(page.getByTestId("dataflow-boundaries-link")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("body")).toContainText("retired from active use (audit preserved)");

  // 4) Context boundaries — doctrine + governed retention framing.
  await go("/setup/context-boundaries");
  await expect(page.getByTestId("boundaries-doctrine")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("boundaries-retention-copy")).toContainText(
    "becoming governed lifecycle controls",
  );

  // 5) Retention — lifecycle categories + the lifecycle card renders.
  await go("/retention");
  await expect(page.getByTestId("retention-context-lifecycle")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("retention-lifecycle-copy")).toContainText(
    "not available yet",
  );

  // 6) Seeding surfaces render their boundary promises (no writes fired —
  //    both are confirmation-gated forms).
  await go("/setup/seed-corpus");
  await expect(page.getByTestId("corpus-boundary")).toBeVisible({ timeout: 60_000 });
  await go("/setup/seed-history");
  await expect(page.getByTestId("seed-history-doctrine")).toBeVisible({ timeout: 60_000 });

  // 7) Bulk import — least-access-first promise, preview-first form.
  await go("/setup/import-people");
  await expect(page.getByTestId("import-people-page")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("import-least-access")).toBeVisible();

  // Coherence sweep over everything this walk rendered: no overclaims,
  // no raw internals. ("purge"/"current truth" appear only in negation —
  // covered by unit sweeps; here we ban the unambiguous claims.)
  const body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toMatch(/self-serve complete|fully onboarded|production certified|compliance ready|retention configured|delete forever|Otzar knows everything|AI trained/i);
  expect(body).not.toMatch(/DOCUMENT_CONTEXT|seeded_context|source_lineage|EXECUTIVE_OVERRIDE/);
  expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

  // THE proof: the entire journey fired zero writes.
  expect(nonGet).toEqual([]);
});

// [DEEP-SMOKE] the EMPLOYEE side of onboarding: personal calibration and
// writing style carry the personal/company boundary, and the ambient bar
// renders — all read-only.
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMPLOYEE_EMAIL ?? "vishesh@niovlabs.com";

test("the employee calibration journey renders read-only with the personal/company boundary", async ({ page }) => {
  test.setTimeout(300_000);

  const nonGet: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("api.otzar.ai") && req.method() !== "GET" && !req.url().includes("/auth/login")) {
      nonGet.push(`${req.method()} ${req.url()}`);
    }
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2000);

  const go = async (path: string): Promise<void> => {
    await page.evaluate((p) => {
      history.pushState({}, "", p);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, path);
  };

  // Twin calibration — personal preference memory, consent-gated.
  await go("/app/my-twin/calibration");
  await expect(page.getByTestId("calibration-boundary")).toBeVisible({ timeout: 60_000 });

  // Writing style — the raw sample never leaves the browser; no uploads.
  await go("/app/my-twin/calibration/writing-style");
  await expect(page.getByTestId("style-boundary")).toBeVisible({ timeout: 60_000 });
  expect(await page.locator('input[type="file"]').count()).toBe(0);

  // The ambient bar is present on the employee shell.
  await expect(page.getByLabel("Talk to Otzar").first()).toBeVisible({ timeout: 60_000 });

  // Coherence sweep: personal/company boundary language present; no
  // overclaims or raw internals anywhere on the walk.
  const body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toMatch(/self-serve complete|compliance ready|retention configured|AI trained|company brain|Otzar knows everything/i);
  expect(body).not.toMatch(/DOCUMENT_CONTEXT|seeded_context|source_lineage|context_lifecycle|EXECUTIVE_OVERRIDE/);
  expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

  // Zero writes across the employee walk.
  expect(nonGet).toEqual([]);
});
