// FILE: otzar-live-contextual-c04.spec.ts
// PURPOSE: C-04 DEEP live smoke — blind spots / corrections / obligations /
//          handoffs / evidence live on Needs me contextual surfaces.
//
// SCENARIOS:
//   C04-A  /app/action-center is C-04 host (data-c04-host)
//   C04-B  Blind spots lane present
//   C04-C  Corrections context lane + open form link
//   C04-D  Obligations / handoffs / evidence / open-work lanes present
//   C04-E  /app/blind-spots redirects into Needs me
//   C04-F  Corrections deep-link form still reachable
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-contextual-c04.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  console.log(
    `[c04] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

test("C-04 deep: contextual work surfaces on Needs me", async ({ page }) => {
  test.setTimeout(240_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/action-center", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const ac = page.getByTestId("action-center");
  if ((await ac.count()) === 0) {
    rec("C04-A", "FAIL", "action-center missing");
    expect(false, "action-center").toBe(true);
    return;
  }
  const c04 =
    (await ac.getAttribute("data-c04-host")) === "true" ||
    (await ac.getAttribute("data-contextual-work")) === "true";
  rec(
    "C04-A",
    c04 ? "PASS" : "FAIL",
    c04 ? "c04 host markers" : "missing data-c04-host — deploy C-04",
  );

  // Wait for lanes to paint
  try {
    await expect
      .poll(
        async () => {
          if ((await page.getByTestId("blind-spots-lane").count()) > 0)
            return "bs";
          if ((await page.getByTestId("open-work-lane").count()) > 0)
            return "ow";
          return "wait";
        },
        { timeout: 20_000 },
      )
      .not.toBe("wait");
  } catch {
    /* fall through */
  }

  const blind = page.getByTestId("blind-spots-lane");
  rec(
    "C04-B",
    (await blind.count()) > 0 ? "PASS" : "FAIL",
    (await blind.count()) > 0
      ? "blind-spots-lane"
      : "no blind-spots-lane — deploy C-04",
  );

  const corr = page.getByTestId("corrections-context-lane");
  const openForm = page.getByTestId("corrections-open-form");
  rec(
    "C04-C",
    (await corr.count()) > 0 && (await openForm.count()) > 0 ? "PASS" : "FAIL",
    (await corr.count()) > 0
      ? "corrections context + form link"
      : "no corrections-context-lane",
  );

  // open-work always mounts; obligations/handoffs/evidence may stay quiet when empty
  const always = page.getByTestId("open-work-lane");
  const optional = [
    "open-obligations-lane",
    "incoming-handoffs-lane",
    "decision-evidence-lane",
  ] as const;
  const present: string[] = [];
  if ((await always.count()) > 0) present.push("open-work-lane");
  for (const id of optional) {
    if ((await page.getByTestId(id).count()) > 0) present.push(id);
  }
  rec(
    "C04-D",
    (await always.count()) > 0 ? "PASS" : "FAIL",
    `lanes=${present.join(",") || "none"} (optional lanes quiet when empty)`,
  );

  // Legacy redirect
  await page.goto("/app/blind-spots", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const url = page.url();
  const redirected =
    /action-center/i.test(url) ||
    (await page.getByTestId("action-center").count()) > 0;
  rec(
    "C04-E",
    redirected ? "PASS" : "FAIL",
    redirected ? `redirected ${url.slice(-40)}` : `still on ${url}`,
  );

  await page.goto("/app/corrections", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const formPage =
    (await page.getByTestId("corrections-page").count()) > 0 ||
    (await page.getByLabel(/got wrong|incorrect/i).count()) > 0 ||
    (await page.getByRole("heading", { name: /correction/i }).count()) > 0;
  rec(
    "C04-F",
    formPage ? "PASS" : "FAIL",
    formPage ? "corrections deep-link form" : "corrections form missing",
  );

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "C04_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "C04_JSON_END",
  );
  console.log(`[c04] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `C-04 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(4);
});
