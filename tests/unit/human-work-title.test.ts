// FILE: human-work-title.test.ts
// PURPOSE: Slice 2 — vague follow-ups and clarity lanes.

import { describe, expect, it } from "vitest";
import {
  canMarkCompleteSafely,
  humanWorkTitle,
  isVagueWorkTitle,
  workClarityState,
} from "../../src/lib/work-os/human-work-title";
import { bucketFor } from "../../src/lib/work-os/work-buckets";
import type { WorkLedgerEntryView } from "../../src/lib/types/foundation";

function entry(
  partial: Partial<WorkLedgerEntryView> & { title: string },
): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1",
    org_entity_id: "org-1",
    ledger_type: "FOLLOW_UP",
    source_type: "TRANSCRIPT",
    source_command: null,
    conversation_id: null,
    work_plan_id: null,
    project_id: null,
    requester_entity_id: null,
    owner_entity_id: null,
    target_entity_id: null,
    summary: null,
    priority: "NORMAL",
    status: "OPEN",
    authority_decision: null,
    policy_reason_code: null,
    extraction_source: "DETERMINISTIC",
    confidence_score: null,
    evidence: null,
    next_action: null,
    due_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    verified_at: null,
    ...partial,
  } as WorkLedgerEntryView;
}

describe("human-work-title", () => {
  it("flags generic follow-ups as vague", () => {
    expect(isVagueWorkTitle("Follow up with Ava")).toBe(true);
    expect(isVagueWorkTitle("Follow up with Casey")).toBe(true);
    expect(isVagueWorkTitle("Complete security checklist before interview")).toBe(
      false,
    );
  });

  it("humanizes vague follow-up titles", () => {
    expect(humanWorkTitle("Follow up with Ava")).toMatch(/Ask Ava/);
  });

  it("buckets vague / PROPOSED into Suggested work, not Waiting", () => {
    expect(bucketFor(entry({ title: "Follow up with Riley", status: "OPEN" }))).toBe(
      "Suggested work",
    );
    expect(bucketFor(entry({ title: "Solid title", status: "PROPOSED" }))).toBe(
      "Suggested work",
    );
  });

  it("buckets ready work into Do now", () => {
    expect(
      bucketFor(
        entry({
          title: "Complete the security checklist before interview invite",
          status: "OPEN",
          ledger_type: "TASK",
        }),
      ),
    ).toBe("Do now");
  });

  it("blocks mark complete on vague titles", () => {
    expect(
      canMarkCompleteSafely(
        entry({ title: "Follow up with Sam", can_complete: true, status: "OPEN" }),
      ),
    ).toBe(false);
    expect(
      canMarkCompleteSafely(
        entry({
          title: "Send interview invite after security is green",
          can_complete: true,
          status: "OPEN",
        }),
      ),
    ).toBe(true);
  });

  it("maps PROPOSED clarity to Suggested work", () => {
    expect(
      workClarityState(entry({ title: "Anything", status: "PROPOSED" })),
    ).toBe("Suggested work");
  });
});
