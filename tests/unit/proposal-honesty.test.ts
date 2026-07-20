// FILE: tests/unit/proposal-honesty.test.ts
// PURPOSE: E-02 — source, confidence, alternatives, admin confirm.

import { describe, expect, it } from "vitest";
import {
  buildProposalAlternatives,
  buildProposalHonestyView,
  isAuthorityAffectingSeedType,
  mayAutoApplyProposal,
  normalizeProposalConfidence,
} from "@/lib/work-os/proposal-honesty";

describe("E-02 proposal honesty", () => {
  it("normalizes confidence", () => {
    expect(normalizeProposalConfidence("HIGH")).toBe("high");
    expect(normalizeProposalConfidence("medium")).toBe("medium");
    expect(normalizeProposalConfidence("")).toBe("unknown");
  });

  it("marks hierarchy and access as authority-affecting", () => {
    expect(isAuthorityAffectingSeedType("set_manager")).toBe(true);
    expect(isAuthorityAffectingSeedType("grant_tool_access")).toBe(true);
    expect(isAuthorityAffectingSeedType("review_external_party")).toBe(true);
  });

  it("preserves source and never invents evidence", () => {
    const withSource = buildProposalHonestyView({
      seed_id: "s1",
      seed_type: "set_manager",
      source_evidence: "Said in standup that Jordan reports to Sam",
      confidence: "high",
    });
    expect(withSource.source).toMatch(/Jordan/);
    expect(withSource.source_missing).toBe(false);
    expect(withSource.requires_admin_confirm).toBe(true);

    const missing = buildProposalHonestyView({
      seed_id: "s2",
      seed_type: "set_manager",
      source_evidence: null,
      confidence: "low",
    });
    expect(missing.source_missing).toBe(true);
    expect(missing.source).toBeNull();
  });

  it("always includes hold and dismiss alternatives", () => {
    const alts = buildProposalAlternatives({
      seed_id: "s3",
      seed_type: "grant_tool_access",
      recommended_action: "Enable Slack for Alex",
    });
    expect(alts.some((a) => a.kind === "primary")).toBe(true);
    expect(alts.some((a) => a.id === "hold")).toBe(true);
    expect(alts.some((a) => a.id === "reject")).toBe(true);
  });

  it("includes possible_matches as alternatives", () => {
    const alts = buildProposalAlternatives({
      seed_id: "s4",
      seed_type: "review_external_party",
      possible_matches: [
        {
          external_collaborator_id: "e1",
          display_label: "Acme Co",
          reason: "same domain",
        },
      ],
    });
    expect(alts.some((a) => a.id.startsWith("match:"))).toBe(true);
    expect(alts.some((a) => a.id === "track-new")).toBe(true);
  });

  it("never auto-applies proposals", () => {
    expect(
      mayAutoApplyProposal({
        seed_id: "s5",
        seed_type: "set_manager",
        confidence: "high",
        status: "SEED_PROPOSED",
      }),
    ).toBe(false);
  });
});
