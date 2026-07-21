// FILE: tests/unit/multi-org-memory-isolation.test.ts
// PURPOSE: I-02 — multi-org memory isolation math + client switch contract.

import { describe, expect, it } from "vitest";
import {
  BLENDABLE_CLIENT_BUCKETS,
  I02_DOCTRINE,
  I02_ISOLATION_RULES,
  buildOrgScopedBag,
  clientIsolationAfterOrgSwitch,
  detectOrgBoundBlend,
  multiOrgStatusLabel,
  orgBoundIsolatedAcrossOrgs,
} from "@/lib/work-os/multi-org-memory-isolation";
import { ORG_SWITCH_CLEAR_BUCKETS } from "@/lib/auth/org-switch";

describe("I-02 multi-org memory isolation", () => {
  it("states doctrine and four isolation rules", () => {
    expect(I02_DOCTRINE).toMatch(/many organizations/i);
    expect(I02_DOCTRINE).toMatch(/never silently blend/i);
    expect(I02_ISOLATION_RULES).toHaveLength(4);
    expect(I02_ISOLATION_RULES.map((r) => r.id)).toEqual([
      "org_bound_stays",
      "portable_not_silent",
      "switch_resets_client",
      "twin_per_org",
    ]);
  });

  it("builds org-scoped bags with portable vs org-bound split", () => {
    const bag = buildOrgScopedBag("org-a", [
      { safe_summary: "[portable] Prefer bullets in status" },
      { safe_summary: "[org-bound] Acme escalation path for renewals" },
      { safe_summary: "Draft before external send" },
    ]);
    expect(bag.org_entity_id).toBe("org-a");
    expect(bag.portable).toContain("Prefer bullets in status");
    expect(bag.portable).toContain("Draft before external send");
    expect(bag.org_bound).toEqual(["Acme escalation path for renewals"]);
    expect(bag.fingerprints).toHaveLength(3);
  });

  it("isolates org-bound fingerprints across distinct orgs", () => {
    const a = buildOrgScopedBag("org-a", [
      { safe_summary: "[org-bound] Confidential Acme renewal playbook steps" },
      { safe_summary: "[portable] Prefer short emails for async" },
    ]);
    const b = buildOrgScopedBag("org-b", [
      { safe_summary: "[org-bound] BetaCorp vendor review checklist weekly" },
      { safe_summary: "[portable] Prefer short emails for async" },
    ]);
    expect(orgBoundIsolatedAcrossOrgs(a, b)).toBe(true);
    expect(detectOrgBoundBlend(a, b)).toEqual([]);

    const blended = buildOrgScopedBag("org-b", [
      {
        safe_summary:
          "[org-bound] Confidential Acme renewal playbook steps",
      },
    ]);
    expect(orgBoundIsolatedAcrossOrgs(a, blended)).toBe(false);
    expect(detectOrgBoundBlend(a, blended).length).toBeGreaterThan(0);
  });

  it("rejects same-org as multi-org isolation claim", () => {
    const a = buildOrgScopedBag("org-a", [
      { safe_summary: "[org-bound] Only in A confidential path" },
    ]);
    const same = buildOrgScopedBag("org-a", [
      { safe_summary: "[org-bound] Different content same org" },
    ]);
    expect(orgBoundIsolatedAcrossOrgs(a, same)).toBe(false);
  });

  it("requires all org-switch clear buckets for client isolation", () => {
    expect([...BLENDABLE_CLIENT_BUCKETS].sort()).toEqual(
      [...ORG_SWITCH_CLEAR_BUCKETS].sort(),
    );
    const ok = clientIsolationAfterOrgSwitch({
      fromOrgId: "org-a",
      toOrgId: "org-b",
      clearedBuckets: [...BLENDABLE_CLIENT_BUCKETS],
    });
    expect(ok.isolated).toBe(true);

    const missing = clientIsolationAfterOrgSwitch({
      fromOrgId: "org-a",
      toOrgId: "org-b",
      clearedBuckets: ["conversation_scope"],
    });
    expect(missing.isolated).toBe(false);
    expect(missing.reason).toMatch(/missing clear/);

    const same = clientIsolationAfterOrgSwitch({
      fromOrgId: "org-a",
      toOrgId: "org-a",
      clearedBuckets: [],
    });
    expect(same.isolated).toBe(true);
    expect(same.reason).toMatch(/same org/);
  });

  it("labels single vs multi-org status honestly", () => {
    expect(multiOrgStatusLabel(1).mode).toBe("single_org");
    expect(multiOrgStatusLabel(1).label).toMatch(/Single organization/i);
    expect(multiOrgStatusLabel(2).mode).toBe("multi_org");
    expect(multiOrgStatusLabel(2).label).toMatch(/Multi-org/i);
  });
});
