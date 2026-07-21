// FILE: tests/unit/cross-tenant-isolation.test.ts
// PURPOSE: Q-01 / Q-02 — zero-leak math + deep-link + twin scope isolation.

import { describe, expect, it } from "vitest";
import {
  Q01_DOCTRINE,
  Q02_DOCTRINE,
  ZERO_LEAK_FACETS,
  buildPrincipalBag,
  deepLinkIsolationCheck,
  orgChangeForcesHome,
  principalsZeroLeak,
  tenantsZeroLeak,
  twinScopeIsolated,
  zeroLeakStatusLabel,
} from "@/lib/work-os/cross-tenant-isolation";

describe("Q-01 / Q-02 cross-tenant isolation", () => {
  it("states zero-leak and multi-org twin doctrines with four facets", () => {
    expect(Q01_DOCTRINE).toMatch(/never leak/i);
    expect(Q01_DOCTRINE).toMatch(/fail-closed/i);
    expect(Q02_DOCTRINE).toMatch(/separate org-bound Twin/i);
    expect(ZERO_LEAK_FACETS.map((f) => f.id)).toEqual([
      "tenant",
      "user",
      "twin",
      "deeplink",
    ]);
  });

  it("proves cross-user fingerprint zero leak", () => {
    const a = buildPrincipalBag({
      principal_key: "alice@example.com",
      org_entity_id: "org-1",
      fingerprints: ["Always lead with decision and impact for project briefs"],
      twin_labels: ["Alice personal briefing tone prefers concise"],
    });
    const b = buildPrincipalBag({
      principal_key: "bob@example.com",
      org_entity_id: "org-1",
      fingerprints: ["Send weekly status Fridays before noon"],
      twin_labels: ["Bob prefers detailed weekly rollups"],
    });
    expect(principalsZeroLeak(a, b).ok).toBe(true);

    const leak = buildPrincipalBag({
      principal_key: "bob@example.com",
      org_entity_id: "org-1",
      fingerprints: [
        "Always lead with decision and impact for project briefs",
      ],
      twin_labels: [],
    });
    expect(principalsZeroLeak(a, leak).ok).toBe(false);
    expect(principalsZeroLeak(a, a).ok).toBe(false);
  });

  it("proves cross-tenant org-bound zero leak", () => {
    expect(
      tenantsZeroLeak(
        "org-a",
        "org-b",
        ["Confidential Acme renewal playbook steps"],
        ["BetaCorp vendor review checklist weekly"],
      ).ok,
    ).toBe(true);
    expect(
      tenantsZeroLeak(
        "org-a",
        "org-b",
        ["Confidential Acme renewal playbook steps"],
        ["Confidential Acme renewal playbook steps"],
      ).ok,
    ).toBe(false);
    expect(tenantsZeroLeak("org-a", "org-a", ["x"], ["y"]).ok).toBe(false);
  });

  it("isolates twin/conversation scopes across users and orgs", () => {
    const r = twinScopeIsolated({
      userKey: "alice@example.com",
      orgEntityId: "org-a",
      otherUserKey: "bob@example.com",
      otherOrgEntityId: "org-a",
    });
    expect(r.ok).toBe(true);
    expect(r.scope).toMatch(/alice@example.com::org:org-a/);

    const crossOrg = twinScopeIsolated({
      userKey: "alice@example.com",
      orgEntityId: "org-a",
      otherOrgEntityId: "org-b",
    });
    expect(crossOrg.ok).toBe(true);
  });

  it("blocks sensitive deep-link restores and allows product paths", () => {
    expect(deepLinkIsolationCheck("/users").allowed).toBe(false);
    expect(deepLinkIsolationCheck("/users").blocked_sensitive).toBe(true);
    expect(deepLinkIsolationCheck("/setup").blocked_sensitive).toBe(true);
    expect(deepLinkIsolationCheck("/billing").allowed).toBe(false);
    expect(deepLinkIsolationCheck("/app/action-center").allowed).toBe(true);
    expect(deepLinkIsolationCheck("/app/my-twin").allowed).toBe(true);
    expect(deepLinkIsolationCheck("/app").allowed).toBe(false); // Home is not restore
  });

  it("forces Home on org change and labels suite residual", () => {
    expect(orgChangeForcesHome("org-a", "org-b")).toBe(true);
    expect(orgChangeForcesHome("org-a", "org-a")).toBe(false);
    expect(zeroLeakStatusLabel({ hasOrg: true, multiTenantSuite: false }).mode).toBe(
      "suite_residual",
    );
  });
});
