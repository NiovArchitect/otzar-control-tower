// FILE: capabilities.ts
// PURPOSE: The first frontend ABAC/RBAC permission map. Pure helpers
//          that translate the auth store's AuthCapabilities into the
//          persona + action decisions the Control Tower (org-admin)
//          and the employee Otzar shell rely on.
// CONNECTS TO: src/lib/stores/auth.ts (AuthCapabilities shape),
//              src/components/employee/EmployeeGuard.tsx,
//              src/components/AuthGuard.tsx (unchanged; still gates on
//              can_admin_org), Login landing logic, the two layouts'
//              cross-persona switch links.
//
// PERSONA SEMANTICS (verified against niov-foundation):
//   - Employee  = authenticated product user with can_read_capsules
//                 (chat/conversation use validateSession("read")).
//   - Org admin = can_admin_org (Control Tower gate; unchanged).
//   - canWriteOtzar = can_write_capsules (observe + correction use
//                 validateSession("write")).
//   - Manager   = FUTURE. No backend manager role exists; isManager()
//                 deliberately returns false and takes no capability.
//
// HARD RULE: can_admin_niov is NEVER consulted for product access. It
// is Console/NIOV-admin scope and must remain Console-only. No helper
// in this file branches on it.

import type { AuthCapabilities } from "@/lib/stores/auth";

// WHAT: True when the given capability flag is set.
// INPUT: capabilities (nullable -- logged-out is null), the flag key.
// OUTPUT: boolean.
// WHY: One narrow accessor so call sites never reach into a possibly
//      null object directly.
export function hasCapability(
  capabilities: AuthCapabilities | null,
  capability: keyof AuthCapabilities,
): boolean {
  return capabilities !== null && capabilities[capability] === true;
}

// WHAT: True when ANY of the listed capabilities is set.
// WHY: Used where a surface admits more than one persona (e.g., a
//      route reachable by either employees or org admins).
export function hasAnyCapability(
  capabilities: AuthCapabilities | null,
  capabilitiesList: ReadonlyArray<keyof AuthCapabilities>,
): boolean {
  if (capabilities === null) return false;
  return capabilitiesList.some((c) => capabilities[c] === true);
}

// WHAT: True for an org admin (Control Tower persona).
export function isOrgAdmin(capabilities: AuthCapabilities | null): boolean {
  return hasCapability(capabilities, "can_admin_org");
}

// WHAT: True for an employee (authenticated product user) -- the
//        EmployeeGuard admission test.
// WHY: can_read_capsules is the minimum to converse with an AI
//      teammate (conversation routes validateSession("read")).
export function isEmployee(capabilities: AuthCapabilities | null): boolean {
  return hasCapability(capabilities, "can_read_capsules");
}

// WHAT: True when the employee may submit observe / correction writes.
// WHY: observe + correction routes validateSession("write").
export function canWriteOtzar(capabilities: AuthCapabilities | null): boolean {
  return hasCapability(capabilities, "can_write_capsules");
}

// WHAT: True when the user may forward-share capsules.
// WHY: Surfaced for completeness (share->can_share_capsules); not gating
//      any Phase-1 employee action yet.
export function canShareCapsules(
  capabilities: AuthCapabilities | null,
): boolean {
  return hasCapability(capabilities, "can_share_capsules");
}

// WHAT: FUTURE manager persona. No backend manager role exists; this is
//        a deliberate stub so call sites can be written now without
//        inventing an unsupported capability.
// WHY: Returns false unconditionally. Do NOT wire to a real capability
//      until a Foundation manager/team contract is proven.
export function isManager(_capabilities: AuthCapabilities | null): boolean {
  return false;
}

// WHAT: Where to land a user after login, by persona.
// INPUT: capabilities from the auth store after a successful login.
// OUTPUT: a route path.
// WHY: Org admins default to the Control Tower ("/"); product-only
//      employees land in the Otzar shell ("/app"); a user with neither
//      is sent to "/app" where EmployeeGuard renders the explicit
//      "no Otzar access" state (never silently into the admin area).
export function landingPathFor(
  capabilities: AuthCapabilities | null,
): string {
  if (isOrgAdmin(capabilities)) return "/";
  return "/app";
}
