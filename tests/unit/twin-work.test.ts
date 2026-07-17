// FILE: twin-work.test.ts
// PURPOSE: [C.3] Pure helpers for active Twin work-claim rows.
// CONNECTS TO: src/lib/work-os/twin-work.ts.

import { describe, expect, it } from "vitest";
import {
  activeTwinWorkItems,
  isActiveTwinWork,
  twinAccuracyLabel,
  twinWorkStateLabel,
} from "@/lib/work-os/twin-work";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";

function entry(
  partial: Partial<WorkLedgerEntryView> & { title: string },
): WorkLedgerEntryView {
  return {
    ledger_entry_id: partial.ledger_entry_id ?? "le-1",
    ledger_type: "TASK",
    source_type: "TRANSCRIPT",
    source_command: null,
    work_plan_id: null,
    requester_entity_id: null,
    owner_entity_id: null,
    target_entity_id: null,
    title: partial.title,
    status: partial.status ?? "EXECUTING",
    priority: "ROUTINE",
    extraction_source: "TRANSCRIPT",
    next_action: null,
    due_at: null,
    created_at: "2026-07-16T00:00:00.000Z",
    twin_work: partial.twin_work,
  };
}

describe("twin-work helpers", () => {
  it("treats CLAIMED_WORKING / NEEDS_CLARITY / COLLAB as active", () => {
    expect(
      isActiveTwinWork({
        state: "CLAIMED_WORKING",
        work_kind: "DOCUMENT",
        accuracy_class: "STANDARD",
        requires_verification: false,
        claimed_at: null,
        web_view_link: null,
        clarity_question: null,
      }),
    ).toBe(true);
    expect(
      isActiveTwinWork({
        state: "COMPLETED",
        work_kind: "DOCUMENT",
        accuracy_class: "STANDARD",
        requires_verification: false,
        claimed_at: null,
        web_view_link: null,
        clarity_question: null,
      }),
    ).toBe(false);
    expect(isActiveTwinWork(undefined)).toBe(false);
  });

  it("filters active twin claims from my-work items", () => {
    const items = [
      entry({
        title: "Pilot slides",
        twin_work: {
          state: "CLAIMED_WORKING",
          work_kind: "DOCUMENT",
          accuracy_class: "STANDARD",
          requires_verification: false,
          claimed_at: "2026-07-16T12:00:00.000Z",
          web_view_link: null,
          clarity_question: null,
        },
      }),
      entry({
        title: "Done form",
        twin_work: {
          state: "COMPLETED",
          work_kind: "DOCUMENT",
          accuracy_class: "INSURANCE",
          requires_verification: true,
          claimed_at: null,
          web_view_link: null,
          clarity_question: null,
        },
      }),
      entry({ title: "No twin" }),
    ];
    const active = activeTwinWorkItems(items);
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe("Pilot slides");
  });

  it("labels accuracy only for regulated classes", () => {
    expect(twinAccuracyLabel("INSURANCE")).toBe("Insurance accuracy");
    expect(twinAccuracyLabel("STANDARD")).toBeNull();
    expect(twinWorkStateLabel("CLAIMED_WORKING")).toMatch(/working/i);
  });
});
