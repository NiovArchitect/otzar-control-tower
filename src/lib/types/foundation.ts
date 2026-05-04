// FILE: foundation.ts
// PURPOSE: TypeScript contracts for every Foundation API response
//          shape the Control Tower consumes. Single source of truth.
//          When Foundation evolves an endpoint, the type updates here
//          and the build breaks at every stale call site -- the
//          architectural mirror of Foundation's @niov/database type
//          re-exports.
// CONNECTS TO: src/lib/api.ts (the only HTTP surface), every screen
//              that reads server data via TanStack Query.
//
// SECTION 12A SCOPE: just enough types for the endpoints 12A
// consumes (POST /auth/login, GET /platform/health, GET
// /org/analytics for the Pending Approvals badge). 12B-12F extend
// this file as new endpoints come online.

// WHAT: Foundation's POST /auth/login response shape.
// INPUT: Used as a return type only.
// OUTPUT: None.
// WHY: Mirrors AuthService.LoginResult in apps/api/src/services/auth.service.ts.
//      The frontend derives `can_admin_org` from
//      `allowed_operations.includes("admin_org")` per Foundation's
//      OPERATION_TO_CAPABILITY map (Section 9). Adding the boolean
//      to the API response would be a Foundation change, deferred.
export interface LoginResponse {
  ok: true;
  token: string;
  session_id: string;
  expires_at: string; // ISO 8601
  allowed_operations: string[];
  clearance_ceiling: number;
}

// WHAT: Foundation's POST /auth/login failure shape.
export interface LoginFailure {
  ok: false;
  code: "INVALID_CREDENTIALS" | "SUSPENDED";
  message: string;
}

// WHAT: GET /platform/health response shape.
// INPUT: Used as a return type only.
// OUTPUT: None.
// WHY: Public unauthenticated endpoint. Used by the
//      ConnectionStatusIndicator footer dot to surface "Foundation
//      reachable / not reachable" to the operator at a glance.
export interface PlatformHealth {
  ok: true;
  version: string;
  timestamp: string;
  database: "connected" | "disconnected" | "unknown";
}

// WHAT: GET /org/analytics response shape -- a partial subset.
// INPUT: Used as a return type only.
// OUTPUT: None.
// WHY: 12A consumes only `pending_approvals_count` (drives the
//      sidebar Approvals badge). 12B-12F will extend this type with
//      compound_score, capsule_count, etc. as Home + Analytics
//      screens come online.
export interface OrgAnalytics {
  ok: true;
  org_entity_id: string;
  pending_approvals_count: number;
  active_twins: number;
  compound_score: number;
  capsule_count: number;
  // Other fields land in 12B-12F as they get consumed.
}

// WHAT: Generic Foundation 4xx/5xx body shape.
// INPUT: Used as a return type only.
// OUTPUT: None.
// WHY: Foundation routes return discriminated-union failures with
//      `code` + `message`. The api.ts wrapper normalizes every
//      response to ApiResult; this is what the `ok: false` arm
//      looks like on the wire.
export interface FoundationError {
  ok: false;
  code: string;
  message?: string;
}
