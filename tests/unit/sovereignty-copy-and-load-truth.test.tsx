// FILE: tests/unit/sovereignty-copy-and-load-truth.test.tsx
// PURPOSE: Phase 1248 hardening locks.
//          (1) Protocol names never reach employee-ambient surfaces
//              the global sweep can't see: the persistent footer
//              badge, the Login card, and nav descriptions. Plain
//              sovereignty language only ("audit trail", not COSMP).
//          (2) VoiceCaptures load failures tell the truth: a failed
//              fetch renders "couldn't load" copy — never the
//              "No voice captures yet" empty state.
// CONNECTS TO: src/components/DataSovereigntyBadge.tsx,
//          src/pages/Login.tsx, src/lib/nav.ts,
//          src/pages/app/VoiceCaptures.tsx,
//          tests/unit/ambient-copy-discipline.test.tsx (page sweep).

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { DataSovereigntyBadge } from "@/components/DataSovereigntyBadge";
import { LoginPage } from "@/pages/Login";
import { NAV } from "@/lib/nav";
import { VoiceCaptures } from "@/pages/app/VoiceCaptures";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
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

describe("Phase 1248 — sovereignty copy stays plain-language", () => {
  it("the footer badge never names the protocol", () => {
    render(<DataSovereigntyBadge />);
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("COSMP");
    expect(text).toContain("audit trail");
    cleanup();
  });

  it("the Login card never names the protocol", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("COSMP");
    expect(text).toContain("audit trail");
    cleanup();
  });

  it("nav descriptions never name the protocol", () => {
    for (const item of NAV) {
      expect(
        item.description,
        `nav "${item.label}" leaked a protocol name`,
      ).not.toContain("COSMP");
    }
  });
});

describe("Phase 1248 — VoiceCaptures load failures tell the truth", () => {
  beforeEach(() => setAuth());

  it("a failed list/providers load renders error copy, not the empty state", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/voice-captures/providers`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
      http.get(`${API_BASE}/otzar/voice-captures`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    render(
      <MemoryRouter>
        <VoiceCaptures />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("voice-captures-list-empty").textContent,
      ).toContain("Couldn't load");
    });
    expect(
      screen.getByTestId("voice-captures-providers-empty").textContent,
    ).toContain("Couldn't load");
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("No voice captures yet.");
    cleanup();
  });
});
