// FILE: tests/unit/voice-note-provenance-ui.test.tsx
// PURPOSE: Phase OTZAR-RETURN-8 — after a governed note capture, the Voice page
//          shows honest provenance (capsule ids, NOTE, source, no external send,
//          no raw audio), reports read-back as unavailable and undo as requiring
//          a governed revoke path (NO fake undo button), and performs NO
//          revoke/delete. Other routes show no provenance/undo. note_capture
//          remains the only write route.
// CONNECTS TO: src/pages/app/Voice.tsx, voice-note-provenance.ts, MSW observe.

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
  await user.type(screen.getByLabelText(/message to otzar/i), text);
  return user;
}

function urlOf(call: unknown[]): string {
  const a = call[0];
  return typeof a === "string" ? a : String((a as Request)?.url ?? a);
}
const REVOKE_DELETE_RX = /(\/revoke|\/cosmp\/capsules|DELETE)/i;
const NON_NOTE_WRITE_RX = /(actions|internal-messages|escalations|ledger|reminders|conversation\/message|correction)/;

beforeEach(() => setAuth());
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Voice page — note provenance + honest undo state", () => {
  async function saveNote(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByTestId("voice-save-note");
    await user.click(screen.getByTestId("voice-save-note"));
    return screen.findByTestId("voice-note-provenance");
  }

  it("1-4. a saved note shows provenance with capsule id, NOTE/source, no external send, no raw audio", async () => {
    const user = await typeTranscript("note: the contract renews in Q3");
    const prov = await saveNote(user);
    expect(screen.getByTestId("voice-note-capsule-id")).toHaveTextContent(/cap-obs-1/);
    const text = (prov.textContent ?? "").toLowerCase();
    expect(text).toContain("no external message");
    expect(text).toContain("no raw audio");
    expect(text).toContain("voice note capture");
  });

  it("5. no audit link is shown when the endpoint returns none", async () => {
    const user = await typeTranscript("note: remember the renewal");
    await saveNote(user);
    expect(screen.queryByTestId("voice-note-provenance-audit-link")).toBeNull();
  });

  it("6. read-back is reported unavailable honestly", async () => {
    const user = await typeTranscript("note: pricing changes");
    await saveNote(user);
    const rb = screen.getByTestId("voice-note-readback-status");
    expect(rb).toHaveAttribute("data-readback-status", "unavailable");
    expect(rb).toHaveTextContent(/capsule id is shown for provenance/i);
  });

  it("7-8. undo requires a governed revoke path and NO undo button is shown", async () => {
    const user = await typeTranscript("note: the Q3 renewal");
    await saveNote(user);
    const undo = screen.getByTestId("voice-note-undo-status");
    expect(undo).toHaveAttribute("data-undo-status", "requires_backend_contract");
    expect(undo).toHaveTextContent(/governed revoke path is required/i);
    expect(screen.queryByTestId("voice-note-undo-button")).toBeNull();
    expect(screen.getByTestId("voice-note-undo-unavailable")).toBeInTheDocument();
  });

  it("9-12. saving + viewing provenance performs NO revoke/delete and NO non-note write", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await typeTranscript("note: capture this renewal");
    await saveNote(user);
    const revokeOrDelete = fetchSpy.mock.calls.some((c) => REVOKE_DELETE_RX.test(urlOf(c)) || /DELETE/i.test(String(c[1]?.method ?? "")));
    expect(revokeOrDelete).toBe(false);
    const nonNoteWrite = fetchSpy.mock.calls.some((c) => NON_NOTE_WRITE_RX.test(urlOf(c)));
    expect(nonNoteWrite).toBe(false);
    // The only write that fired is the note capture itself.
    const observeCalls = fetchSpy.mock.calls.filter((c) => /\/otzar\/observe(\b|$)/.test(urlOf(c)));
    expect(observeCalls.length).toBe(1);
  });

  it("10. a comms transcript shows no save button and no provenance", async () => {
    await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-safety-card");
    expect(screen.queryByTestId("voice-save-note")).toBeNull();
    expect(screen.queryByTestId("voice-note-provenance")).toBeNull();
    expect(screen.queryByTestId("voice-note-undo-status")).toBeNull();
  });
});
