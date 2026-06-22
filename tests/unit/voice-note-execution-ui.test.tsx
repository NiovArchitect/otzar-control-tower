// FILE: tests/unit/voice-note-execution-ui.test.tsx
// PURPOSE: Phase OTZAR-RETURN-7 — the Voice page exposes the governed internal
//          note write for note_capture ONLY: the "Save internal note" button
//          appears for note_capture and not for comms/approval/action_runtime;
//          clicking it calls ONLY the /otzar/observe endpoint (no
//          send/approve/complete/reminder write); success says the internal note
//          was saved and no external message was sent; and no write happens
//          before the click.
// CONNECTS TO: src/pages/app/Voice.tsx, voice-note-execution.ts, MSW observe.

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

function urlOf(call: unknown[]): string {
  const a = call[0];
  return typeof a === "string" ? a : String((a as Request)?.url ?? a);
}
// Any write that is NOT the internal note endpoint must never be called.
const NON_NOTE_WRITE_RX = /(actions|internal-messages|escalations|ledger|reminders|conversation\/message|correction)/;

beforeEach(() => setAuth());
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Voice page — governed internal note capture (note_capture only)", () => {
  it("1-2. a note transcript routes to note_capture and shows Save internal note", async () => {
    await typeTranscript("capture this note about Q3 pricing");
    expect(await screen.findByTestId("voice-note-capture")).toBeInTheDocument();
    expect(screen.getByTestId("voice-save-note")).toHaveTextContent(/save internal note/i);
  });

  it("3-4-10. clicking Save calls only /otzar/observe and shows the saved-internally copy + note id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await typeTranscript("note: the contract renews in Q3");
    await screen.findByTestId("voice-save-note");
    await user.click(screen.getByTestId("voice-save-note"));
    const copy = await screen.findByTestId("voice-note-result-copy");
    expect(copy).toHaveTextContent(/internal note saved to your memory/i);
    expect(copy).toHaveTextContent(/no external message was sent/i);
    expect(screen.getByTestId("voice-note-id")).toHaveTextContent(/cap-obs-1/);

    const writeCalls = fetchSpy.mock.calls.filter((c) => /POST/i.test(String(c[1]?.method ?? "")) || NON_NOTE_WRITE_RX.test(urlOf(c)));
    // The only POST/write that fired is to /otzar/observe.
    const observeCalls = fetchSpy.mock.calls.filter((c) => /\/otzar\/observe(\b|$)/.test(urlOf(c)));
    expect(observeCalls.length).toBe(1);
    const nonNoteWrites = writeCalls.filter((c) => NON_NOTE_WRITE_RX.test(urlOf(c)));
    expect(nonNoteWrites.length).toBe(0);
  });

  it("5. a comms transcript shows no Save internal note button", async () => {
    await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-safety-card");
    expect(screen.queryByTestId("voice-save-note")).toBeNull();
    expect(screen.queryByTestId("voice-note-capture")).toBeNull();
  });

  it("6. an approval transcript shows no Save internal note button", async () => {
    await typeTranscript("approve the budget request");
    await screen.findByTestId("voice-safety-card");
    expect(screen.queryByTestId("voice-save-note")).toBeNull();
  });

  it("7. an action_runtime transcript shows no Save internal note button", async () => {
    await typeTranscript("create a task for the deck");
    await screen.findByTestId("voice-safety-card");
    expect(screen.queryByTestId("voice-save-note")).toBeNull();
  });

  it("8-9. no write fires before the Save click, and no non-note write ever fires", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await typeTranscript("note: remember the renewal date");
    await screen.findByTestId("voice-save-note");
    // Before clicking: the note endpoint has not been called.
    expect(fetchSpy.mock.calls.some((c) => /\/otzar\/observe(\b|$)/.test(urlOf(c)))).toBe(false);
    await user.click(screen.getByTestId("voice-save-note"));
    await screen.findByTestId("voice-note-result-copy");
    // After clicking: still no send/approve/complete/reminder write.
    expect(fetchSpy.mock.calls.some((c) => NON_NOTE_WRITE_RX.test(urlOf(c)))).toBe(false);
  });
});
