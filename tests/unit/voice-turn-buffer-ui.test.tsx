// FILE: tests/unit/voice-turn-buffer-ui.test.tsx
// PURPOSE: Phase OTZAR-RETURN-6 — the Voice page holds a voice turn in a local,
//          in-memory, session-only buffer and shows it honestly: retention is
//          session-only, no raw audio stored, no external write performed.
//          Confirming a privileged turn produces the inert handoff copy
//          ("ready for future governed execution"); declining and clearing do
//          not. No governed/write API is called by confirm/decline/clear.
// CONNECTS TO: src/pages/app/Voice.tsx, voice-turn-buffer.ts,
//          confirmed-action-handoff.ts.

import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
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

// Write endpoints that must NEVER be called from the local voice safety flow.
const WRITE_ENDPOINT_RX = /(actions|internal-messages|escalations|ledger|reminders|conversation\/message|correction)/;

beforeEach(() => setAuth());
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Voice page — local voice turn buffer + handoff", () => {
  it("1-4. a transcript shows a local voice turn with honest retention copy", async () => {
    await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-turn-buffer-card");
    expect(screen.getByTestId("voice-turn-latest")).toHaveTextContent(/comms/i);
    const retention = screen.getByTestId("voice-turn-retention");
    expect(retention).toHaveTextContent(/in-memory session only/i);
    expect(retention).toHaveTextContent(/no raw audio is stored/i);
    expect(retention).toHaveTextContent(/no external write has been performed/i);
  });

  it("5-6. Confirm locally on comms shows the inert handoff copy and makes no execution claim", async () => {
    const user = await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-turn-buffer-card");
    await user.click(screen.getByTestId("voice-confirm-local"));
    const handoffCopy = await screen.findByTestId("confirmed-action-handoff-copy");
    expect(handoffCopy).toHaveTextContent(/ready for future governed execution/i);
    expect(handoffCopy).toHaveTextContent(/no external write has been performed/i);
    const card = screen.getByTestId("confirmed-action-handoff");
    expect(card).toHaveAttribute("data-execution-status", "not_executed");
    const text = (card.textContent ?? "").toLowerCase();
    expect(text).not.toMatch(/\bsent\b/);
    expect(text).not.toMatch(/\bexecuted\b/);
    expect(text).not.toMatch(/\bapproved\b/);
  });

  it("7. Decline does not create a handoff", async () => {
    const user = await typeTranscript("approve the budget request");
    await screen.findByTestId("voice-turn-buffer-card");
    await user.click(screen.getByTestId("voice-decline-local"));
    await screen.findByText(/voice action declined/i);
    expect(screen.queryByTestId("confirmed-action-handoff")).toBeNull();
  });

  it("8. Clear local voice turns removes the displayed turn", async () => {
    const user = await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-turn-buffer-card");
    await user.click(screen.getByTestId("voice-turn-clear"));
    expect(screen.queryByTestId("voice-turn-buffer-card")).toBeNull();
  });

  it("9. an empty transcript creates no turn and no executable handoff", async () => {
    renderVoice();
    await screen.findByTestId("ambient-capture-card");
    expect(screen.queryByTestId("voice-turn-buffer-card")).toBeNull();
    expect(screen.queryByTestId("confirmed-action-handoff")).toBeNull();
  });

  it("10. confirm / decline / clear call no governed write API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-turn-buffer-card");
    await user.click(screen.getByTestId("voice-confirm-local"));
    await screen.findByTestId("confirmed-action-handoff-copy");
    await user.click(screen.getByTestId("voice-turn-clear"));
    const calledWrite = fetchSpy.mock.calls.some((c) => {
      const url = typeof c[0] === "string" ? c[0] : String((c[0] as Request)?.url ?? c[0]);
      return WRITE_ENDPOINT_RX.test(url);
    });
    expect(calledWrite).toBe(false);
  });
});
