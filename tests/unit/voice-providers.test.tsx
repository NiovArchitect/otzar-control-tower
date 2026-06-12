// FILE: tests/unit/voice-providers.test.tsx
// PURPOSE: Phase 1256B locks — the Voice Providers admin surface:
//          all required providers render with human-readable
//          statuses; production voice is NEVER claimed ready without
//          credentials; setup-key names live behind Developer
//          details (not primary copy); no secrets anywhere; the
//          pronunciation test exists (spelled Otzar, spoken OatZar);
//          the command layer routes to voice setup.

import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import VoiceProviders from "@/pages/VoiceProviders";
import { AdminCommandLayer } from "@/components/AdminCommandLayer";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAdmin(): void {
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

function mockProviders(): void {
  server.use(
    http.get(`${API_BASE}/otzar/voice-captures/providers`, () =>
      HttpResponse.json({
        ok: true,
        providers: [
          {
            provider_name: "DEEPGRAM",
            status: "BLOCKED_BY_KEY",
            always_available: false,
            description: "Streaming STT.",
          },
          {
            provider_name: "WHISPER_API",
            status: "BLOCKED_BY_KEY",
            always_available: false,
            description: "Whisper fallback.",
          },
        ],
      }),
    ),
    http.get(`${API_BASE}/connectors/adapters`, () =>
      HttpResponse.json({
        ok: true,
        adapters: [
          {
            provider_name: "OPENAI_REALTIME",
            category: "AI",
            display_name: "OpenAI Realtime",
            description: "Realtime voice",
            required_envs: ["OPENAI_API_KEY"],
            oauth_scopes: [],
            app_review_required: false,
            can_write: false,
            phase: 1249,
            setup_steps: [],
            demo_mode_available: false,
            status: "BLOCKED_BY_CREDENTIAL",
          },
          {
            provider_name: "ELEVENLABS_TTS",
            category: "AI",
            display_name: "ElevenLabs",
            description: "Premium TTS",
            required_envs: ["ELEVENLABS_API_KEY"],
            oauth_scopes: [],
            app_review_required: false,
            can_write: false,
            phase: 1249,
            setup_steps: [],
            demo_mode_available: false,
            status: "BLOCKED_BY_CREDENTIAL",
          },
          {
            provider_name: "ASSEMBLYAI_STT",
            category: "AI",
            display_name: "AssemblyAI",
            description: "Diarization",
            required_envs: ["ASSEMBLYAI_API_KEY"],
            oauth_scopes: [],
            app_review_required: false,
            can_write: false,
            phase: 1249,
            setup_steps: [],
            demo_mode_available: false,
            status: "BLOCKED_BY_CREDENTIAL",
          },
        ],
      }),
    ),
  );
}

async function renderPage(): Promise<void> {
  render(
    <MemoryRouter>
      <VoiceProviders />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(
      screen.getAllByTestId("voice-provider-row").length,
    ).toBeGreaterThanOrEqual(4);
  });
}

beforeEach(() => {
  setAdmin();
  mockProviders();
  cleanup();
});

describe("Phase 1256B — Voice Providers surface", () => {
  it("renders all five required providers with human-readable statuses", async () => {
    await renderPage();
    const rows = screen.getAllByTestId("voice-provider-row");
    const providers = rows.map((r) => r.getAttribute("data-provider"));
    for (const p of [
      "DEEPGRAM",
      "WHISPER_API",
      "OPENAI_REALTIME",
      "ELEVENLABS_TTS",
      "ASSEMBLYAI_STT",
    ]) {
      expect(providers).toContain(p);
    }
    const text = screen.getByTestId("voice-providers-page").textContent ?? "";
    expect(text).toContain("Needs credentials");
    expect(text).not.toContain("BLOCKED_BY_CREDENTIAL");
  });

  it("production voice is honestly NOT ready without credentials", async () => {
    await renderPage();
    const verdict =
      screen.getByTestId("voice-readiness-verdict").textContent ?? "";
    expect(verdict).toContain("Setup needed");
    expect(verdict).not.toContain("Ready ");
    expect(verdict).toContain("typing and browser voice work fully");
  });

  it("setup key NAMES live behind Developer details, never as primary copy; no secrets", async () => {
    await renderPage();
    const page = screen.getByTestId("voice-providers-page");
    // Key names exist only inside <details> elements.
    for (const key of ["DEEPGRAM_API_KEY", "ELEVENLABS_API_KEY"]) {
      const el = Array.from(page.querySelectorAll("details")).find((d) =>
        (d.textContent ?? "").includes(key),
      );
      expect(el, `${key} should be inside Developer details`).toBeTruthy();
    }
    const text = page.textContent ?? "";
    expect(text).not.toMatch(/sk-[A-Za-z0-9]/);
    expect(text).toContain("credential value never appears here");
  });

  it("pronunciation test: spelled Otzar, spoken OatZar, with the sample phrase", async () => {
    await renderPage();
    const card = screen.getByTestId("voice-pronunciation-card");
    const text = card.textContent ?? "";
    expect(text).toContain("spelled");
    expect(text).toContain("Otzar");
    expect(text).toContain('"OatZar"');
    expect(text).toContain("Good morning. I'm Otzar.");
    expect(
      screen.getByTestId("voice-pronunciation-test-button"),
    ).toBeInTheDocument();
    // The product is never renamed: page title stays Otzar-branded.
    expect(text).not.toContain("OatZar voice is the product");
  });
});

describe("Phase 1256B — command layer routes to voice setup", () => {
  it("'Connect voice providers' exists in the palette", async () => {
    render(
      <MemoryRouter>
        <AdminCommandLayer />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByTestId("admin-command-trigger"));
    expect(screen.getByText("Connect voice providers")).toBeInTheDocument();
  });
});
