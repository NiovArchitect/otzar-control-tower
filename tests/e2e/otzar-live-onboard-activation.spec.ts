// FILE: otzar-live-onboard-activation.spec.ts
// PURPOSE: [P0-ONBOARD] LIVE journey proof of the repaired onboarding loop:
//          admin invites a dynamic smoke user → one-time activation link →
//          /activate sets the invitee's own password → invitee logs in and
//          lands in the employee app (NOT admin) → reused link honestly
//          dies → admin reset link rotates the password (old dies, new
//          works) → leak sweep (no password_hash / token material on any
//          admin wire) → cleanup: the smoke user is SUSPENDED (soft rail).
//          Uses a per-run pilot-smoke+<runid> identity — never a real
//          person, never the demo logins.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-onboard-activation.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const APP = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function adminLogin(request: APIRequestContext): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: PW, requested_operations: ["read", "write", "admin_org"] },
  });
  expect(lr.status()).toBe(200);
  return (await lr.json()).token as string;
}

test("invite → activate → first login → reset → cleanup, with a full leak sweep", async ({ page, request }) => {
  test.setTimeout(300_000);
  const admin = await adminLogin(request);
  const email = `pilot-smoke+${RUN}@niovlabs.com`;

  // 1) Admin invites a dynamic member (credential-less create + Phase 3).
  const created = await request.post(`${API}/org/members`, {
    headers: { authorization: `Bearer ${admin}` },
    data: { email, first_name: "Pilot", last_name: `Smoke ${RUN}` },
  });
  expect(created.status()).toBe(201);
  const entityId = (await created.json()).entity_id as string;
  const invited = await request.post(`${API}/org/onboarding/invite`, {
    headers: { authorization: `Bearer ${admin}` },
    data: { entity_id: entityId },
  });
  expect(invited.status()).toBe(200);
  const inviteBody = (await invited.json()) as Record<string, unknown>;
  expect(inviteBody.activation_credential).toBeUndefined(); // legacy dead field GONE
  const activationToken = inviteBody.activation_token as string;
  expect(typeof activationToken).toBe("string");
  console.log(`[p0] invited ${email} entity=${entityId.slice(0, 8)}…`);

  try {
    // Pre-activation: login fails closed.
    const early = await request.post(`${API}/auth/login`, {
      data: { email, password: "anything-wrong-here", requested_operations: ["read"] },
    });
    expect(early.status()).toBe(401);

    // Admin projection names the state.
    const list1 = await request.get(`${API}/org/entities?type=PERSON&take=250`, {
      headers: { authorization: `Bearer ${admin}` },
    });
    const items1 = ((await list1.json()).items ?? []) as Array<Record<string, unknown>>;
    expect(items1.find((i) => i.entity_id === entityId)?.activation_status).toBe("activation_pending");

    // 2) The invitee opens the activation page and sets their password.
    const password1 = `Pilot-${RUN}-first!`;
    await page.goto(`${APP}/activate?token=${activationToken}`);
    await page.getByTestId("activate-password").fill(password1);
    await page.getByTestId("activate-confirm").fill(password1);
    await page.screenshot({ path: "screenshots/p0-onboard-activate.png" });
    await page.getByTestId("activate-submit").click();
    await expect(page.getByTestId("activate-success")).toBeVisible({ timeout: 30_000 });

    // 3) First login through the real UI — lands in the employee app.
    await page.getByTestId("activate-go-login").click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password1);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
    await page.waitForTimeout(2500);
    expect(page.url()).toContain("/app");
    await page.screenshot({ path: "screenshots/p0-onboard-first-login.png", fullPage: true });

    // Not an admin: the seeds queue refuses.
    const invLogin = await request.post(`${API}/auth/login`, {
      data: { email, password: password1, requested_operations: ["read", "write", "admin_org"] },
    });
    const invToken = (await invLogin.json()).token as string;
    const gated = await request.get(`${API}/org/dandelion/seeds`, {
      headers: { authorization: `Bearer ${invToken}` },
    });
    expect([401, 403]).toContain(gated.status());

    // 4) Reused activation link honestly dies.
    const reuse = await request.post(`${API}/auth/activate`, {
      data: { token: activationToken, password: "Another-pass-99999" },
    });
    expect(reuse.status()).toBe(410);

    // 5) Admin reset link: old password dies, new works.
    const mint = await request.post(`${API}/org/members/${entityId}/password-reset-link`, {
      headers: { authorization: `Bearer ${admin}` },
    });
    expect(mint.status()).toBe(200);
    const resetToken = (await mint.json()).token as string;
    const password2 = `Pilot-${RUN}-second!`;
    const redeemed = await request.post(`${API}/auth/activate`, {
      data: { token: resetToken, password: password2 },
    });
    expect(redeemed.status()).toBe(200);
    expect(
      (
        await request.post(`${API}/auth/login`, {
          data: { email, password: password1, requested_operations: ["read"] },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post(`${API}/auth/login`, {
          data: { email, password: password2, requested_operations: ["read"] },
        })
      ).status(),
    ).toBe(200);
    console.log("[p0] reset rail proven: old password dead, new works");

    // 6) Leak sweep on the admin wires.
    for (const url of [
      `${API}/org/entities?type=PERSON&take=250`,
      `${API}/org/entities/${entityId}`,
    ]) {
      const r = await request.get(url, { headers: { authorization: `Bearer ${admin}` } });
      const raw = JSON.stringify(await r.json());
      expect(raw).not.toContain("password_hash");
      expect(raw).not.toContain("token_hash");
      expect(raw).not.toContain(activationToken);
      expect(raw).not.toContain(resetToken);
      expect(raw).not.toContain(password1);
      expect(raw).not.toContain(password2);
    }
    console.log("[p0] leak sweep clean");
  } finally {
    // 7) Cleanup: suspend the smoke identity (soft rail — RULE 10).
    const cleanup = await request.patch(`${API}/org/entities/${entityId}`, {
      headers: { authorization: `Bearer ${admin}` },
      data: { status: "SUSPENDED" },
    });
    console.log(`[p0] cleanup suspend status=${cleanup.status()}`);
  }
});
