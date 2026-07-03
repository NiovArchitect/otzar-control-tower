// FILE: view-why.test.tsx
// PURPOSE: Phase 1285-J — lock the shared View/Why model + presenter: identity
//          renders as a canonical label (never a raw UUID), empty rows are
//          dropped, the detected signal renders, and a surface with no richer
//          proof shows an honest note (never a blank panel).
// CONNECTS TO: src/lib/work-os/view-why.ts, src/components/work-os/ViewWhyPanel.tsx

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { mkRecipientGovernance, mkAutonomy } from "../fixtures/comms-governance";
import {
  viewWhyFromLedger,
  viewWhyFromThreadMessage,
  viewWhyFromNotification,
  viewWhyFromAction,
  viewWhyFromCommsFollowUp,
  actionTypeLabel,
} from "@/lib/work-os/view-why";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import type {
  WorkLedgerEntryView,
  DirectThreadMessageView,
  SafeNotificationView,
  SafeActionView,
  CommsSuggestedAction,
} from "@/lib/types/foundation";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

function ledger(over: Partial<WorkLedgerEntryView>): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1",
    org_entity_id: "org",
    ledger_type: "TASK",
    source_type: "CHAT",
    source_command: "Please send the notes",
    conversation_id: null,
    work_plan_id: null,
    project_id: null,
    requester_entity_id: UUID,
    owner_entity_id: UUID,
    target_entity_id: UUID,
    title: "Send the notes",
    summary: null,
    priority: "ROUTINE",
    status: "PROPOSED",
    authority_decision: null,
    policy_reason_code: null,
    extraction_source: "TYPESCRIPT_DETERMINISTIC",
    confidence_score: null,
    evidence: null,
    next_action: null,
    due_at: null,
    created_at: "2026-06-16T00:00:00.000Z",
    updated_at: "2026-06-16T00:00:00.000Z",
    verified_at: null,
    source_message_id: "msg-1",
    ...over,
  } as WorkLedgerEntryView;
}

function msg(over: Partial<DirectThreadMessageView>): DirectThreadMessageView {
  return {
    message_id: "m1",
    sender_entity_id: UUID,
    sender_display_name: "David Odie",
    sender_role_title: null,
    body: "Please send me the notes",
    created_at: "2026-06-16T00:00:00.000Z",
    from_me: false,
    ...over,
  };
}

// ── [GAP-J] the Why panel always answers "where did this come from?" ──
describe("viewWhyFromLedger — source lineage rows (GAP-J)", () => {
  it("a Slack-origin row answers with human copy + author + received time", () => {
    const m = viewWhyFromLedger(
      ledger({
        source_lineage: {
          source_system: "SLACK",
          source_id_present: true,
          has_source_excerpt: true,
          source_actor: "Sadeil Lewis",
          source_timestamp: "2026-07-03T12:00:00.000Z",
        },
      }),
    );
    expect(m.rows.find((r) => r.label === "Came from")?.value).toBe("From Slack");
    expect(m.rows.find((r) => r.label === "Shared by")?.value).toBe("Sadeil Lewis");
    expect(m.rows.find((r) => r.label === "Received")?.value).toBe("2026-07-03T12:00:00.000Z");
    // Backend enums never render as Why copy.
    const values = m.rows.map((r) => r.value).join(" ");
    expect(values).not.toContain("CONNECTOR");
    expect(values).not.toMatch(/\bSLACK\b/);
  });

  it("a Zoom-origin row answers From Zoom recording", () => {
    const m = viewWhyFromLedger(
      ledger({
        source_lineage: {
          source_system: "ZOOM",
          source_id_present: true,
          has_source_excerpt: false,
          source_actor: null,
          source_timestamp: null,
        },
      }),
    );
    expect(m.rows.find((r) => r.label === "Came from")?.value).toBe("From Zoom recording");
    // Null author/time rows are dropped by the presenter (no blank rows).
    expect(m.rows.find((r) => r.label === "Shared by")?.value).toBeNull();
  });

  it("a row with no recorded source answers honestly", () => {
    const m = viewWhyFromLedger(ledger({}));
    expect(m.rows.find((r) => r.label === "Came from")?.value).toBe("Source not recorded yet");
  });
});

describe("viewWhyFromLedger — canonical identity, never a UUID", () => {
  it("renders the display name when resolved", () => {
    const m = viewWhyFromLedger(ledger({ owner_display_name: "David Odie" }));
    const owner = m.rows.find((r) => r.label === "Owner");
    expect(owner?.value).toBe("David Odie");
  });
  it("renders the canonical label (NOT the UUID) when the name is missing", () => {
    const m = viewWhyFromLedger(ledger({}));
    const owner = m.rows.find((r) => r.label === "Owner");
    expect(owner?.value).toBe("Unknown entity");
    expect(owner?.value).not.toBe(UUID);
  });
  it("carries work + provenance (type, status, ledger id, source message)", () => {
    const m = viewWhyFromLedger(ledger({}));
    const byLabel = (l: string) => m.rows.find((r) => r.label === l)?.value;
    expect(byLabel("Type")).toBe("TASK");
    expect(byLabel("Ledger id")).toBe("led-1");
    expect(byLabel("Source message")).toBe("msg-1");
    expect(byLabel("Extraction")).toBe("TYPESCRIPT_DETERMINISTIC");
  });
});

describe("viewWhyFromThreadMessage", () => {
  it("inbound message with a signal carries direction + signal + tracked", () => {
    const m = viewWhyFromThreadMessage(
      msg({ signal: { signal_type: "TASK_REQUEST", confidence: "LOW", evidence_phrase: "please", tracked: true } }),
    );
    expect(m.rows.find((r) => r.label === "From")?.value).toBe("David Odie");
    expect(m.rows.find((r) => r.label === "Direction")?.value).toBe("inbound");
    expect(m.signal?.signal_type).toBe("TASK_REQUEST");
    expect(m.signal?.tracked).toBe(true);
  });
  it("a message with no signal yields an honest proof note (never blank)", () => {
    const m = viewWhyFromThreadMessage(msg({}));
    expect(m.signal).toBeUndefined();
    expect(m.proofNote).toBeTruthy();
  });
});

describe("ViewWhyPanel — renders consistently, no UUID, honest missing state", () => {
  it("drops empty rows and never renders a raw UUID as a label", () => {
    render(<ViewWhyPanel model={viewWhyFromLedger(ledger({}))} />);
    const panel = screen.getByTestId("view-why");
    expect(panel.textContent).toContain("Unknown entity");
    expect(panel.textContent).not.toContain(UUID);
  });
  it("renders the signal line when present", () => {
    render(
      <ViewWhyPanel
        model={viewWhyFromThreadMessage(
          msg({ signal: { signal_type: "BLOCKER", confidence: "MEDIUM", evidence_phrase: "blocked", tracked: false } }),
        )}
      />,
    );
    expect(screen.getByTestId("view-why-signal").textContent?.toLowerCase()).toContain("blocker");
  });
  it("shows the honest proof note when there is no richer proof", () => {
    render(<ViewWhyPanel model={viewWhyFromThreadMessage(msg({}))} />);
    expect(screen.getByTestId("view-why-proof-note")).toBeInTheDocument();
  });
});

describe("actionTypeLabel — robust to DUAL_CONTROL / colon types", () => {
  it("never returns the raw DUAL_CONTROL:... string", () => {
    const label = actionTypeLabel("DUAL_CONTROL:ACTION_CREATE_SEND_INTERNAL_NOTIFICATION");
    expect(label).toBe("Second approval: internal note");
    // The raw machine type never leaks (the only colon is the human "approval:").
    expect(label).not.toContain("DUAL_CONTROL");
    expect(label).not.toContain("ACTION_CREATE");
    expect(label).not.toContain("_");
  });
  it("humanizes plain types", () => {
    expect(actionTypeLabel("SEND_INTERNAL_NOTIFICATION")).toBe("Internal note");
    expect(actionTypeLabel("INVOKE_CONNECTOR")).toBe("Connected tool call");
  });
});

describe("viewWhyFromNotification", () => {
  function notif(over: Partial<SafeNotificationView>): SafeNotificationView {
    return {
      notification_id: UUID,
      action_id: null,
      notification_class: "DIRECT_MESSAGE",
      body_summary: "Please send the notes",
      created_at: "2026-06-16T00:00:00.000Z",
      read_at: null,
      status: "UNREAD",
      sender: { entity_id: UUID, display_name: "David Odie", role_title: null, source_kind: "HUMAN", authority_label: "" },
      ...over,
    };
  }
  it("direct message: From is a canonical name, Type + Policy + Route present", () => {
    const m = viewWhyFromNotification(notif({}), "/app/inbox/abc");
    const byLabel = (l: string) => m.rows.find((r) => r.label === l)?.value;
    expect(byLabel("From")).toBe("David Odie");
    expect(byLabel("Type")).toBe("Direct message");
    expect(byLabel("Route")).toBe("/app/inbox/abc");
    expect(byLabel("Policy")).toContain("Internal Otzar inbox only");
  });
  it("unresolved sender → canonical label, never a UUID", () => {
    const m = viewWhyFromNotification(
      notif({ sender: { entity_id: UUID, display_name: "", role_title: null, source_kind: "HUMAN", authority_label: "" } }),
    );
    const from = m.rows.find((r) => r.label === "From");
    expect(from?.value).toBe("Unknown entity");
    expect(from?.value).not.toBe(UUID);
  });
});

describe("viewWhyFromAction — safe fields only, governed note", () => {
  function action(over: Partial<SafeActionView>): SafeActionView {
    return {
      action_id: "act-1",
      status: "PROPOSED",
      action_type: "DUAL_CONTROL:ACTION_CREATE_SEND_INTERNAL_NOTIFICATION",
      risk_tier: "MEDIUM",
      requires_approval: true,
      created_at: "2026-06-16T00:00:00.000Z",
      updated_at: "2026-06-16T00:00:00.000Z",
      ...over,
    };
  }
  it("kind is human-readable (not raw DUAL_CONTROL); risk + governed note present", () => {
    const m = viewWhyFromAction(action({}), { title: "Internal note", recipientLabel: "David Odie", body: "hi" });
    const byLabel = (l: string) => m.rows.find((r) => r.label === l)?.value;
    expect(byLabel("Kind")).toBe("Second approval: internal note");
    expect(byLabel("Risk")).toBe("Medium risk");
    expect(byLabel("Recipient")).toBe("David Odie");
    expect(m.proofNote?.toLowerCase()).toContain("governed");
  });
});

describe("viewWhyFromCommsFollowUp", () => {
  function follow(over: Partial<CommsSuggestedAction>): CommsSuggestedAction {
    return {
      local_id: "f1",
      action_type: "SEND_INTERNAL_NOTIFICATION",
      target: { display_name: "David Odie", email: null, entity_id: UUID },
      draft_text: "Please send the notes",
      reason: "Otzar drafted this from the capture.",
      source_excerpt: "send me the notes",
      confidence: "HIGH",
      resolution_status: "RESOLVED",
      recipient_governance: mkRecipientGovernance({ entity_id: UUID, display_name: "David Odie" }),
          autonomy: mkAutonomy(),
      ...over,
    };
  }
  it("surfaces target/source/confidence/extraction", () => {
    const m = viewWhyFromCommsFollowUp(follow({}), "LLM");
    const byLabel = (l: string) => m.rows.find((r) => r.label === l)?.value;
    expect(byLabel("Target")).toBe("David Odie");
    expect(byLabel("Source")).toContain("send me the notes");
    expect(byLabel("Confidence")).toBe("high");
    expect(byLabel("Extraction")).toBe("AI (Python/LLM)");
  });
  it("honest note when no source excerpt", () => {
    const m = viewWhyFromCommsFollowUp(follow({ source_excerpt: null }), "LOCAL_FALLBACK");
    expect(m.proofNote).toBeTruthy();
  });

  // ── [GAP-A] correction provenance in human words, inside "Why" only ────────
  const whyPerson = (over: Partial<CommsSuggestedAction>) =>
    viewWhyFromCommsFollowUp(follow(over), "LLM").rows.find(
      (r) => r.label === "Why this person",
    )?.value ?? null;

  it("a prior team SELECT reads as 'Matched from a previous team choice' with the approval caveat", () => {
    const v = whyPerson({
      recipient_governance: mkRecipientGovernance({
        recipientSafety: "likely",
        evidence: {
          quote: null,
          source: "correction_memory",
          matchedToken: "priya",
          alternativeCandidates: ["Priya Menon"],
        },
      }),
    });
    expect(v).toBe("Matched from a previous team choice. Approval rules still apply.");
  });

  it("a prior team CONFIRM reads as 'Previously confirmed by your team' (no caveat once confirmed)", () => {
    const v = whyPerson({
      recipient_governance: mkRecipientGovernance({
        recipientSafety: "confirmed",
        evidence: {
          quote: null,
          source: "caller_confirmed",
          matchedToken: null,
          alternativeCandidates: [],
        },
      }),
    });
    expect(v).toBe("Previously confirmed by your team.");
  });

  it("a boundary state is framed as the boundary, never as confidence", () => {
    const v = whyPerson({
      recipient_governance: mkRecipientGovernance({
        recipientSafety: "cross_team_needs_approval",
        evidence: {
          quote: null,
          source: "caller_confirmed",
          matchedToken: null,
          alternativeCandidates: [],
        },
      }),
    });
    expect(v).toBe("Prior context found, but this still needs approval.");
  });

  it("normal transcript/mention proof renders NO correction provenance", () => {
    expect(whyPerson({})).toBeNull(); // fixture default: explicit_mention
  });

  it("no backend vocabulary ever reaches the rendered rows", () => {
    const m = viewWhyFromCommsFollowUp(
      follow({
        recipient_governance: mkRecipientGovernance({
          recipientSafety: "likely",
          evidence: {
            quote: null,
            source: "correction_memory",
            matchedToken: "priya",
            alternativeCandidates: [],
          },
        }),
      }),
      "LLM",
    );
    const rendered = m.rows.map((r) => `${r.label} ${String(r.value ?? "")}`).join(" ");
    for (const banned of [
      "correction_memory",
      "caller_confirmed",
      "evidence.source",
      "FOLLOW_UP",
      "ledger",
      "prior correction from your organization",
    ]) {
      expect(rendered).not.toContain(banned);
    }
  });
});
