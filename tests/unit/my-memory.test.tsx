// FILE: tests/unit/my-memory.test.tsx
// PURPOSE: Phase 1219 — locks the "My Digital Work Wallet" page that
//          surfaces what Otzar knows, what Otzar can do with it, and
//          what the employee can revoke. Per the Founder UI Language
//          Map: DMW is renamed "Digital Work Wallet" in primary UI;
//          COSMP is "Memory record". The page MUST surface the user-
//          facing labels and MUST NOT leak "DMW" / "COSMP" / raw
//          internals into primary copy.
// CONNECTS TO: src/pages/app/MyMemory.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyMemory } from "@/pages/app/MyMemory";
import { useAuthStore } from "@/lib/stores/auth";
import type { ContextHealthResponse } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

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

function ctx(
  overrides: Partial<ContextHealthResponse["identity"]> = {},
): ContextHealthResponse {
  return {
    ok: true,
    status: "READY",
    identity: {
      viewer: {
        user_id: "u",
        email: "sadeil@niovlabs.com",
        display_name: "Sadeil Lewis",
        title: "FOUNDER",
        org_role: "FOUNDER",
        is_founder_admin: true,
      },
      org: { org_id: "o", name: "NIOV Labs", domain: null },
      twin: { twin_id: "t", display_name: "Otzar", active: true },
      projects: [],
      authority: {
        can_admin_org: true,
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_access_external_api: false,
        external_write_policy: "APPROVAL_REQUIRED",
      },
      context_signals: {
        memory_capsules_count: 8,
        transcript_summaries_count: 2,
        collaboration_inbound_count: 1,
        collaboration_outbound_count: 4,
      },
      org_roster: [],
      safety: {
        no_external_write_without_approval: true,
        no_private_data_to_unauthorized_users: true,
        no_raw_audio_storage: true,
        no_raw_transcript_default: true,
      },
      ...overrides,
    },
  };
}

function mockCtx(resp: ContextHealthResponse): void {
  server.use(
    http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
      HttpResponse.json(resp),
    ),
  );
}

/** Work-style learning surface — must resolve or Teach Otzar stays on "Loading…". */
function mockWorkStyle(opts: { orgEnabled?: boolean } = {}): void {
  const orgEnabled = opts.orgEnabled ?? false;
  server.use(
    http.get(`${API_BASE}/otzar/work-style/status`, () =>
      HttpResponse.json({
        ok: true,
        org_policy_enabled: orgEnabled,
        user_consent_required: true,
        active_session: null,
        pending_candidates_count: 0,
        approved_preferences_count: 0,
      }),
    ),
    http.get(`${API_BASE}/otzar/work-style/preferences`, () =>
      HttpResponse.json({ ok: true, preferences: [] }),
    ),
    http.get(`${API_BASE}/otzar/work-style/candidates`, () =>
      HttpResponse.json({ ok: true, candidates: [] }),
    ),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <MyMemory />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAuth();
  // Default: org policy not enabled — honest not-enabled surface.
  mockWorkStyle({ orgEnabled: false });
});

describe("MyMemory — page title + user-facing label discipline", () => {
  it("renders 'My Digital Work Wallet' (NOT 'DMW' / 'COSMP')", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-page")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("my-memory-page").outerHTML;
    expect(html).toContain("Digital Work Wallet");
    // Internal terms forbidden in primary copy (per UI Language Map).
    expect(html).not.toMatch(/\bDMW\b/);
    expect(html).not.toMatch(/COSMP/);
    expect(html).not.toMatch(/MemoryCapsule/);
    expect(html).not.toMatch(/capsule_id/);
    expect(html).not.toMatch(/wallet_id/);
  });

  it("uses the Founder-mandated user-facing term 'Memory record(s)' / 'Conversation summaries'", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-knows")).toBeInTheDocument(),
    );
    const knows = screen.getByTestId("my-memory-knows");
    expect(knows).toHaveTextContent("Memory records");
    expect(knows).toHaveTextContent("Conversation summaries");
  });
});

// ── [GAP-S S-1] ownership boundary — clear, calm, and never overclaiming ──
describe("MyMemory — ownership boundary (GAP-S S-1)", () => {
  it("renders the personal-wallet badge + the two-sided ownership block", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-boundary")).toBeInTheDocument(),
    );
    const boundary = screen.getByTestId("my-memory-boundary");
    expect(boundary).toHaveTextContent("Personal wallet. Yours, not the company's");
    expect(boundary).toHaveTextContent("Your personal work memory");
    expect(boundary).toHaveTextContent("Company-owned work data");
    expect(boundary).toHaveTextContent("stay with the company");
  });

  it("makes NO shipped-portability claim and offers NO export/import control", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-page")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("my-memory-page").outerHTML;
    expect(html).not.toMatch(/export your twin|take this with you|portable today/i);
    expect(screen.queryByRole("button", { name: /export/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /export/i })).toBeNull();
  });
});

describe("MyMemory — 'What Otzar knows' counts", () => {
  it("surfaces the 4 context_signals counts", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("my-mem-stat")).toHaveLength(4),
    );
    const knows = screen.getByTestId("my-memory-knows");
    expect(knows).toHaveTextContent("8");
    expect(knows).toHaveTextContent("2");
    expect(knows).toHaveTextContent("1");
    expect(knows).toHaveTextContent("4");
  });

  it("explicitly states 'Counts only. Otzar never shows raw memory bodies...'", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-knows")).toHaveTextContent(
        /Counts only/i,
      ),
    );
    expect(screen.getByTestId("my-memory-knows")).toHaveTextContent(
      /never shows raw memory bodies, transcripts/i,
    );
  });
});

describe("MyMemory — authority rows", () => {
  it("renders 4 capability rows with the right data-allowed values", async () => {
    mockCtx(
      ctx({
        authority: {
          can_admin_org: true,
          can_read_capsules: true,
          can_write_capsules: false,
          can_share_capsules: true,
          can_access_external_api: false,
          external_write_policy: "APPROVAL_REQUIRED",
        },
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-mem-auth-read")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("my-mem-auth-read").getAttribute("data-allowed"),
    ).toBe("true");
    expect(
      screen.getByTestId("my-mem-auth-write").getAttribute("data-allowed"),
    ).toBe("false");
    expect(
      screen.getByTestId("my-mem-auth-share").getAttribute("data-allowed"),
    ).toBe("true");
    expect(
      screen.getByTestId("my-mem-auth-external").getAttribute("data-allowed"),
    ).toBe("false");
    expect(screen.getByTestId("my-mem-auth-external")).toHaveTextContent(
      "Approval required",
    );
  });
});

describe("MyMemory — revocable links", () => {
  it("links to authority-grants / preferences / my-twin", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-revocable")).toBeInTheDocument(),
    );
    // PROD-MODEL-P4 §7/§24 — twin authority is org-governed: Memory shows
    // the governed state, never a self-service authority link.
    const governed = screen.getByTestId("my-mem-authority-governed");
    expect(governed).toHaveTextContent(/admin decision/i);
    expect(governed.querySelector("a")).toBeNull();
    expect(
      screen
        .getByTestId("my-mem-revoke-preferences")
        .querySelector("a")
        ?.getAttribute("href"),
    ).toBe("/app/preferences");
    expect(
      screen
        .getByTestId("my-mem-revoke-twin")
        .querySelector("a")
        ?.getAttribute("href"),
    ).toBe("/app/my-twin");
  });
});

describe("MyMemory — sovereignty reassurance footer", () => {
  it("renders the 'Your sovereignty' badge + reassurance copy", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-page")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("my-memory-page").outerHTML;
    expect(html).toContain("Your sovereignty");
    expect(html).toMatch(/memory and permissions are yours/i);
    expect(html).toMatch(/every grant is revocable/i);
    expect(html).toMatch(/every action is recorded/i);
  });
});

describe("MyMemory — loading + error states", () => {
  it("renders the loading state initially", () => {
    mockCtx(ctx());
    renderPage();
    expect(screen.getByTestId("my-memory-loading")).toBeInTheDocument();
  });

  it("renders the error state when the API fails", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_EXPIRED" },
          { status: 401 },
        ),
      ),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-error")).toBeInTheDocument(),
    );
  });
});

describe("MyMemory — privacy invariants (RULE 0)", () => {
  it("never renders TAR / wallet_id / clearance / permission_id / payload / embedding / bearer", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-page")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("my-memory-page").outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/payload_redacted/i);
    expect(html).not.toMatch(/policy_envelope/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/bearer/i);
    expect(html).not.toMatch(/session_token/i);
  });
});

// CX-SLICE-5 / work-style learning — Teach Otzar card. Captures NOTHING until
// a consent session starts; org policy gate is honest when disabled.
describe("My Digital Work Wallet — observation consent card (CX-SLICE-5)", () => {
  it("renders learn/never-touch categories and the honest status note", async () => {
    mockCtx(ctx());
    mockWorkStyle({ orgEnabled: false });
    renderPage();
    const card = await screen.findByTestId("observation-consent-card");
    await waitFor(() =>
      expect(within(card).getByTestId("observation-learns")).toBeInTheDocument(),
    );
    expect(within(card).getByTestId("observation-learns").textContent ?? "").toMatch(
      /structure|methods|review|tools|work/i,
    );
    expect(within(card).getByTestId("observation-never")).toHaveTextContent(/confidential/i);
    expect(within(card).getByTestId("observation-status-note").textContent ?? "").toMatch(
      /preference proposes behavior|organization policy authorizes|portable preferences/i,
    );
    // No surveillance language, no active indicator when idle/unavailable.
    expect(card.textContent ?? "").not.toMatch(/spy|monitor you|track you/i);
    expect(screen.queryByTestId("observation-active-indicator")).toBeNull();
  });

  it("with no org policy, shows the not-enabled state and offers NO start action", async () => {
    mockCtx(ctx());
    mockWorkStyle({ orgEnabled: false });
    renderPage();
    await screen.findByTestId("observation-consent-card");
    await waitFor(() =>
      expect(screen.getByTestId("observation-not-enabled")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("observation-not-enabled")).toHaveTextContent(
      /hasn't enabled professional learning yet|hasn't enabled work-style learning yet/i,
    );
    expect(screen.queryByTestId("observation-start")).toBeNull();
    expect(screen.queryByTestId("observation-consent-checkbox")).toBeNull();
  });
});
