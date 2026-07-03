// FILE: otzar-live-source-lineage.spec.ts
// PURPOSE: [GAP-J] LIVE read-only proof of quiet source lineage: the work
//          API serves the safe source_lineage block (raw ids/dedupe keys/
//          URLs never cross), My Work card faces stay calm (at most one
//          muted human fragment, never a raw backend token, never
//          "Source not recorded yet" clutter on the card face), and the
//          opened View/Why answers "Came from" in human words. Zero mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-source-lineage.spec.ts

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

test("T1 api: my-work serves safe source_lineage — raw ids and dedupe keys never cross", async ({ request }) => {
  const tok = await apiLogin(request, EMPLOYEE_EMAIL);
  const res = await request.get(`${API}/work-os/my-work`, {
    headers: { authorization: `Bearer ${tok}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const entries = (Array.isArray(body) ? body : (body.entries ?? body.items ?? [])) as Array<
    Record<string, unknown>
  >;
  // The live org has real work rows — an empty parse would make every
  // assertion below vacuous, so it fails loudly instead.
  expect(entries.length).toBeGreaterThan(0);
  const withLineage = entries.filter((e) => e.source_lineage != null);
  console.log(`[lineage] my-work rows=${entries.length} with_lineage=${withLineage.length}`);
  for (const e of withLineage) {
    const l = e.source_lineage as Record<string, unknown>;
    expect(Object.keys(l).sort()).toEqual(
      ["has_source_excerpt", "source_actor", "source_id_present", "source_system", "source_timestamp"],
    );
    expect(typeof l.source_system).toBe("string");
    expect(l.source_system).toMatch(/^[A-Z][A-Z0-9_]{1,31}$/);
  }
  const raw = JSON.stringify(entries);
  expect(raw).not.toContain("dedupe_key");
  expect(raw).not.toContain("connector_identity");
  expect(raw).not.toContain("ingestion_run_id");
});

test("T2 ui: My Work cards stay calm; View/Why answers 'Came from' in human words (screenshot)", async ({ page }) => {
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
  // Settle: real rows or the page's explicit honest empty state — page
  // chrome alone must not satisfy the wait (that made the card assertions
  // vacuous on the first run).
  await expect
    .poll(
      async () =>
        (await page.getByTestId("work-ledger-item").count()) > 0 ||
        (await page.getByTestId("my-work-empty").count()) > 0,
      { timeout: 45_000 },
    )
    .toBe(true);

  const main = (await page.locator("main, body").first().textContent()) ?? "";
  // Quiet-by-default: the honest unknown copy belongs to the Why panel, never
  // the card face; raw backend lineage tokens never render anywhere.
  expect(main).not.toContain("Source not recorded yet");
  for (const banned of ["SLACK:", "ZOOM:", "dedupe", "source_system", "CONNECTOR"]) {
    expect(main, `card faces must not leak "${banned}"`).not.toContain(banned);
  }

  const items = page.getByTestId("work-ledger-item");
  const count = await items.count();
  console.log(`[lineage] visible work items=${count}`);
  // The live org has spine-ingested rows (transcript/Slack), so the calm
  // card-face fragment must actually render somewhere on the page — the
  // quiet label is real, not merely absent-noise.
  const sourceFragments = page.getByTestId("work-ledger-item-source");
  const fragmentCount = await sourceFragments.count();
  console.log(`[lineage] calm source fragments=${fragmentCount}`);
  if (count > 10) {
    expect(fragmentCount, "at least one card shows a calm source label").toBeGreaterThan(0);
    await sourceFragments.first().scrollIntoViewIfNeeded();
    const fragmentText = (await sourceFragments.first().textContent()) ?? "";
    console.log(`[lineage] first fragment: "${fragmentText.trim()}"`);
    expect(fragmentText).toMatch(/From (Slack|Zoom recording|Comms transcript|a meeting)|Added manually/);
  }
  if (count > 0) {
    // Open the first item's View detail → the shared Why panel must answer
    // "Came from" with human copy (a mapped label or the honest unknown).
    await items.first().getByTestId("work-ledger-item-view").click();
    await page.getByText("Came from").waitFor({ state: "visible", timeout: 15_000 });
    const detail = (await items.first().textContent()) ?? "";
    const answered =
      /From (Slack|Zoom recording|Comms transcript|a meeting|approval decision|org update)/.test(detail) ||
      detail.includes("Added manually") ||
      detail.includes("Source not recorded yet");
    expect(answered, "Why panel answers where the work came from").toBe(true);
  }
  await page.screenshot({ path: "screenshots/source-lineage-my-work.png", fullPage: true });
});
