// FILE: cross-tenant-isolation.ts
// PURPOSE: Q-01 / Q-02 — cross-tenant / cross-user / cross-Twin zero leakage
//          and same-identity multi-org deep-link isolation doctrine.
// CONNECTS TO: CrossTenantIsolationCard, org-switch, post-login-destination,
//          multi-org-memory-isolation, portable-core, FOUNDER Q-01 / Q-02.

import { isValidatedDeepLink } from "@/lib/auth/post-login-destination";
import {
  conversationScopeId,
  isSameOrg,
  shouldResetOnOrgChange,
} from "@/lib/auth/org-switch";
import { preferencesIsolatedAcrossUsers } from "@/lib/work-os/portable-core";

export const Q01_DOCTRINE =
  "Work, memory, AI Teammate context, and deep links never leak across " +
  "organizations, other people, or another person's Twin. Isolation is " +
  "fail-closed — when in doubt, show nothing from another boundary.";

export const Q02_DOCTRINE =
  "The same person in multiple organizations keeps separate org-bound Twin " +
  "relationships. Logging in or following a link never restores another org's " +
  "admin shell, another user's queue, or a blended Twin.";

export const ZERO_LEAK_FACETS = [
  {
    id: "tenant",
    label: "Cross-tenant",
    plain: "Organization A never sees Organization B's people, projects, or memory.",
  },
  {
    id: "user",
    label: "Cross-user",
    plain: "Your personal core and queue stay yours — teammates only see governed shared work.",
  },
  {
    id: "twin",
    label: "Cross-Twin",
    plain: "Your AI Teammate does not inherit another person's authority or private learning.",
  },
  {
    id: "deeplink",
    label: "Deep-link isolation",
    plain: "After login, only validated product deep links restore — never admin/sensitive shells from another context.",
  },
] as const;

/** Paths that must never auto-restore after login (re-export for product UI). */
export const SENSITIVE_SHELL_PREFIXES: ReadonlyArray<string> = [
  "/users",
  "/setup",
  "/ai-teammates",
  "/access-control",
  "/agent-playground",
  "/security-audit",
  "/organization-seeding",
  "/connectors",
  "/billing",
  "/policies",
];

export type PrincipalIsolationBag = {
  principal_key: string;
  org_entity_id: string;
  /** Preference / memory fingerprints visible to this principal in this org. */
  fingerprints: string[];
  /** Twin / wallet labels that must not appear for another principal. */
  twin_labels: string[];
};

export function buildPrincipalBag(input: {
  principal_key: string;
  org_entity_id: string;
  fingerprints?: string[];
  twin_labels?: string[];
}): PrincipalIsolationBag {
  return {
    principal_key: (input.principal_key ?? "").trim().toLowerCase(),
    org_entity_id: (input.org_entity_id ?? "").trim(),
    fingerprints: (input.fingerprints ?? []).map((s) => s.trim()).filter(Boolean),
    twin_labels: (input.twin_labels ?? []).map((s) => s.trim()).filter(Boolean),
  };
}

/**
 * Q-01: two principals must not share personal fingerprints or twin labels
 * across users. Same principal is not a zero-leak claim.
 */
export function principalsZeroLeak(
  a: PrincipalIsolationBag,
  b: PrincipalIsolationBag,
): { ok: boolean; reason: string } {
  if (a.principal_key.length === 0 || b.principal_key.length === 0) {
    return { ok: false, reason: "empty principal" };
  }
  if (a.principal_key === b.principal_key) {
    return { ok: false, reason: "same principal — not cross-user claim" };
  }
  if (!preferencesIsolatedAcrossUsers(a.fingerprints, b.fingerprints)) {
    return { ok: false, reason: "fingerprint cross-leak" };
  }
  if (!preferencesIsolatedAcrossUsers(a.twin_labels, b.twin_labels)) {
    return { ok: false, reason: "twin label cross-leak" };
  }
  return { ok: true, reason: "cross-user zero leak" };
}

/**
 * Q-01 tenant facet: different org ids with org-stamped bags must not blend
 * org-bound fingerprints (delegates structural check).
 */
export function tenantsZeroLeak(
  orgA: string,
  orgB: string,
  orgBoundA: string[],
  orgBoundB: string[],
): { ok: boolean; reason: string } {
  const a = (orgA ?? "").trim();
  const b = (orgB ?? "").trim();
  if (a.length === 0 || b.length === 0) {
    return { ok: false, reason: "empty org" };
  }
  if (a === b) {
    return { ok: false, reason: "same tenant — not cross-tenant claim" };
  }
  if (!preferencesIsolatedAcrossUsers(orgBoundA, orgBoundB)) {
    return { ok: false, reason: "org-bound cross-tenant leak" };
  }
  // Also refuse if A's org-bound appears in B's full list
  if (!preferencesIsolatedAcrossUsers(orgBoundA, [...orgBoundB, ...orgBoundB])) {
    return { ok: false, reason: "org-bound leak into peer bag" };
  }
  return { ok: true, reason: "cross-tenant zero leak" };
}

/** Q-02: conversation / twin scope must include both user and org. */
export function twinScopeIsolated(args: {
  userKey: string;
  orgEntityId: string | null | undefined;
  otherUserKey?: string;
  otherOrgEntityId?: string | null;
}): { ok: boolean; scope: string; reason: string } {
  const scope = conversationScopeId(args.userKey, args.orgEntityId);
  if (!scope.includes("::org:") && (args.orgEntityId ?? "").trim().length > 0) {
    return { ok: false, scope, reason: "scope missing org segment" };
  }
  if ((args.otherUserKey ?? "").trim().length > 0) {
    const other = conversationScopeId(args.otherUserKey!, args.otherOrgEntityId);
    if (scope.length > 0 && other.length > 0 && scope === other) {
      return { ok: false, scope, reason: "scopes collided across principals" };
    }
  }
  if (
    (args.otherOrgEntityId ?? "").trim().length > 0 &&
    !isSameOrg(args.orgEntityId, args.otherOrgEntityId)
  ) {
    const otherOrgScope = conversationScopeId(args.userKey, args.otherOrgEntityId);
    if (scope === otherOrgScope && scope.length > 0) {
      return { ok: false, scope, reason: "same scope across orgs" };
    }
  }
  return { ok: true, scope, reason: "twin/conversation scope isolated" };
}

/** Q-02 deep-link: blocked shells must not validate; product deep links may. */
export function deepLinkIsolationCheck(returnTo: string): {
  allowed: boolean;
  blocked_sensitive: boolean;
  validated: boolean;
} {
  const path = (returnTo ?? "").split("?")[0]?.split("#")[0] ?? "";
  let blocked_sensitive = false;
  for (const p of SENSITIVE_SHELL_PREFIXES) {
    if (path === p || path.startsWith(`${p}/`)) {
      blocked_sensitive = true;
      break;
    }
  }
  const validated = isValidatedDeepLink(returnTo);
  // Sensitive shells are never allowed restores even if somehow validated.
  const allowed = validated && !blocked_sensitive;
  return { allowed, blocked_sensitive, validated };
}

export function orgChangeForcesHome(fromOrg: string | null, toOrg: string): boolean {
  return shouldResetOnOrgChange(fromOrg, toOrg);
}

export function zeroLeakStatusLabel(opts: {
  hasOrg: boolean;
  multiTenantSuite: boolean;
}): { label: string; mode: "product_proven" | "suite_residual" } {
  if (opts.multiTenantSuite) {
    return {
      label: "Multi-tenant continuous suite available",
      mode: "product_proven",
    };
  }
  return {
    label: opts.hasOrg
      ? "Product isolation active for this org — continuous multi-tenant suite residual"
      : "Bind an organization to scope isolation",
    mode: "suite_residual",
  };
}
