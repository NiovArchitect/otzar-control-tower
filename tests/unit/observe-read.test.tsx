// FILE: tests/unit/observe-read.test.tsx
// PURPOSE: Phase 1227 — locks the "Let Otzar read this" flow on the
//          Observe page: provider chips with friendly status labels,
//          sample + pasted-text extraction, decisions/commitments
//          rendering, approval-gated follow-ups, workspace attach,
//          calm copy, and non-blocking errors.
// CONNECTS TO: src/pages/app/Observe.tsx, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mkRecipientGovernance, mkAutonomy, emptyResponsibilityGraph } from "../fixtures/comms-governance";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Observe } from "@/pages/app/Observe";
import { useAuthStore } from "@/lib/stores/auth";
import type { ObserveCaptureView } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setWrite(): void {
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

beforeEach(() => setWrite());

function capture(
  overrides: Partial<ObserveCaptureView> = {},
): ObserveCaptureView {
  return {
    observe_capture_id: "obs-1",
    provider: "DEMO_FIXTURE",
    source_type: "DEMO",
    title: "Sample document",
    status: "EXTRACTED",
    extracted_text_summary: "Launch follow-up notes.",
    extraction: {
      summary: "Launch follow-up notes from the whiteboard.",
      decisions: ["Lock the launch date for the 24th."],
      commitments: ["David sends the revised flow on Thursday."],
      risks_or_blockers: [],
      suggested_actions: [
        {
          local_id: "sa-1",
          action_type: "SEND_INTERNAL_NOTIFICATION",
          target: {
            entity_id: "e-david",
            display_name: "David Odie",
            email: "david@niovlabs.com",
          },
          draft_text: "Hey David — reminder to send the revised flow.",
          reason: "David committed to the UI review follow-up.",
          source_excerpt: "David will own the UI review",
          confidence: "HIGH",
          resolution_status: "RESOLVED",
          recipient_governance: mkRecipientGovernance({ entity_id: "e-david", display_name: "David Odie" }),
          autonomy: mkAutonomy(),
        },
      ],
      extraction_mode: "DEMO_SCRIPTED",
      responsibility_graph: emptyResponsibilityGraph,
      lead_card: null,
    },
    workspace_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Observe — Let Otzar read this (Phase 1227)", () => {
  it("renders provider chips with friendly status labels", async () => {
    render(<Observe />);
    await waitFor(() =>
      expect(
        screen.getAllByTestId("observe-provider-chip").length,
      ).toBeGreaterThan(0),
    );
    const chips = screen
      .getAllByTestId("observe-provider-chip")
      .map((c) => c.textContent ?? "");
    expect(chips.some((c) => c.includes("Sample document"))).toBe(true);
    expect(chips.some((c) => c.includes("Needs setup"))).toBe(true);
    // Friendly copy only — never raw status enums.
    for (const c of chips) {
      expect(c).not.toContain("BLOCKED_BY_KEY");
      expect(c).not.toContain("NEEDS_PROVIDER_INSTALL");
    }
  });

  it("sample observe runs the pipeline and renders findings + gated follow-ups", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/observe/extract`, () =>
        HttpResponse.json({ ok: true, capture: capture() }, { status: 201 }),
      ),
    );
    render(<Observe />);
    await userEvent.click(await screen.findByTestId("observe-read-sample"));
    await waitFor(() =>
      expect(screen.getByTestId("observe-read-result")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("observe-read-summary")).toHaveTextContent(
      "Launch follow-up notes from the whiteboard.",
    );
    expect(screen.getByTestId("observe-read-decisions")).toHaveTextContent(
      "Lock the launch date for the 24th.",
    );
    expect(screen.getByTestId("observe-read-commitments")).toHaveTextContent(
      "David sends the revised flow on Thursday.",
    );
    // Follow-ups are presented for review — not executed.
    expect(screen.getByTestId("observe-read-followups")).toHaveTextContent(
      "needs your review",
    );
  });

  it("pasted text observe sends PLAIN_TEXT and clears the box on success", async () => {
    const sentBodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/observe/extract`, async ({ request }) => {
        sentBodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, capture: capture({ provider: "PLAIN_TEXT" }) },
          { status: 201 },
        );
      }),
    );
    render(<Observe />);
    await userEvent.type(
      screen.getByLabelText("Paste text from any document"),
      "We decided to renew the vendor contract.",
    );
    await userEvent.click(screen.getByTestId("observe-read-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("observe-read-result")).toBeInTheDocument(),
    );
    expect(sentBodies).toHaveLength(1);
    expect(sentBodies[0]?.provider).toBe("PLAIN_TEXT");
    expect(sentBodies[0]?.source_type).toBe("PLAIN_TEXT_SOURCE");
    expect(
      (screen.getByLabelText("Paste text from any document") as HTMLTextAreaElement)
        .value,
    ).toBe("");
  });

  it("attach to workspace reports the imported ledger counts", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/collaboration/workspaces`, () =>
        HttpResponse.json({
          ok: true,
          workspaces: [
            {
              workspace_id: "ws-1",
              title: "Launch Collaboration",
              status: "ACTIVE",
              visibility: "INTERNAL_ONLY",
              source_type: "MANUAL",
              created_at: new Date().toISOString(),
              counts: {
                members: 3,
                decisions: 0,
                commitments: 0,
                open_actions: 0,
                completed_actions: 0,
              },
            },
          ],
        }),
      ),
      http.post(`${API_BASE}/otzar/observe/extract`, () =>
        HttpResponse.json({ ok: true, capture: capture() }, { status: 201 }),
      ),
      http.post(`${API_BASE}/otzar/observe/obs-1/attach-workspace`, () =>
        HttpResponse.json({
          ok: true,
          capture: capture({ status: "ATTACHED", workspace_id: "ws-1" }),
          imported_decisions: 1,
          imported_commitments: 1,
        }),
      ),
    );
    render(<Observe />);
    await userEvent.click(await screen.findByTestId("observe-read-sample"));
    await waitFor(() =>
      expect(screen.getByTestId("observe-read-result")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByLabelText("Attach to a workspace"));
    await userEvent.click(await screen.findByText("Launch Collaboration"));
    await userEvent.click(screen.getByTestId("observe-read-attach"));
    await waitFor(() =>
      expect(
        screen.getByTestId("observe-read-attach-note"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId("observe-read-attach-note")).toHaveTextContent(
      "Added 1 decision and 1 commitment to the workspace.",
    );
  });

  it("read errors are calm and non-blocking — the page keeps working", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/observe/extract`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "PROVIDER_BLOCKED_BY_KEY",
            message:
              "Cloud document reading needs your organization's AWS setup first.",
          },
          { status: 409 },
        ),
      ),
    );
    render(<Observe />);
    await userEvent.click(await screen.findByTestId("observe-read-sample"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("needs your organization's AWS setup");
    // The quick-note form below is unaffected.
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
  });

  it("user-facing copy never leaks developer vocabulary", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/observe/extract`, () =>
        HttpResponse.json({ ok: true, capture: capture() }, { status: 201 }),
      ),
    );
    render(<Observe />);
    await userEvent.click(await screen.findByTestId("observe-read-sample"));
    await waitFor(() =>
      expect(screen.getByTestId("observe-read-result")).toBeInTheDocument(),
    );
    const visible = document.body.textContent ?? "";
    for (const banned of [
      "capsule_id",
      "wallet_id",
      "raw JSON",
      "OCR provider payload",
      "adapter",
    ]) {
      expect(visible).not.toContain(banned);
    }
  });
});
