// [OTZAR-LIVE-6] Card feedback: every async card action shows an in-flight state
// (Sending… / Saving…) and hides its button so there is no silent-no-feedback gap.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TranscriptActionReview } from "@/components/otzar/TranscriptActionReview";
import type { TranscriptProposedAction } from "@/lib/work-os/transcript-actions";

function action(
  overrides: Partial<TranscriptProposedAction> = {},
): TranscriptProposedAction {
  return {
    id: "pa-1",
    kind: "send_request",
    title: "Blocker",
    body: "review the API keys",
    sourceKind: "blocker",
    confidence: 0.7,
    status: "proposed",
    ...overrides,
  };
}

const noop = (): void => {};

describe("[OTZAR-LIVE-6] TranscriptActionReview card feedback", () => {
  it("'sending' shows 'Sending…' and hides the Send button (in-flight feedback)", () => {
    render(
      <TranscriptActionReview
        actions={[action({ status: "sending" })]}
        onSave={noop}
        onSend={noop}
        onDismiss={noop}
        onAsk={noop}
      />,
    );
    expect(screen.getByTestId("transcript-action-status").textContent).toMatch(/Sending/);
    expect(screen.queryByTestId("transcript-action-send")).toBeNull();
  });

  it("'saving' shows 'Saving…' and hides the Save button", () => {
    render(
      <TranscriptActionReview
        actions={[action({ kind: "save_follow_up", sourceKind: "follow_up", status: "saving" })]}
        onSave={noop}
        onSend={noop}
        onDismiss={noop}
        onAsk={noop}
      />,
    );
    expect(screen.getByTestId("transcript-action-status").textContent).toMatch(/Saving/);
    expect(screen.queryByTestId("transcript-action-save")).toBeNull();
  });

  it("'proposed' still shows the action button (no premature status text)", () => {
    render(
      <TranscriptActionReview
        actions={[action({ status: "proposed" })]}
        onSave={noop}
        onSend={noop}
        onDismiss={noop}
        onAsk={noop}
      />,
    );
    expect(screen.getByTestId("transcript-action-send")).toBeTruthy();
    expect(screen.queryByTestId("transcript-action-status")).toBeNull();
  });
});
