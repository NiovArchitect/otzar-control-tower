// FILE: handlers.ts
// PURPOSE: MSW request handlers for Foundation endpoints invoked by
//          tests. Each test sub-box (12B.2-12B.4) extends this file
//          with handlers for the new endpoints it consumes.
// CONNECTS TO: tests/msw/server.ts (uses these handlers), every
//              unit test that exercises real API client paths.

import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:3000/api/v1";

// 12B.1 baseline handlers: just enough for the 2 anchor tests.
// AuditAwareButton's 4-stage test posts to /cosmp/share via its
// onConfirm closure; we return a valid ShareResponse shape so the
// component sees the audit_event_id field flow through.
//
// DataTable's 4-state test does NOT hit the API directly (it
// receives data via props), so no GET handler is needed for that
// test. Future 12B.2-12B.4 tests will add GET /org/permissions,
// GET /org/entities, etc. handlers here.
export const handlers = [
  http.post(`${API_BASE}/cosmp/share`, async () => {
    return HttpResponse.json(
      {
        ok: true,
        bridge_id: "00000000-1111-2222-3333-444444444444",
        permissions_created: ["aaa-perm-1"],
        audit_event_id: "11111111-2222-3333-4444-555555555555",
      },
      { status: 201 },
    );
  }),
];
