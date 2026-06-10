// FILE: tests/unit/people-directory.test.tsx
// PURPOSE: Phase 1216 — locks the People directory that surfaces the
//          viewer's org_roster on the Collaboration page. Covers
//          ordering, roster card render, empty state, error state,
//          privacy invariants, and roster-aware behavior (NOT
//          David-only).
// CONNECTS TO: src/components/otzar/PeopleDirectory.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { PeopleDirectory } from "@/components/otzar/PeopleDirectory";
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
  roster: ContextHealthResponse["identity"]["org_roster"],
  orgName: string | null = "NIOV Labs",
): ContextHealthResponse {
  return {
    ok: true,
    status: "READY",
    identity: {
      viewer: {
        user_id: "u-1",
        email: "sadeil@niovlabs.com",
        display_name: "Sadeil",
        title: "FOUNDER",
        org_role: "FOUNDER",
        is_founder_admin: true,
      },
      org: { org_id: "o-1", name: orgName, domain: null },
      twin: { twin_id: null, display_name: null, active: false },
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
        memory_capsules_count: 0,
        transcript_summaries_count: 0,
        collaboration_inbound_count: 0,
        collaboration_outbound_count: 0,
      },
      org_roster: roster,
      safety: {
        no_external_write_without_approval: true,
        no_private_data_to_unauthorized_users: true,
        no_raw_audio_storage: true,
        no_raw_transcript_default: true,
      },
    },
  };
}

function mockCtx(roster: ContextHealthResponse["identity"]["org_roster"]): void {
  server.use(
    http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
      HttpResponse.json(ctx(roster)),
    ),
  );
}

beforeEach(() => setAuth());

describe("PeopleDirectory — happy path", () => {
  it("renders each roster member's name, humanized title, and signal chips", async () => {
    mockCtx([
      {
        entity_id: "id-david",
        display_name: "David Odie",
        email: "david@niovlabs.com",
        title: "TECH LEAD",
        shared_project_count: 3,
        recent_collab_count: 5,
      },
      {
        entity_id: "id-annie",
        display_name: "Annie",
        email: "annie@niovlabs.com",
        title: "RISK & COMPLIANCE LEAD",
        shared_project_count: 1,
        recent_collab_count: 0,
      },
    ]);
    render(<PeopleDirectory />);
    await waitFor(() =>
      expect(screen.getByTestId("people-directory")).toBeInTheDocument(),
    );
    const cards = screen.getAllByTestId("people-directory-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("David Odie");
    expect(cards[0]).toHaveTextContent("Tech Lead");
    expect(cards[0]).toHaveTextContent("3 shared projects");
    expect(cards[0]).toHaveTextContent("5 recent collabs");
    expect(cards[1]).toHaveTextContent("Annie");
    expect(cards[1]).toHaveTextContent("Risk & Compliance Lead");
    expect(cards[1]).toHaveTextContent("1 shared project");
    // No "0 recent collabs" chip when count is 0.
    expect(cards[1]?.textContent).not.toMatch(/0 recent collab/);
  });

  it("sorts by shared_project_count DESC, then recent_collab_count DESC, then name ASC", async () => {
    mockCtx([
      {
        entity_id: "a",
        display_name: "Walter",
        email: null,
        title: "MEDIA LEAD",
        shared_project_count: 0,
        recent_collab_count: 0,
      },
      {
        entity_id: "b",
        display_name: "David Odie",
        email: null,
        title: "TECH LEAD",
        shared_project_count: 3,
        recent_collab_count: 1,
      },
      {
        entity_id: "c",
        display_name: "Annie",
        email: null,
        title: "RISK & COMPLIANCE LEAD",
        shared_project_count: 3,
        recent_collab_count: 5,
      },
    ]);
    render(<PeopleDirectory />);
    await waitFor(() =>
      expect(screen.getByTestId("people-directory-list")).toBeInTheDocument(),
    );
    const cards = screen.getAllByTestId("people-directory-card");
    // Annie + David tie on shared=3; Annie wins on recent_collab=5 vs 1.
    expect(cards[0]).toHaveTextContent("Annie");
    expect(cards[1]).toHaveTextContent("David Odie");
    expect(cards[2]).toHaveTextContent("Walter");
  });

  it("surfaces the org name as a small badge in the card header", async () => {
    mockCtx([
      {
        entity_id: "a",
        display_name: "David Odie",
        email: null,
        title: "TECH LEAD",
        shared_project_count: 0,
        recent_collab_count: 0,
      },
    ]);
    render(<PeopleDirectory />);
    await waitFor(() =>
      expect(screen.getByTestId("people-directory")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("people-directory")).toHaveTextContent(
      "NIOV Labs",
    );
  });
});

describe("PeopleDirectory — empty + error states", () => {
  it("renders the empty state when the roster is empty", async () => {
    mockCtx([]);
    render(<PeopleDirectory />);
    await waitFor(() =>
      expect(screen.getByTestId("people-directory-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("people-directory-empty")).toHaveTextContent(
      "No teammates have been added",
    );
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
    render(<PeopleDirectory />);
    await waitFor(() =>
      expect(screen.getByTestId("people-directory-error")).toBeInTheDocument(),
    );
  });
});

describe("PeopleDirectory — roster-aware (NOT David-only)", () => {
  it("renders Vishesh + Samiksha + Annie with their friendly titles", async () => {
    mockCtx([
      {
        entity_id: "v",
        display_name: "Vishesh Sharma",
        email: "vishesh@niovlabs.com",
        title: "AI UI ENGINEER",
        shared_project_count: 2,
        recent_collab_count: 1,
      },
      {
        entity_id: "s",
        display_name: "Samiksha Sharma",
        email: "samiksha@niovlabs.com",
        title: "AI/NLP ENGINEER",
        shared_project_count: 2,
        recent_collab_count: 0,
      },
      {
        entity_id: "a",
        display_name: "Annie",
        email: "annie@niovlabs.com",
        title: "RISK & COMPLIANCE LEAD",
        shared_project_count: 1,
        recent_collab_count: 1,
      },
    ]);
    render(<PeopleDirectory />);
    await waitFor(() =>
      expect(screen.getByTestId("people-directory-list")).toBeInTheDocument(),
    );
    const node = screen.getByTestId("people-directory");
    expect(node).toHaveTextContent("Vishesh Sharma");
    expect(node).toHaveTextContent("AI UI Engineer");
    expect(node).toHaveTextContent("Samiksha Sharma");
    expect(node).toHaveTextContent("AI/NLP Engineer");
    expect(node).toHaveTextContent("Annie");
    expect(node).toHaveTextContent("Risk & Compliance Lead");
    // No David leaks.
    expect(node.textContent ?? "").not.toContain("David");
  });
});

describe("PeopleDirectory — privacy invariants (RULE 0)", () => {
  it("never renders TAR / wallet / clearance / permission internals", async () => {
    mockCtx([
      {
        entity_id: "id-david",
        display_name: "David Odie",
        email: "david@niovlabs.com",
        title: "TECH LEAD",
        shared_project_count: 3,
        recent_collab_count: 5,
      },
    ]);
    render(<PeopleDirectory />);
    await waitFor(() =>
      expect(screen.getByTestId("people-directory")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("people-directory").outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/can_admin_org/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/bearer/i);
  });
});
