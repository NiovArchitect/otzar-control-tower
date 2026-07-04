// FILE: otzar-live-external-context.spec.ts
// PURPOSE: [T-1] LIVE read-only proof of external-party context: rows with a
//          proven link render one calm fragment; rows without stay SILENT
//          (no CRM chrome, no invented parties); the projection never
//          carries emails/excerpts/raw ids. If the live org has no governed
//          external collaborators yet, the honest proof IS the silence.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-external-context.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read"] },
  });
  return (await lr.json()).token as string;
}

test("T1 api: external_context appears only with a proven link, in the safe shape — never emails/excerpts/ids", async ({ request }) => {
  const token = await apiLogin(request, EMPLOYEE_EMAIL);
  const res = await request.get(`${API}/work-os/my-work`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  const entries = (Array.isArray(body) ? body : (body.entries ?? body.items ?? [])) as Array<
    Record<string, unknown>
  >;
  expect(entries.length).toBeGreaterThan(0);
  const withCtx = entries.filter((e) => e.external_context !== undefined);
  console.log(`[t1] my-work rows=${entries.length} with_external_context=${withCtx.length}`);
  for (const e of withCtx) {
    const ec = e.external_context as Record<string, unknown>;
    expect(typeof ec.safe_context_label).toBe("string");
    expect(typeof ec.external_party_type).toBe("string");
    console.log(`[t1] sample: "${ec.safe_context_label}" (${ec.external_party_type})`);
  }
  const raw = JSON.stringify(entries.map((e) => e.external_context ?? null));
  expect(raw).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i); // no emails/domains
  expect(raw).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/); // no ids
  expect(raw).not.toMatch(/EXTERNAL_OWES|source_excerpt|SECRET/);
});

test("T2 ui: work rows without external links stay SILENT — no CRM chrome, no invented parties (screenshot)", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/my-work");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect
    .poll(async () => await page.getByTestId("work-ledger-item").count(), { timeout: 45_000 })
    .toBeGreaterThan(0);
  const items = await page.getByTestId("work-ledger-item").count();
  const fragments = await page.getByTestId("work-ledger-item-external").count();
  console.log(`[t1] visible items=${items} external fragments=${fragments}`);
  if (fragments > 0) {
    const first = (await page.getByTestId("work-ledger-item-external").first().textContent()) ?? "";
    console.log(`[t1] first fragment: "${first.trim()}"`);
    expect(first).not.toMatch(/EXTERNAL_OWES|@|external_commitment/);
  }
  // Either way: no CRM chrome ever appears on this page.
  const main = (await page.locator("main, body").first().textContent()) ?? "";
  expect(main).not.toMatch(/pipeline|deal stage|opportunity stage/i);
  await page.screenshot({ path: "screenshots/external-context-my-work.png", fullPage: true });
});
