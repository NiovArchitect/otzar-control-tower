// FILE: tests/unit/proposed-action-draft-tone.test.tsx
// PURPOSE: Phase 1286-B — locks the advisory DRAFT_TONE affordance on the
//          proposed-action card. Covers: the "Improve tone" control, the
//          authed call to /work-os/draft-tone/evaluate, advisory rendering with
//          the ORIGINAL preserved, explicit apply (editing buffer updated, NO
//          send), revert to original, FOUNDATION_DOWNGRADED handling (reason
//          shown, no apply), Python-down honest deterministic label, em-dash
//          revision not applicable, and the unchanged Send gate. No raw UUID
//          labels.
// CONNECTS TO: src/components/otzar/ProposedActionCard.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ProposedActionCard } from "@/components/otzar/ProposedActionCard";
import { useAuthStore } from "@/lib/stores/auth";
import type { ProposedAction, DraftToneAssessment, PythonAdvisoryEnvelope } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: false, can_admin_org: true, can_admin_niov: false },
  });
}

function pa(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    action_type: "SEND_INTERNAL_NOTIFICATION",
    target: { display_name: "David Odie", email: "david@niovlabs.com", entity_id: "id-david" },
    draft_text: "You failed to send this. Fix it ASAP.",
    reason: "Otzar drafted this from your request.",
    ...overrides,
  };
}

function assessment(over: Partial<DraftToneAssessment> = {}): DraftToneAssessment {
  return {
    original_draft: "You failed to send this. Fix it ASAP.",
    channel: "internal_message",
    quality_score: 50,
    tone_label: "TOO_HARSH",
    risk_flags: ["HARSH_TONE"],
    suggested_revision: "we still need to send this. Fix it as soon as you can.",
    reason: "harsh tone; suggested a cleaner revision.",
    confidence: "HIGH",
    approval_required: false,
    preserves_intent: true,
    provenance: "python:draft-tone",
    ...over,
  };
}

function env(over: Partial<PythonAdvisoryEnvelope> = {}): PythonAdvisoryEnvelope {
  return {
    status: "PYTHON_ENRICHED",
    source: "PYTHON_ADVISORY",
    authority: "FOUNDATION_VALIDATED",
    capability: "DRAFT_TONE",
    latency_ms: 44,
    provenance: "python:draft-tone",
    warnings: [],
    updated_at: new Date().toISOString(),
    ...over,
  };
}

function mockTone(body: Record<string, unknown>, status = 200): void {
  server.use(http.post(`${API_BASE}/work-os/draft-tone/evaluate`, () => HttpResponse.json(body, { status })));
}

function renderCard(p: ProposedAction = pa()): void {
  render(<ProposedActionCard proposedAction={p} />);
}

beforeEach(() => setAuth());

describe("ProposedActionCard — advisory draft tone", () => {
  it("shows an Improve tone control and renders a validated assessment as advisory", async () => {
    mockTone({ ok: true, assessment: assessment(), envelope: env() });
    renderCard();
    const btn = screen.getByTestId("ctx-improve-tone-button");
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("ctx-tone-panel")).toBeInTheDocument());
    expect(screen.getByTestId("ctx-tone-advisory-label").textContent).toBe("Advisory (Python)");
    expect(screen.getByTestId("ctx-tone-label").textContent).toContain("too harsh");
    expect(screen.getByTestId("ctx-tone-quality").textContent).toContain("50");
    expect(screen.getByTestId("ctx-tone-flag").textContent).toContain("harsh tone");
    // Original is always visible.
    expect(screen.getByTestId("ctx-tone-original").textContent).toContain("You failed to send this");
    expect(screen.getByTestId("ctx-tone-suggested").textContent).toContain("as soon as you can");
  });

  it("applies the suggested revision to the local draft WITHOUT sending; original is recoverable", async () => {
    let actionsCalled = false;
    server.use(http.post(`${API_BASE}/actions`, () => { actionsCalled = true; return HttpResponse.json({ ok: true, action: { action_id: "a1" } }); }));
    mockTone({ ok: true, assessment: assessment(), envelope: env() });
    renderCard();
    await userEvent.click(screen.getByTestId("ctx-improve-tone-button"));
    await waitFor(() => expect(screen.getByTestId("ctx-tone-use")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("ctx-tone-use"));
    // The editing buffer now holds the revision; nothing was sent.
    const edit = (await screen.findByTestId("ctx-draft-edit")) as HTMLTextAreaElement;
    expect(edit.value).toContain("as soon as you can");
    expect(actionsCalled).toBe(false);
    expect(screen.queryByTestId("proposed-action-card-sent")).toBeNull();
    // The Send gate is still present + unchanged.
    expect(screen.getByTestId("ctx-send-button")).toBeInTheDocument();
    // Original is recoverable.
    await userEvent.click(screen.getByTestId("ctx-revert-original"));
    expect(screen.getByTestId("ctx-draft").textContent).toContain("You failed to send this");
    expect(actionsCalled).toBe(false);
  });

  it("shows the downgrade reason and offers no revision when Foundation downgrades", async () => {
    mockTone({
      ok: true,
      assessment: assessment({ suggested_revision: "", provenance: "foundation:deterministic-tone" }),
      envelope: env({ status: "FOUNDATION_DOWNGRADED", authority: null, provenance: "foundation:deterministic-tone", warnings: ["suggested revision rejected: contains an em dash"] }),
    });
    renderCard();
    await userEvent.click(screen.getByTestId("ctx-improve-tone-button"));
    await waitFor(() => expect(screen.getByTestId("ctx-tone-downgraded")).toBeInTheDocument());
    expect(screen.getByTestId("ctx-tone-downgraded").textContent).toMatch(/kept your original/i);
    expect(screen.queryByTestId("ctx-tone-use")).toBeNull();
    // Original still primary.
    expect(screen.getByTestId("ctx-draft").textContent).toContain("You failed to send this");
  });

  it("renders honestly with a deterministic label when Python is down", async () => {
    mockTone({
      ok: true,
      assessment: assessment({ provenance: "foundation:deterministic-tone" }),
      envelope: env({ status: "UNHEALTHY", authority: null, provenance: "foundation:deterministic-tone" }),
    });
    renderCard();
    await userEvent.click(screen.getByTestId("ctx-improve-tone-button"));
    await waitFor(() => expect(screen.getByTestId("ctx-tone-advisory-label")).toBeInTheDocument());
    expect(screen.getByTestId("ctx-tone-advisory-label").textContent).toBe("Otzar (checked)");
    expect(screen.getByTestId("ctx-tone-provenance").textContent).toMatch(/unhealthy/);
  });

  it("does not offer a revision that contains an em dash (kept original)", async () => {
    mockTone({ ok: true, assessment: assessment({ suggested_revision: "Hi David — please send this." }), envelope: env() });
    renderCard();
    await userEvent.click(screen.getByTestId("ctx-improve-tone-button"));
    await waitFor(() => expect(screen.getByTestId("ctx-tone-unsafe")).toBeInTheDocument());
    expect(screen.queryByTestId("ctx-tone-use")).toBeNull(); // never applyable
    expect(screen.getByTestId("ctx-draft").textContent).toContain("You failed to send this");
  });

  it("shows an honest error when the tone check fails, leaving the draft unchanged", async () => {
    mockTone({ ok: false, code: "API_ERROR" }, 500);
    renderCard();
    await userEvent.click(screen.getByTestId("ctx-improve-tone-button"));
    await waitFor(() => expect(screen.getByTestId("ctx-tone-error")).toBeInTheDocument());
    expect(screen.getByTestId("ctx-draft").textContent).toContain("You failed to send this");
  });

  it("never renders a raw entity id as a label in the tone panel", async () => {
    mockTone({ ok: true, assessment: assessment(), envelope: env() });
    renderCard();
    await userEvent.click(screen.getByTestId("ctx-improve-tone-button"));
    await waitFor(() => expect(screen.getByTestId("ctx-tone-panel")).toBeInTheDocument());
    expect(screen.getByTestId("ctx-tone-panel").textContent).not.toContain("id-david");
  });
});
