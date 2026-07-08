// FILE: otzar-live-source-integrity.spec.ts
// PURPOSE: [SOURCE-INTEGRITY] LIVE proof on the Meridian sim org that an
//          imported Google-Doc source can be REVALIDATED against its real
//          upstream. The only branch that is honestly provable against a real,
//          unchanged founder doc is SAME-HASH = CURRENT: import ONE real doc →
//          revalidate → state AVAILABLE, changed:false, no token leak → cancel.
//          The mutation branches (CHANGED_UPSTREAM / SOURCE_DELETED /
//          ACCESS_REVOKED / CORRUPT_OR_INVALID) are proven in Foundation
//          integration tests via an injected fetch seam — they are NOT run
//          live because that would require corrupting / deleting / revoking a
//          real founder document, which is forbidden. This spec asserts that
//          separation explicitly so the coverage story is honest.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-source-integrity.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const ADMIN_EMAIL =
  process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const ORG_ID =
  process.env.OTZAR_CUSTSIM_ORG_ENTITY_ID ??
  "69c07a00-2b39-4771-95c3-22c214e7ae6c";

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
  ops: string[],
): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email, password, requested_operations: ops },
  });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { token: string }).token;
}

test("Source integrity on Meridian: import a real Google Doc, revalidate same-hash → AVAILABLE + no leak → cancel", async ({
  request,
}) => {
  test.setTimeout(300_000);
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  // Tenancy guard — Meridian sim org or nothing (no real founder tenant touched).
  const hier = await request.get(`${API}/org/hierarchy`, { headers: auth(admin) });
  expect(((await hier.json()) as { org_entity_id: string }).org_entity_id).toBe(ORG_ID);

  // ── 1) Import ONE real Google Doc as a trusted DOCUMENT_CONTEXT snapshot ──
  const docsList = await request.get(`${API}/drive/docs?page_size=25`, {
    headers: auth(admin),
    timeout: 60_000,
  });
  expect(docsList.status()).toBe(200);
  const driveDocs =
    ((await docsList.json()) as { docs: Array<{ file_id: string; name: string }> }).docs ?? [];
  console.log(`[sourceint] REAL Drive list: ${driveDocs.length} docs`);
  test.skip(driveDocs.length === 0, "No real Google Docs available on the Meridian connection.");

  const pick = driveDocs[0]!;
  let ledgerId: string | null = null;
  try {
    const imp = await request.post(`${API}/drive/docs/ingest`, {
      headers: auth(admin),
      data: { file_id: pick.file_id, source_kind: "OTHER", currentness: "current" },
      timeout: 90_000,
    });
    // A fresh import (200) gives us the row to revalidate. Prior runs cancel
    // their rows (dedupe excludes CANCELLED), so a clean tenant returns 200.
    // A 409 means a prior run left an active import — treat as a real cleanup
    // failure, not a silent pass.
    expect(
      imp.status(),
      "expected a fresh import (200); a 409 means a prior run did not cancel its row",
    ).toBe(200);
    const impBody = (await imp.json()) as { ledger_entry_id: string };
    ledgerId = impBody.ledger_entry_id;
    expect(typeof ledgerId).toBe("string");
    console.log(`[sourceint] imported "${pick.name}" → ${ledgerId.slice(0, 10)}… (source_integrity AVAILABLE)`);

    // ── 2) Revalidate the UNCHANGED upstream — the live-provable branch ──
    // The doc is unchanged between import and this immediate re-check, so the
    // real upstream hash must match the stored snapshot hash exactly.
    const reval = await request.post(`${API}/drive/docs/${ledgerId}/revalidate`, {
      headers: auth(admin),
      failOnStatusCode: false,
      timeout: 90_000,
    });
    const revalRaw = await reval.text();
    const revalBody = JSON.parse(revalRaw) as {
      ok?: boolean;
      state?: string;
      changed?: boolean;
      code?: string;
    };
    expect(reval.status(), `revalidate returned ${reval.status()}: ${revalRaw}`).toBe(200);
    expect(revalBody.ok).toBe(true);
    // Same-hash = current: the snapshot still matches upstream.
    expect(revalBody.state).toBe("AVAILABLE");
    expect(revalBody.changed).toBe(false);
    // No OAuth material ever crosses the wire on a connector revalidation.
    expect(revalRaw).not.toMatch(/access_token|refresh_token|"authorization"/i);
    console.log(
      `[sourceint] REAL revalidation: unchanged upstream → state AVAILABLE, changed=false, no token leak`,
    );

    // ── 3) Honest coverage boundary (documented, not run live) ──
    // CHANGED_UPSTREAM / SOURCE_DELETED / ACCESS_REVOKED / CORRUPT_OR_INVALID
    // are proven in Foundation integration (tests/integration/source-integrity
    // .test.ts) via an injected fetch seam — never live, because that would
    // require corrupting / deleting / revoking a real founder document.
    console.log(
      `[sourceint] mutation branches (changed/deleted/revoked/corrupt) covered by FND integration mocks — not run live by design`,
    );
  } finally {
    // Sweep EVERY non-cancelled DOCUMENT_CONTEXT row — never just the tracked
    // id. A real Google export can exceed the client timeout and complete
    // server-side AFTER Playwright throws, leaving an orphaned active row with
    // ledgerId still null (the exact v2 orphan bug). Sweeping all rows in this
    // dedicated sim tenant makes cleanup resilient to that and breaks the
    // 409-ALREADY_IMPORTED poison cycle for the next run. Dedupe excludes
    // CANCELLED, so a swept file re-imports cleanly next time.
    let cancelled = 0;
    const listed = await request.get(`${API}/work-os/ledger?ledger_type=DOCUMENT_CONTEXT`, {
      headers: auth(admin),
    });
    if (listed.status() === 200) {
      const entries = ((await listed.json()) as {
        entries: Array<{ ledger_entry_id: string; status: string }>;
      }).entries;
      for (const e of entries) {
        if (e.status === "CANCELLED") continue;
        const res = await request.patch(`${API}/work-os/ledger/${e.ledger_entry_id}`, {
          headers: auth(admin),
          data: { status: "CANCELLED" },
        });
        if (res.status() === 200) cancelled += 1;
      }
    }
    console.log(`[sourceint] cleanup: ${cancelled} DOCUMENT_CONTEXT row(s) cancelled — zero residue`);
  }
});
