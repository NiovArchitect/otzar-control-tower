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

  it("shows a grouping-ready, apply-not-implemented plan once the backend returns a voice_note_id (RETURN-10)", async () => {
    const user = await typeTranscript("note: the contract renews in Q3");
    await saveNote(user);
    // The backend (MSW, mirroring Foundation) returns a voice_note_id for a
    // voice-note capture, so the group is now identifiable.
    expect(await screen.findByTestId("voice-note-group-id")).toHaveTextContent(
      /voice note group id/i,
    );
    const plan = await screen.findByTestId("voice-note-revoke-plan-status");
    expect(plan).toHaveAttribute("data-plan-status", "GROUPING_READY_APPLY_NOT_IMPLEMENTED");
    // Apply is STILL not allowed in this build.
    expect(plan).toHaveAttribute("data-apply-allowed", "false");
    const text = (plan.textContent ?? "").toLowerCase();
    expect(text).toContain("apply is not implemented yet");
    expect(text).toContain("no note was removed");
    expect(text).toContain("never a hard delete");
  });

  it("shows NO apply/undo button (the read-only Review undo plan button is allowed)", async () => {
    const user = await typeTranscript("note: remember the renewal");
    await saveNote(user);
    expect(screen.getByTestId("voice-note-undo-unavailable")).toBeInTheDocument();
    // No APPLY/undo button.
    expect(screen.queryByTestId("voice-note-undo-button")).toBeNull();
    expect(screen.queryByRole("button", { name: /^undo \/ revoke note$/i })).toBeNull();
    // The read-only Review undo plan button IS present (RETURN-11, grouping ready).
    expect(screen.getByTestId("voice-note-review-plan-button")).toBeInTheDocument();
  });

  it("saving (before reviewing) calls NO revoke/delete/plan endpoint — only the note capture", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await typeTranscript("note: pricing change");
    await saveNote(user);
    const hitRevoke = fetchSpy.mock.calls.some(
      (c) => REVOKE_DELETE_RX.test(urlOf(c)) || /DELETE/i.test(String(c[1]?.method ?? "")),
    );
    expect(hitRevoke).toBe(false);
    // Only the note capture fired; the plan is fetched only on explicit click.
    const observeCalls = fetchSpy.mock.calls.filter((c) => /\/otzar\/observe(\b|$)/.test(urlOf(c)));
    expect(observeCalls.length).toBe(1);
    expect(fetchSpy.mock.calls.some((c) => /revoke-plan/.test(urlOf(c)))).toBe(false);
  });

  it("a comms transcript shows no provenance or revoke-plan status", async () => {
    await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-safety-card");
    expect(screen.queryByTestId("voice-note-revoke-plan-status")).toBeNull();
    expect(screen.queryByTestId("voice-note-provenance")).toBeNull();
    expect(screen.queryByTestId("voice-save-note")).toBeNull();
  });
});

// [OTZAR-RETURN-11] consume the real governed read-only revoke-plan endpoint.
describe("Voice page — Review undo plan (RETURN-11, read-only)", () => {
  // Forbidden writes: the per-capsule revoke (/cosmp/capsules/:id/revoke), any
  // bare /revoke (NOT /revoke-plan), and DELETE. The /revoke-plan read is OK.
  function isForbiddenWrite(call: unknown[]): boolean {
    const url = urlOf(call);
    const init = call[1] as RequestInit | undefined;
    if (/DELETE/i.test(String(init?.method ?? ""))) return true;
    if (/\/cosmp\/capsules/.test(url)) return true;
    if (/\/revoke\b/.test(url) && !/revoke-plan/.test(url)) return true;
    return false;
  }

  async function saveNote(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByTestId("voice-save-note");
    await user.click(screen.getByTestId("voice-save-note"));
    return screen.findByTestId("voice-note-provenance");
  }

  it("clicking Review undo plan calls ONLY the revoke-plan endpoint (no /revoke, no DELETE) and shows the real plan", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await typeTranscript("note: the contract renews in Q3");
    await saveNote(user);
    await user.click(screen.getByTestId("voice-note-review-plan-button"));
    const reviewed = await screen.findByTestId("voice-note-reviewed-plan");

    // It is a PLAN: apply not allowed, partial authority, honest copy.
    expect(reviewed).toHaveAttribute("data-plan-status", "PARTIAL_REQUIRES_AUTHORITY");
    expect(reviewed).toHaveAttribute("data-apply-allowed", "false");
    const text = (reviewed.textContent ?? "").toLowerCase();
    expect(text).toContain("no note was removed");
    expect(text).toContain("organization authority");
    expect(text).toContain("apply is not implemented");
    expect(text).toContain("no external message was sent");
    expect(text).toContain("no raw audio was exposed");

    // No apply/undo button ever rendered.
    expect(screen.queryByTestId("voice-note-undo-button")).toBeNull();

    // Network discipline: exactly one revoke-plan read; no forbidden writes.
    const planCalls = fetchSpy.mock.calls.filter((c) => /revoke-plan/.test(urlOf(c)));
    expect(planCalls.length).toBe(1);
    expect(fetchSpy.mock.calls.some(isForbiddenWrite)).toBe(false);
  });

  it("a comms transcript shows no Review undo plan button", async () => {
    await typeTranscript("reply to David about the deck");
    await screen.findByTestId("voice-safety-card");
    expect(screen.queryByTestId("voice-note-review-plan-button")).toBeNull();
    expect(screen.queryByTestId("voice-note-reviewed-plan")).toBeNull();
  });
});
