// FILE: tests/unit/focus-home-acceptance.test.tsx
// PURPOSE: Phase 1253 — the Founder acceptance locks:
//          (1) the DEFAULT employee experience is the calm Focus
//              Home, not a dashboard (no card sprawl, a voice-first
//              hint, one quiet workbench door),
//          (2) the notification panel closes on outside click AND
//              Escape (focus returns to the bell),
//          (3) voice copy never shows the typed-transcript warning,
//              "browser microphone API", or raw provider errors as
//              primary copy; setup/recovery copy is calm,
//          (4) TTS pronounces "Otzar" as "OatZar" (spelling stays
//              Otzar everywhere).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FocusHome } from "@/pages/app/FocusHome";
import { NotificationBell } from "@/components/otzar/NotificationBell";
import { llmErrorCopy, micCopyFor } from "@/lib/voice/diagnostics";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "david@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

beforeEach(() => {
  setAuth();
  usePresenceStore.getState().reset();
  cleanup();
});

describe("Phase 1253 — Focus Home is the calm default", () => {
  it("renders the ambient home: greeting, presence line, voice hint, one workbench door", async () => {
    render(
      <MemoryRouter>
        <FocusHome />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("focus-home")).toBeInTheDocument();
    expect(
      screen.getByTestId("focus-home-presence-line").textContent,
    ).toContain("stay out of your way");
    expect(screen.getByTestId("focus-home-open-workbench")).toBeInTheDocument();
    // Calm = restrained: no dashboard card sprawl on the default view.
    const text = screen.getByTestId("focus-home").textContent ?? "";
    expect(text).toContain("Just talk");
    for (const banned of ["COSMP", "capsule_id", "payload", "adapter"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("quiet mode shows the quiet presence line", () => {
    usePresenceStore.getState().setSignals({ quiet: true });
    render(
      <MemoryRouter>
        <FocusHome />
      </MemoryRouter>,
    );
    expect(
      screen.getByTestId("focus-home-presence-line").textContent,
    ).toContain("quiet");
  });
});

describe("Phase 1253 — notification panel closes calmly", () => {
  async function openBell(): Promise<void> {
    render(
      <MemoryRouter>
        <div>
          <NotificationBell pollIntervalMs={0} />
          <button type="button" data-testid="outside-target">
            outside
          </button>
        </div>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByTestId("notification-bell-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("notification-bell-dropdown"),
      ).toBeInTheDocument(),
    );
  }

  it("closes when clicking anywhere outside", async () => {
    await openBell();
    await userEvent.click(screen.getByTestId("outside-target"));
    await waitFor(() =>
      expect(screen.queryByTestId("notification-bell-dropdown")).toBeNull(),
    );
  });

  it("closes on Escape and returns focus to the bell", async () => {
    await openBell();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByTestId("notification-bell-dropdown")).toBeNull(),
    );
    expect(document.activeElement).toBe(
      screen.getByTestId("notification-bell-button"),
    );
  });
});

describe("Phase 1253 — voice copy acceptance", () => {
  it("desktop shell copy is calm: no 'typed-transcript mode', no 'browser microphone API'", () => {
    const copy = micCopyFor("tauri_webview", "unsupported", false);
    const all = `${copy.headline} ${copy.detail}`;
    expect(all).not.toContain("typed-transcript mode");
    expect(all).not.toContain("browser microphone API");
    expect(all).not.toContain("forward-substrate");
    expect(all).toContain("Typing works exactly the same");
  });

  it("LLM unavailable reads as setup mode, never a broken brain or raw provider error", () => {
    const copy = llmErrorCopy("LLM_UNAVAILABLE");
    expect(copy).toContain("setup mode");
    expect(copy).not.toContain("LLM_PROVIDER");
    expect(copy).not.toContain("backend");
  });

  it("transient busy (incl. the old P2028 path) reads as calm recovery", () => {
    expect(llmErrorCopy("OTZAR_BUSY_TRY_AGAIN")).toContain("catching its breath");
    const unknown = llmErrorCopy("P2028");
    expect(unknown).toContain("try again in a moment");
    expect(unknown).not.toContain("Prisma");
    expect(unknown).not.toContain("Foundation API logs");
  });
});

describe("Phase 1253 — pronunciation law (spelled Otzar, spoken OatZar)", () => {
  it("speak() pronounces Otzar as OatZar without changing UI spelling", async () => {
    const spoken: string[] = [];
    class FakeUtterance {
      text: string;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
        spoken.push(text);
      }
    }
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("speechSynthesis", {
      speak: vi.fn(),
      cancel: vi.fn(),
      speaking: false,
    });
    const { renderHook, act } = await import("@testing-library/react");
    const { useSpeechSynthesis } = await import(
      "@/hooks/useSpeechSynthesis"
    );
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("Good morning. I'm Otzar.", {
        source: "manual",
        force: true,
      });
    });
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken[0]).toContain("OatZar");
    expect(spoken[0]).not.toContain("I'm Otzar.");
    vi.unstubAllGlobals();
  });
});
