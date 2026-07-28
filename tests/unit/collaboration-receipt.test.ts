// FILE: collaboration-receipt.test.ts
// PURPOSE: Human-readable collaboration receipt — no UUID primary, COMPLETED first.

import { describe, expect, it } from "vitest";
import {
  buildCollaborationReceipt,
  selectCollaborationReceipts,
} from "@/lib/work-os/collaboration-receipt";
import type { CollaborationRequestSafeView } from "@/lib/types/foundation";

function row(
  partial: Partial<CollaborationRequestSafeView> & {
    collaboration_id: string;
    state: CollaborationRequestSafeView["state"];
  },
): CollaborationRequestSafeView {
  return {
    collaboration_id: partial.collaboration_id,
    target_type: partial.target_type ?? "EMPLOYEE_TWIN",
    request_type: partial.request_type ?? "CONTEXT_REQUEST",
    state: partial.state,
    sensitivity_class: partial.sensitivity_class ?? "LOW",
    safe_summary:
      partial.safe_summary ??
      "David needed Annie’s validated research before engineering work.",
    requested_by_ai: partial.requested_by_ai ?? true,
    requires_approval: partial.requires_approval ?? false,
    blocked_reason: partial.blocked_reason ?? null,
    has_target_entity: partial.has_target_entity ?? false,
    has_target_twin: partial.has_target_twin ?? true,
    has_target_team: partial.has_target_team ?? false,
    has_target_project: partial.has_target_project ?? false,
    expires_at: partial.expires_at ?? null,
    completed_at: partial.completed_at ?? "2026-07-27T12:00:20.000Z",
    created_at: partial.created_at ?? "2026-07-27T12:00:00.000Z",
  };
}

describe("collaboration receipt", () => {
  it("builds WHO/WHY/RESULT without exposing internal policy jargon as primary", () => {
    const r = buildCollaborationReceipt(
      row({
        collaboration_id: "8e46a8e6-9033-485c-af52-6d03c37b5bfd",
        state: "COMPLETED",
      }),
    );
    expect(r.title).toMatch(/AI Teammate/i);
    expect(r.who_collaborated.length).toBeGreaterThan(0);
    expect(r.why).toMatch(/research/i);
    expect(r.what_was_excluded).toMatch(/Private personal memory/i);
    expect(r.result).toMatch(/finished|Downstream/i);
    expect(r.time_label).toMatch(/second|minute|Completed|About/i);
    expect(r.proof_path).toContain("/app/collaboration");
    // UUID is retained for progressive disclosure only — not the title.
    expect(r.title).not.toContain("8e46a8e6");
  });

  it("prefers COMPLETED rows in selectCollaborationReceipts", () => {
    const items = selectCollaborationReceipts(
      [
        row({ collaboration_id: "a", state: "IN_PROGRESS", completed_at: null }),
        row({ collaboration_id: "b", state: "COMPLETED" }),
      ],
      2,
    );
    expect(items[0]?.collaboration_id).toBe("b");
    expect(items[0]?.state).toBe("COMPLETED");
  });
});
