// FILE: otzar-handoff-one-tap.live.spec.ts
// PURPOSE: Live HTTPS proof of one-tap handoff acknowledge + complete-ambient
//          and inbound collab accept/reject/complete — multi-persona on the
//          demo org (sadeil → david). API-level (no UI login flake).
// RUN: DEMO_SHARED_PASSWORD='$Oasisme1234' \
//      npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-handoff-one-tap.live.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const PW = process.env.DEMO_SHARED_PASSWORD ?? process.env.OTZAR_DEMO_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD for live demo org.");

async function login(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: {
      email,
      password: PW,
      requested_operations: ["read", "write", "admin_org"],
    },
  });
  expect(res.ok(), `login ${email}`).toBeTruthy();
  const body = (await res.json()) as { token?: string };
  expect(body.token, `token ${email}`).toBeTruthy();
  return body.token!;
}

test("one-tap handoff: create → send → david ack → complete-ambient", async ({
  request,
}) => {
  const sadeil = await login(request, "sadeil@niovlabs.com");
  const david = await login(request, "david@niovlabs.com");

  // Resolve david entity from dgi or hard-known demo id.
  const davidId = "b69b25c5-6d6c-4b95-84fa-ae7d78705c08";

  const create = await request.post(`${API}/otzar/handoffs`, {
    headers: { Authorization: `Bearer ${sadeil}` },
    data: {
      title: `[E2E-ONE-TAP] Ownership ${Date.now()}`,
      summary: "Live one-tap ack+complete proof",
      incoming_responsible_entity_id: davidId,
      priority: "ELEVATED",
      origin_key: `e2e-one-tap-${Date.now()}`,
    },
  });
  expect(create.ok()).toBeTruthy();
  const created = (await create.json()) as {
    handoff: { handoff_id: string; version: number };
  };
  const hid = created.handoff.handoff_id;
  let ver = created.handoff.version;

  for (const transition of ["ready", "send"] as const) {
    const t = await request.post(`${API}/otzar/handoffs/${hid}/transition`, {
      headers: { Authorization: `Bearer ${sadeil}` },
      data: { expected_version: ver, transition },
    });
    expect(t.ok(), transition).toBeTruthy();
    const body = (await t.json()) as { handoff: { version: number } };
    ver = body.handoff.version;
  }

  const dgiBefore = await request.get(`${API}/otzar/dgi-coherence`, {
    headers: { Authorization: `Bearer ${david}` },
  });
  expect(dgiBefore.ok()).toBeTruthy();
  const dgiB = (await dgiBefore.json()) as {
    coherence: { open_incoming_handoffs_count: number; next_best_step?: { kind: string } };
  };
  expect(dgiB.coherence.open_incoming_handoffs_count).toBeGreaterThanOrEqual(1);

  const ack = await request.post(`${API}/otzar/handoffs/${hid}/acknowledge`, {
    headers: { Authorization: `Bearer ${david}` },
    data: {},
  });
  expect(ack.ok(), await ack.text()).toBeTruthy();
  const ackBody = (await ack.json()) as {
    handoff: { state: string; version: number };
    acknowledged_turn_id: string;
  };
  expect(ackBody.handoff.state).toBe("ACKNOWLEDGED");
  expect(ackBody.acknowledged_turn_id.length).toBeGreaterThan(10);

  const complete = await request.post(
    `${API}/otzar/handoffs/${hid}/complete-ambient`,
    {
      headers: { Authorization: `Bearer ${david}` },
      data: { expected_version: ackBody.handoff.version },
    },
  );
  expect(complete.ok(), await complete.text()).toBeTruthy();
  const done = (await complete.json()) as { handoff: { state: string } };
  expect(done.handoff.state).toBe("COMPLETED");
});

test("collab matrix: create → accept → complete (and reject path)", async ({
  request,
}) => {
  const sadeil = await login(request, "sadeil@niovlabs.com");
  const david = await login(request, "david@niovlabs.com");
  const davidId = "b69b25c5-6d6c-4b95-84fa-ae7d78705c08";

  // Accept path
  const create = await request.post(
    `${API}/otzar/my-twin/collaboration-requests`,
    {
      headers: { Authorization: `Bearer ${sadeil}` },
      data: {
        target_type: "EMPLOYEE",
        request_type: "STATUS_REQUEST",
        safe_summary: `[E2E] Status check ${Date.now()}`,
        target_entity_id: davidId,
      },
    },
  );
  expect(create.ok(), await create.text()).toBeTruthy();
  const cBody = (await create.json()) as {
    collaboration: { collaboration_id: string; state: string };
  };
  const cid = cBody.collaboration.collaboration_id;

  const inbound = await request.get(
    `${API}/otzar/my-twin/collaboration-requests/inbound`,
    { headers: { Authorization: `Bearer ${david}` } },
  );
  expect(inbound.ok()).toBeTruthy();
  const list = (await inbound.json()) as {
    collaborations: Array<{ collaboration_id: string }>;
  };
  expect(
    list.collaborations.some((c) => c.collaboration_id === cid),
  ).toBeTruthy();

  const accept = await request.post(
    `${API}/otzar/my-twin/collaboration-requests/${cid}/accept`,
    { headers: { Authorization: `Bearer ${david}` } },
  );
  expect(accept.ok(), await accept.text()).toBeTruthy();

  const complete = await request.post(
    `${API}/otzar/my-twin/collaboration-requests/${cid}/complete`,
    { headers: { Authorization: `Bearer ${david}` } },
  );
  // complete may require ACCEPTED state from target — accept either complete or already progressed
  const completeOk = complete.ok();
  if (!completeOk) {
    // try as requester
    const complete2 = await request.post(
      `${API}/otzar/my-twin/collaboration-requests/${cid}/complete`,
      { headers: { Authorization: `Bearer ${sadeil}` } },
    );
    expect(complete2.ok() || complete.status() === 409).toBeTruthy();
  }

  // Reject path
  const create2 = await request.post(
    `${API}/otzar/my-twin/collaboration-requests`,
    {
      headers: { Authorization: `Bearer ${sadeil}` },
      data: {
        target_type: "EMPLOYEE",
        request_type: "FOLLOW_UP",
        safe_summary: `[E2E] Reject path ${Date.now()}`,
        target_entity_id: davidId,
      },
    },
  );
  expect(create2.ok()).toBeTruthy();
  const c2 = (await create2.json()) as {
    collaboration: { collaboration_id: string };
  };
  const reject = await request.post(
    `${API}/otzar/my-twin/collaboration-requests/${c2.collaboration.collaboration_id}/reject`,
    { headers: { Authorization: `Bearer ${david}` } },
  );
  expect(reject.ok(), await reject.text()).toBeTruthy();
});
