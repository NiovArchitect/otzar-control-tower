// FILE: tests/unit/comms-page.test.tsx
// PURPOSE: Phase 1213 -- locks the Comms page lifecycle and the
//          hero flow (Start capture -> Otzar listens -> Otzar
//          organizes -> follow-ups ready). Covers: hero render,
//          end-capture POSTs the canonical text, extraction view
//          renders summary + decisions + commitments + follow-up
//          cards, manual import fallback, error state, privacy
//          invariant, and the consumer Send hits POST /actions
//          with the resolved entity_id (NOT David-only).
// CONNECTS TO: src/pages/app/Comms.tsx.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Comms } from "@/pages/app/Comms";
import { useAuthStore } from "@/lib/stores/auth";
import type { CommsExtractionResult } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(email = "sadeil@niovlabs.com"): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email },
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

function canonicalExtraction(): CommsExtractionResult {
  return {
    summary:
      "Sadeil, David, Samiksha, and Annie aligned on the Otzar launch follow-up.",
    decisions: [
      "Keep internal note workflows inside Otzar notifications only for now.",
      "Do not enable Slack or email sending until explicit connector approval is finished.",
    ],
    commitments: [
      "David reviews the UI flow by Friday.",
      "Samiksha reviews the AI/NLP trial notes and summarizes any concerns.",
      "Annie completes the compliance review this week once the summary is ready.",
    ],
    risks_or_blockers: [],
    suggested_actions: [
      {
        local_id: "demo-david",
        action_type: "SEND_INTERNAL_NOTIFICATION",
        target: {
          display_name: "David Odie",
          email: "david@niovlabs.com",
          entity_id: "id-david",
        },
        draft_text:
          "Hey David — please review the UI flow by Friday.",
        reason: "Otzar drafted this from the captured conversation.",
        source_excerpt:
          "Sadeil asked David to review the UI flow by Friday.",
        confidence: "HIGH",
        resolution_status: "RESOLVED",
      },
      {
        local_id: "demo-samiksha",
        action_type: "SEND_INTERNAL_NOTIFICATION",
        target: {
          display_name: "Samiksha Sharma",
          email: "samiksha@niovlabs.com",
          entity_id: "id-samiksha",
        },
        draft_text: "Hi Samiksha — please review the AI/NLP trial notes.",
        reason: "Otzar drafted this from the captured conversation.",
        source_excerpt: null,
        confidence: "HIGH",
        resolution_status: "RESOLVED",
      },
      {
        local_id: "demo-annie",
        action_type: "SEND_INTERNAL_NOTIFICATION",
        target: {
          display_name: "Annie",
          email: "annie@niovlabs.com",
          entity_id: "id-annie",
        },
        draft_text: "Hey Annie — compliance review this week if possible.",
        reason: "Otzar drafted this from the captured conversation.",
        source_excerpt: null,
        confidence: "HIGH",
        resolution_status: "RESOLVED",
      },
    ],
    extraction_mode: "DEMO_SCRIPTED",
  };
}

function mockExtract(
  responder?: (capturedText: string) => CommsExtractionResult,
): void {
  server.use(
    http.post(`${API_BASE}/otzar/comms/extract`, async ({ request }) => {
      const body = (await request.json()) as { captured_text?: string };
      const ex = responder?.(body.captured_text ?? "") ?? canonicalExtraction();
      return HttpResponse.json({ ok: true, extraction: ex });
    }),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <Comms />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useRealTimers();
  setAuth();
});

describe("Comms — HERO flow", () => {
  it("renders the 'Otzar is ready to capture' hero on first visit", () => {
    mockExtract();
    renderPage();
    expect(screen.getByTestId("comms-hero")).toHaveTextContent(
      "Otzar is ready to capture",
    );
    expect(screen.getByTestId("comms-start")).toBeInTheDocument();
    // Manual import is NOT the hero; it's a secondary button.
    expect(screen.getByTestId("comms-import-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("comms-import-toggle")).toHaveTextContent(
      "fallback",
    );
  });

  it("Start capture flips the page into the 'Otzar is listening' state", async () => {
    mockExtract();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    expect(screen.getByTestId("comms-capturing")).toHaveTextContent(
      "Otzar is listening",
    );
    expect(screen.queryByTestId("comms-hero")).toBeNull();
  });
});

describe("Comms — default cockpit (Phase 1285-L2)", () => {
  it("shows the conversation-intelligence cockpit, not just two buttons", () => {
    mockExtract();
    renderPage();
    // Capture controls present...
    expect(screen.getByTestId("comms-start")).toBeInTheDocument();
    expect(screen.getByTestId("comms-import-toggle")).toBeInTheDocument();
    // ...PLUS the cockpit: what Otzar turns conversations into + the flow.
    expect(screen.getByTestId("comms-cockpit")).toBeInTheDocument();
    expect(screen.getByTestId("comms-listens-for")).toBeInTheDocument();
    expect(screen.getAllByTestId("comms-listens-item").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId("comms-flow")).toBeInTheDocument();
  });

  it("names the four conversation-intelligence categories", () => {
    mockExtract();
    renderPage();
    const html = screen.getByTestId("comms-listens-for").outerHTML;
    expect(html).toContain("Follow-ups");
    expect(html).toContain("Decisions");
    expect(html).toContain("Blockers");
    expect(html).toContain("Commitments");
  });

  it("shows an honest 'recent conversation intelligence' empty state (no fake artifacts)", () => {
    mockExtract();
    renderPage();
    expect(screen.getByTestId("comms-recent-empty")).toHaveTextContent(
      "No captured conversation artifacts yet",
    );
  });

  it("the cockpit is gone once a capture review is showing", async () => {
    mockExtract();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() => expect(screen.getByTestId("comms-review")).toBeInTheDocument());
    expect(screen.queryByTestId("comms-cockpit")).toBeNull();
  });
});

describe("Comms — follow-up View/Why (Phase 1285-L)", () => {
  it("a follow-up exposes a Why disclosure with source + confidence + extraction", async () => {
    mockExtract();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-follow-up-row").length).toBeGreaterThan(0),
    );
    // Open the first follow-up's Why.
    const whyButtons = screen.getAllByTestId("comms-follow-up-why");
    await user.click(whyButtons[0]!);
    const panels = screen.getAllByTestId("comms-follow-up-view-why");
    const html = panels[0]!.outerHTML;
    // Source excerpt, confidence, and extraction mode are surfaced.
    expect(html).toContain("Source");
    expect(html.toLowerCase()).toContain("confidence");
    expect(html).toContain("Extraction");
    // No raw UUID leaked as a label.
    expect(html).not.toContain("id-david");
  });
});

describe("Comms — end capture posts canonical text + renders extraction", () => {
  it("end-capture posts assembled captured_text and renders summary/decisions/commitments/follow-ups", async () => {
    let capturedBody: { captured_text?: string } | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/comms/extract`, async ({ request }) => {
        capturedBody = (await request.json()) as { captured_text?: string };
        return HttpResponse.json({
          ok: true,
          extraction: canonicalExtraction(),
        });
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));

    await waitFor(() =>
      expect(screen.getByTestId("comms-review")).toBeInTheDocument(),
    );

    // POST body carries the Foundation auto-detection signal:
    // the "Launch Follow-Up Meeting" title + the three demo names.
    expect(capturedBody).not.toBeNull();
    const text = (capturedBody as unknown as { captured_text: string }).captured_text;
    expect(text).toMatch(/Launch Follow-Up Meeting/i);
    expect(text).toMatch(/David/);
    expect(text).toMatch(/Samiksha/);
    expect(text).toMatch(/Annie/);

    // Header surfaces the count (3 RESOLVED follow-ups).
    expect(screen.getByTestId("comms-review-header")).toHaveTextContent(
      "Otzar found 3 follow-ups",
    );
    // Decisions list (2 rows).
    expect(screen.getAllByTestId("comms-decision")).toHaveLength(2);
    // Commitments list (3 rows).
    expect(screen.getAllByTestId("comms-commitment")).toHaveLength(3);
    // 3 follow-up rows (NOT David-only).
    expect(screen.getAllByTestId("comms-follow-up-row")).toHaveLength(3);
    // Each row's inner card surfaces the recipient.
    const html = screen.getByTestId("comms-follow-ups").outerHTML;
    expect(html).toContain("David Odie");
    expect(html).toContain("Samiksha Sharma");
    expect(html).toContain("Annie");
    // Extraction mode badge shows the friendly label.
    expect(screen.getByTestId("comms-extraction-mode")).toHaveTextContent(
      "Demo capture mode",
    );
  });

  it("renders 'Live AI capture' badge when extraction_mode is LLM", async () => {
    mockExtract(() => ({ ...canonicalExtraction(), extraction_mode: "LLM" }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-extraction-mode")).toHaveTextContent(
        "Live AI capture",
      ),
    );
  });

  it("renders 'Local fallback' when extraction_mode is LOCAL_FALLBACK", async () => {
    mockExtract(() => ({
      summary: "Otzar captured this conversation but live extraction isn't configured.",
      decisions: [],
      commitments: [],
      risks_or_blockers: [],
      suggested_actions: [],
      extraction_mode: "LOCAL_FALLBACK",
    }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-extraction-mode")).toHaveTextContent(
        "Local fallback",
      ),
    );
    expect(screen.getByTestId("comms-no-follow-ups")).toBeInTheDocument();
  });
});

describe("Comms — Send goes through the existing governed Action pipeline", () => {
  it("each follow-up's Send hits POST /api/v1/actions with the resolved entity_id (NOT hardcoded David)", async () => {
    mockExtract();
    let lastActionBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/actions`, async ({ request }) => {
        lastActionBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-comms-1",
              source_entity_id: "u",
              org_entity_id: "o",
              target_entity_id:
                (lastActionBody?.payload_redacted as { recipient_entity_id: string })
                  ?.recipient_entity_id ?? null,
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "APPROVED",
              payload_summary: "x",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-follow-up-row")).toHaveLength(3),
    );

    // Click Send on the 2nd row (Samiksha) -- proves the page is NOT
    // hardcoded to row index 0 / David.
    const sendButtons = screen.getAllByTestId("ctx-send-button");
    expect(sendButtons).toHaveLength(3);
    await user.click(sendButtons[1]!);

    await waitFor(() => expect(lastActionBody).not.toBeNull());
    const body = lastActionBody as unknown as {
      action_type: string;
      payload_redacted: {
        recipient_entity_id: string;
        notification_class: string;
        body_summary: string;
      };
    };
    expect(body.action_type).toBe("SEND_INTERNAL_NOTIFICATION");
    expect(body.payload_redacted.recipient_entity_id).toBe("id-samiksha");
    expect(body.payload_redacted.notification_class).toBe("OTZAR_INTERNAL_NOTE");
    expect(body.payload_redacted.body_summary).toContain("Samiksha");
  });
});

describe("Comms — manual import fallback", () => {
  it("Import notes textarea posts the typed text to /comms/extract", async () => {
    let capturedBody: { captured_text?: string } | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/comms/extract`, async ({ request }) => {
        capturedBody = (await request.json()) as { captured_text?: string };
        return HttpResponse.json({
          ok: true,
          extraction: canonicalExtraction(),
        });
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-import-toggle"));
    const textarea = screen.getByTestId("comms-import-textarea");
    await user.type(textarea, "Some pasted meeting notes.");
    await user.click(screen.getByTestId("comms-import-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-review")).toBeInTheDocument(),
    );
    expect(
      (capturedBody as unknown as { captured_text: string }).captured_text,
    ).toBe("Some pasted meeting notes.");
  });
});

describe("Comms — error state", () => {
  it("renders the error state when /comms/extract fails", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/comms/extract`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_EXPIRED" },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("comms-error").textContent).toMatch(
      /couldn't organize/i,
    );
  });
});

describe("Comms — privacy invariants (RULE 0)", () => {
  it("never renders TAR / wallet / clearance / permission / payload internals", async () => {
    mockExtract();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-review")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("comms-page").outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/payload_redacted/i);
    expect(html).not.toMatch(/policy_envelope/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/bearer/i);
  });
});
