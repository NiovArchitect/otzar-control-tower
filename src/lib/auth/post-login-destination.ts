// FILE: post-login-destination.ts
// PURPOSE: YC first-use / enterprise login gate — authentication always
//          lands on role Home unless processing a *validated* deep link.
//          Never restore prior admin pages, sensitive records, or stale
//          routes after login/reauth/logout. Pure + testable.
// CONNECTS TO: Login.tsx resolveDestination, AuthGuard returnTo capture,
//              landingPathFor, first-use reveal.

import type { AuthCapabilities } from "@/lib/stores/auth";
import { landingPathFor } from "@/lib/auth/capabilities";

/**
 * Paths that may be restored after auth (intentional deep links only).
 * Everything else — admin CT, sensitive detail shells, bare roots — is
 * refused so login always establishes a fresh Home session.
 */
const DEEP_LINK_PREFIXES: ReadonlyArray<string> = [
  "/app/action-center",
  "/app/work-projects",
  "/app/inbox/",
  "/app/collaboration-workspaces/",
  "/app/comms",
  "/app/my-work",
  "/app/team-work",
  "/activate",
];

/** Admin / sensitive shells that must NEVER auto-restore after login. */
const BLOCKED_RESTORE_PREFIXES: ReadonlyArray<string> = [
  "/users",
  "/setup",
  "/ai-teammates",
  "/access-control",
  "/access-grants",
  "/agent-playground",
  "/playground",
  "/security-audit",
  "/organization-seeding",
  "/connectors",
  "/connector-rails",
  "/tools-connections",
  "/data-knowledge",
  "/system-health",
  "/analytics",
  "/billing",
  "/cohorts",
  "/marketplace",
  "/review-center",
  "/approvals",
  "/policies",
  "/collaboration-policy",
  "/onboarding",
  "/intelligence",
  "/documentation",
  "/voice-providers",
  "/retention",
  "/reports",
  "/conversations",
  "/workflows",
  "/settings",
];

function pathOnly(raw: string): string {
  const q = raw.indexOf("?");
  const h = raw.indexOf("#");
  let end = raw.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  return raw.slice(0, end);
}

/** True when returnTo is a same-origin intentional product deep link. */
export function isValidatedDeepLink(returnTo: string | null | undefined): boolean {
  if (returnTo === null || returnTo === undefined) return false;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return false;
  if (returnTo.startsWith("/login")) return false;
  const path = pathOnly(returnTo);
  if (path === "/" || path === "") return false;
  for (const blocked of BLOCKED_RESTORE_PREFIXES) {
    if (path === blocked || path.startsWith(`${blocked}/`)) return false;
  }
  // Exact /app is Home — not a deep link to restore (login should land Home)
  if (path === "/app") return false;
  for (const prefix of DEEP_LINK_PREFIXES) {
    if (path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`) || path.startsWith(prefix)) {
      // my-twin calibration etc. — allow twin home deep links as intentional
      return true;
    }
  }
  // Explicit allow: AI teammate identity (first-use continuation)
  if (path === "/app/my-twin" || path.startsWith("/app/my-twin/")) return true;
  return false;
}

/**
 * Post-authentication destination.
 * - Validated deep link → that path (authorization still enforced by guards)
 * - Otherwise → role Home (never restore arbitrary prior routes)
 */
export function resolvePostLoginDestination(
  returnTo: string | null | undefined,
  capabilities: AuthCapabilities | null,
): string {
  const home = landingPathFor(capabilities);
  if (returnTo === null || returnTo === undefined || returnTo === "") {
    return home;
  }
  if (
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.startsWith("/login")
  ) {
    return home;
  }
  if (isValidatedDeepLink(returnTo)) {
    return returnTo;
  }
  return home;
}
