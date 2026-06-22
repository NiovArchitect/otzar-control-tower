// FILE: tests/unit/voice-approval-safety-ui.test.tsx
// PURPOSE: Phase OTZAR-RETURN-5 — the Voice page gates privileged voice routes
//          behind an explicit LOCAL confirm. Proves: informational routes show
//          no privileged action; comms/approval/action_runtime show
//          "confirmation required" with Confirm/Decline; confirming locally
//          says no external write was performed; declining says declined; and
//          the surface never makes a false execution claim (sent/approved/
//          completed/created reminder). No external API is called.
// CONNECTS TO: src/pages/app/Voice.tsx, src/lib/voice/voice-approval-safety.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Voice } from "@/pages/app/Voice";
import { useAuthStore } from "@/lib/stores/auth";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function renderVoice() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Voice />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function typeTranscript(text: string) {
  const user = userEvent.setup();
  renderVoice();
  await screen.findByTestId("ambient-capture-card");
  const textarea = screen.getByLabelText(/message to otzar/i);
  await user.type(textarea, text);
  return user;
}

beforeEach(() => setAuth());

describe("Voice page — confirm-before-act safety", () => {
  it("1. an Ask Twin route shows no privileged action proposed", async () => {
    await typeTranscript("ask twin what I committed to");
    const copy = await screen.findByTestId("voice-confirmation-copy");
    expect(copy).toHaveTextContent(/no privileged action is proposed/i);
    expect(screen.queryByTestId("voice-confirm-local")).toBeNull();
  });

  it("2. a Comms route shows confirmation required with local Confirm/Decline", async () => {
    await typeTranscript("reply to David about the deck");
    expect(await screen.findByTestId("voice-confirmation-copy")).toHaveTextContent(
      /confirmation required/i,
    );
    expect(screen.getByTestId("voice-confirm-local")).toBeInTheDocument();
    expect(screen.getByTestId("voice-decline-local")).toBeInTheDocument();
    expect(screen.getByTestId("voice-safety-level")).toHaveAttribute(
      "data-safety-level",
      "confirm_required",
    );
  });

  it("3. an Approval route shows confirmation required", async () => {
    await typeTranscript("approve the budget request");
    expect(await screen.findByTestId("voice-confirmation-copy")).toHaveTextContent(
      /confirmation required/i,
    );
    expect(screen.getByTestId("voice-confirm-local")).toBeInTheDocument();
  });

  it("4. an Action Runtime route shows confirmation required", async () => {
    await typeTranscript("create a task for the deck");
    expect(await screen.findByTestId("voice-confirmation-copy")).toHaveTextContent(
      /confirmation required/i,
    );
    expect(screen.getByTestId("voice-confirm-local")).toBeInTheDocument();
  });

  it("5. Confirm locally updates copy to no external write performed", async () => {
    const user = await typeTranscript("reply to David about the deck");
    await user.click(screen.getByTestId("voice-confirm-local"));
    expect(await screen.findByTestId("voice-confirmation-copy")).toHaveTextContent(
      /no external write has been performed/i,
    );
    // The confirm/decline buttons are gone once decided.
    expect(screen.queryByTestId("voice-confirm-local")).toBeNull();
  });

  it("6. Decline updates copy to voice action declined", async () => {
    const user = await typeTranscript("approve the budget request");
    await user.click(screen.getByTestId("voice-decline-local"));
    expect(await screen.findByTestId("voice-confirmation-copy")).toHaveTextContent(
      /voice action declined/i,
    );
  });

  it("7. an empty transcript shows no executable safety action", async () => {
    renderVoice();
    await screen.findByTestId("ambient-capture-card");
    expect(screen.queryByTestId("voice-safety-card")).toBeNull();
    expect(screen.queryByTestId("voice-confirm-local")).toBeNull();
  });

  it("8. the safety surface never makes a false execution claim", async () => {
    const user = await typeTranscript("reply to David about the deck");
    await user.click(screen.getByTestId("voice-confirm-local"));
    const card = await screen.findByTestId("voice-safety-card");
    const text = (card.textContent ?? "").toLowerCase();
    // No false past-tense execution claims.
    expect(text).not.toMatch(/\bsent\b/);
    expect(text).not.toMatch(/\bapproved\b/);
    expect(text).not.toMatch(/\bcompleted\b/);
    expect(text).not.toContain("created reminder");
    expect(text).not.toContain("message sent");
    // It DOES honestly state no external write happened.
    expect(text).toContain("no external write has been performed");
  });
});
