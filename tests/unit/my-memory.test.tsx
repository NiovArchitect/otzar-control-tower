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
import { render, screen, waitFor } from "@testing-library/react";
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

function renderPage(): void {
  render(
    <MemoryRouter>
      <MyMemory />
    </MemoryRouter>,
  );
}

beforeEach(() => setAuth());

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
    expect(
      screen
        .getByTestId("my-mem-revoke-authority")
        .querySelector("a")
        ?.getAttribute("href"),
    ).toBe("/app/authority-grants");
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
