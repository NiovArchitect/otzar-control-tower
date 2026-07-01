// FILE: tests/unit/today-attention.test.ts
// PURPOSE: PROD-UX-P0B — Today's attention is backed by real signals, counts match,
//          and each item deep-links to the surface that resolves it. No dead cards.
import { describe, expect, it } from "vitest";
import { deriveTodayAttention } from "../../src/lib/work-os/today-attention";
import type { MyDayIntelligenceView } from "../../src/lib/types/foundation";

function view(signals: Partial<MyDayIntelligenceView["signals"]> = {}): MyDayIntelligenceView {
  return {
    headline: "Here's what needs your attention.",
    suggestions: [],
    signals: {
      proposed_actions_count: 0, recent_action_count: 0, unread_notifications_count: 0,
      collaboration_inbox_pending_count: 0, collaboration_needs_approval_count: 0,
      collaboration_blocked_count: 0, active_authority_grants_count: 0, expiring_soon_grants_count: 0,
      sensitive_case_by_case_grants_count: 0, active_project_count: 0, open_commitments_owned_count: 0,
      waiting_on_external_count: 0, owed_to_external_count: 0, most_recent_action_at: null,
      most_recent_collaboration_at: null,
      ...signals,
    },
    waiting_on_external: { they_owe_us_count: 0, we_owe_them_count: 0 },
    provider_status: "OK" as MyDayIntelligenceView["provider_status"],
    generated_at: "2026-07-01T00:00:00.000Z",
  };
}

describe("deriveTodayAttention", () => {
  it("no signals → no items, no primary link (no dead card)", () => {
    const a = deriveTodayAttention(view());
    expect(a.items).toHaveLength(0);
    expect(a.total).toBe(0);
    expect(a.primaryTo).toBeNull();
  });

  it("a single approval → one item that deep-links to Action Center", () => {
    const a = deriveTodayAttention(view({ collaboration_needs_approval_count: 1 }));
    expect(a.items).toHaveLength(1);
    expect(a.total).toBe(1);
    expect(a.items[0]!.to).toBe("/app/action-center");
    expect(a.items[0]!.text).toMatch(/1 approval is waiting/);
    expect(a.primaryTo).toBe("/app/action-center"); // single → headline deep-links
  });

  it("multiple kinds → each routes; count sums real data; no single primary link", () => {
    const a = deriveTodayAttention(view({ collaboration_needs_approval_count: 2, collaboration_blocked_count: 1, unread_notifications_count: 3 }));
    const kinds = a.items.map((i) => i.kind);
    expect(kinds).toEqual(["approval", "blocked", "reply"]);
    expect(a.total).toBe(6); // 2 + 1 + 3
    expect(a.primaryTo).toBeNull(); // ambiguous → open the filtered workbench instead
    expect(a.items.every((i) => i.to.startsWith("/app/"))).toBe(true);
  });

  it("replies combine unread + collaboration inbox and route to Comms", () => {
    const a = deriveTodayAttention(view({ unread_notifications_count: 2, collaboration_inbox_pending_count: 1 }));
    expect(a.items).toHaveLength(1);
    expect(a.items[0]!.kind).toBe("reply");
    expect(a.items[0]!.count).toBe(3);
    expect(a.items[0]!.to).toBe("/app/comms");
  });
});
