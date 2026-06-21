// FILE: tests/unit/voice-ambient-readiness.test.tsx
// PURPOSE: Phase OTZAR-RETURN-3 — the Voice page surfaces the ambient capture
//          readiness layer honestly: capture copy never claims local/on-device
//          STT and states transcript-text-only; future earphones/glasses/
//          lenses/goggles appear as planned-only (never connected); and a typed
//          transcript shows the deterministic intent-route hint (ask_twin,
//          comms). jsdom has no SpeechRecognition, so the page renders in its
//          honest text-mode fallback — which is exactly the surface we assert.
// CONNECTS TO: src/pages/app/Voice.tsx, src/lib/voice/ambient-voice-capture.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

beforeEach(() => setAuth());

describe("Voice page — ambient capture readiness", () => {
  it("shows honest capture copy that never claims local/on-device STT", async () => {
    renderVoice();
    const copy = await screen.findByTestId("ambient-capture-copy");
    const text = (copy.textContent ?? "").toLowerCase();
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain("local stt");
    expect(text).not.toContain("on-device");
    expect(text).not.toContain("on device");
    expect(text).not.toContain("always listening");
    expect(text).not.toContain("always-on");
  });

  it("represents earphones/glasses/lenses/goggles as planned-only, never connected", async () => {
    renderVoice();
    const readiness = await screen.findByTestId("ambient-device-readiness");
    for (const mode of [
      "earphones_future",
      "glasses_future",
      "lenses_future",
      "goggles_future",
    ]) {
      const row = within(readiness).getByTestId(`ambient-device-${mode}`);
      expect(row).toHaveTextContent(/planned/i);
      expect(row).toHaveTextContent(/not connected/i);
    }
    // No fake "connect device" affordance anywhere on the page.
    expect(screen.queryByRole("button", { name: /connect (glasses|earphones|lenses|goggles)/i })).toBeNull();
  });

  it("the whole page never asserts on-device/local STT or always-on listening", async () => {
    const { container } = renderVoice();
    await screen.findByTestId("ambient-capture-card");
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("local stt");
    expect(text).not.toContain("on-device stt");
    expect(text).not.toContain("always listening");
    expect(text).not.toContain("always-on");
  });

  it("shows the deterministic intent-route hint for an Ask Twin utterance", async () => {
    const user = userEvent.setup();
    renderVoice();
    await screen.findByTestId("ambient-capture-card");
    const textarea = screen.getByLabelText(/message to otzar/i);
    await user.type(textarea, "ask twin what I committed to");
    expect(await screen.findByTestId("ambient-route-hint-value")).toHaveTextContent("Ask Twin");
  });

  it("shows the intent-route hint as Comms for a reply/send utterance", async () => {
    const user = userEvent.setup();
    renderVoice();
    await screen.findByTestId("ambient-capture-card");
    const textarea = screen.getByLabelText(/message to otzar/i);
    await user.type(textarea, "reply to David about the deck");
    expect(await screen.findByTestId("ambient-route-hint-value")).toHaveTextContent("Comms");
  });

  it("hides the route hint when there is no transcript", async () => {
    renderVoice();
    await screen.findByTestId("ambient-capture-card");
    expect(screen.queryByTestId("ambient-route-hint")).toBeNull();
  });
});
