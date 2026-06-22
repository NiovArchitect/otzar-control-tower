// FILE: tests/unit/voice-note-revoke-plan-ui.test.tsx
// PURPOSE: Phase OTZAR-RETURN-9 — after a saved note, the Voice page shows an
//          HONEST, read-only revoke PLAN status (CANNOT_IDENTIFY_GROUP, apply
//          not allowed, no note removed) under the existing "undo requires a
//          governed revoke path" copy. There is NO apply/undo button, and
//          saving + viewing the plan calls NO revoke/delete endpoint. Other
//          routes show none of this; note_capture stays the only write route.
// CONNECTS TO: src/pages/app/Voice.tsx, voice-note-revoke-plan.ts.

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
const REVOKE_DELETE_RX = /(\/revoke|\/cosmp\/capsules|revoke-plan|revoke-apply)/i;

beforeEach(() => setAuth());
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Voice page — plan-first revoke status (RETURN-9)", () => {
  async function saveNote(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByTestId("voice-save-note");
    await user.click(screen.getByTestId("voice-save-note"));
    return screen.findByTestId("voice-note-provenance");
  }

  it("shows an honest plan-only status: cannot identify group, apply not allowed", async () => {
    const user = await typeTranscript("note: the contract renews in Q3");
    await saveNote(user);
    const plan = await screen.findByTestId("voice-note-revoke-plan-status");
    expect(plan).toHaveAttribute("data-plan-status", "CANNOT_IDENTIFY_GROUP");
    expect(plan).toHaveAttribute("data-apply-allowed", "false");
    const text = (plan.textContent ?? "").toLowerCase();
    expect(text).toContain("apply is not available");
    expect(text).toContain("no note was removed");
    expect(text).toContain("never a hard delete");
  });

  it("keeps the RETURN-8 'governed revoke path required' copy and shows NO undo/apply button", async () => {
    const user = await typeTranscript("note: remember the renewal");
    await saveNote(user);
    expect(screen.getByTestId("voice-note-undo-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("voice-note-undo-button")).toBeNull();
    expect(screen.queryByRole("button", { name: /review undo plan|undo|revoke/i })).toBeNull();
  });

  it("saving + viewing the plan calls NO revoke/delete/plan endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await typeTranscript("note: pricing change");
    await saveNote(user);
    const hitRevoke = fetchSpy.mock.calls.some(
      (c) => REVOKE_DELETE_RX.test(urlOf(c)) || /DELETE/i.test(String(c[1]?.method ?? "")),
    );
    expect(hitRevoke).toBe(false);
    // The only write that fired is the note capture itself.
    const observeCalls = fetchSpy.mock.calls.filter((c) => /\/otzar\/observe(\b|$)/.test(urlOf(c)));
    expect(observeCalls.length).toBe(1);
  });

  it("a comms transcript shows no provenance or revoke-plan status", async () => {
    await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-safety-card");
    expect(screen.queryByTestId("voice-note-revoke-plan-status")).toBeNull();
    expect(screen.queryByTestId("voice-note-provenance")).toBeNull();
    expect(screen.queryByTestId("voice-save-note")).toBeNull();
  });
});
