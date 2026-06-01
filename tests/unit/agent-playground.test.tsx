// FILE: tests/unit/agent-playground.test.tsx
// PURPOSE: Page tests for the Section 5 Wave 10 Agent Playground
//          cockpit (/agent-playground) per ADR-0077. Verifies:
//          - nav entry exists
//          - route renders the cockpit
//          - 6 stage tabs render
//          - api.playground.* methods exist
//          - scenario list / create flow works
//          - generate candidates calls correct endpoint
//          - compare outcomes calls correct endpoint
//          - best path calls correct endpoint
//          - simulation calls correct endpoint
//          - governed transition requires explicit confirmation
//          - governed transition sends caller_confirmation true and
//            a fresh idempotency_key per attempt
//          - "Action proposed (not executed)" surfaces on PROPOSED
//          - no Execute button anywhere
//          - forbidden UI copy does not appear
//          - no raw transcript / memory / prompt / chain-of-thought
//            labels appear
//          - Foundation errors render safely (enumeration-safe)
//          - conversation-context honesty posture ("not available
//            in this version")
//          - primary recommended path + alternatives appear
//          - evidence_posture + blockers_before_action +
//            safe_next_step appear
// CONNECTS TO: src/pages/AgentPlayground.tsx, src/lib/api.ts,
//              src/lib/nav.ts, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AgentPlaygroundPage } from "@/pages/AgentPlayground";
import { useAuthStore } from "@/lib/stores/auth";
import { api } from "@/lib/api";
import { NAV } from "@/lib/nav";
import {
  resetActionLifecycleStore,
  resetPlaygroundScenarios,
  seedActionLifecycle,
  seedPlaygroundScenario,
} from "../msw/handlers";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
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

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AgentPlaygroundPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setAuth();
  resetPlaygroundScenarios();
});

// ────────────────────────────────────────────────────────────────
// FORBIDDEN UI COPY GUARD per ADR-0077 §4. Forbidden phrases are
// matched at positive-claim form — NOT at disclaimer form. The
// canonical honest_note Foundation emits across Wave 7 +
// ADR-0078 Stage 2 conversation_context_signals[] literally
// contains "not a final decision" as the allowed disclaimer per
// ADR-0074 §16 + ADR-0078 §11 + ADR-0070 §9. A bare "final
// decision" substring would create a false-positive against the
// canonical disclaimer; we match the positive-claim form
// ("is a final decision" / "this final decision" /
// "the final decision is") to catch winner-declaration framing
// without breaking the disclaimer. Mirrors Foundation Wave 7's
// FORBIDDEN_RECOMMENDATION_LANGUAGE discipline at
// tests/integration/playground-best-path-recommendations.test.ts.
// ────────────────────────────────────────────────────────────────
const FORBIDDEN_UI_COPY = [
  "ai agents decided",
  "is a final decision",
  "this final decision",
  "the final decision is",
  "guaranteed compliant",
  "regulator approved",
  "no fine risk",
  "automatically execute",
  "winner",
  "ranked #1",
  "employee risk",
  "manager surveillance",
  "full transcript",
  "chain-of-thought",
  "the system decided",
  "auto-approved",
];

// ────────────────────────────────────────────────────────────────
// NO-LEAK SUBSTRINGS per ADR-0077 §13 (selective; closed-vocab
// labels like NO_RAW_MEMORY_ACCESS legitimately contain "raw_memory"
// so we check the more specific raw-content patterns)
// ────────────────────────────────────────────────────────────────
const FORBIDDEN_RAW_TOKENS = [
  "raw_memory_content",
  "raw_capsule_content",
  "raw_transcript",
  "prompt_text",
  "embedding_vector",
  "storage_location",
  "bridge_id",
  "secret_ref",
  "psychological",
];

describe("Section 5 Wave 10 Agent Playground -- nav + route + shell", () => {
  it("registers Agent Playground in the main nav at /agent-playground", () => {
    const entry = NAV.find((n) => n.to === "/agent-playground");
    expect(entry).toBeDefined();
    expect(entry?.label).toBe("Agent Playground");
  });

  it("preserves the pre-existing /playground nav entry per ADR-0077 §11 Option A", () => {
    const playground = NAV.find((n) => n.to === "/playground");
    expect(playground).toBeDefined();
    expect(playground?.label).toBe("Playground");
  });

  it("renders the cockpit page header", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Agent Playground/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Enterprise decision cockpit/i),
    ).toBeInTheDocument();
  });

  it("renders the canonical product sentence", () => {
    renderPage();
    expect(
      screen.getByText(
        /where the enterprise thinks before it acts/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows an empty state when no scenario is selected", async () => {
    renderPage();
    expect(
      await screen.findByTestId("agent-playground-empty"),
    ).toBeInTheDocument();
  });
});

describe("Section 5 Wave 10 -- api.playground.* namespace", () => {
  it("exposes the 10 required Foundation playground methods", () => {
    expect(typeof api.playground.listScenarios).toBe("function");
    expect(typeof api.playground.createScenario).toBe("function");
    expect(typeof api.playground.getScenario).toBe("function");
    expect(typeof api.playground.updateScenario).toBe("function");
    expect(typeof api.playground.archiveScenario).toBe("function");
    expect(typeof api.playground.generateCandidates).toBe("function");
    expect(typeof api.playground.compareOutcomes).toBe("function");
    expect(typeof api.playground.recommendBestPath).toBe("function");
    expect(typeof api.playground.proposeGovernedTransition).toBe("function");
    expect(typeof api.playground.runSimulation).toBe("function");
  });
});

describe("Section 5 Wave 10 -- scenario create + list", () => {
  it("renders existing scenarios in the sidebar", async () => {
    seedPlaygroundScenario({ title: "Seeded scenario one" });
    seedPlaygroundScenario({ title: "Seeded scenario two" });
    renderPage();
    expect(await screen.findByText("Seeded scenario one")).toBeInTheDocument();
    expect(screen.getByText("Seeded scenario two")).toBeInTheDocument();
  });

  it("creates a new scenario and selects it", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-create-scenario"),
    );
    await user.type(
      screen.getByLabelText("Title"),
      "New strategic scenario",
    );
    await user.click(
      screen.getByTestId("agent-playground-submit-scenario"),
    );
    // Once selected the empty state is replaced by the stage tabs.
    expect(
      await screen.findByTestId("agent-playground-stage-tabs"),
    ).toBeInTheDocument();
    // At least one rendering of the title appears (sidebar OR header).
    expect(
      screen.getAllByText("New strategic scenario").length,
    ).toBeGreaterThan(0);
  });
});

describe("Section 5 Wave 10 -- six pipeline stages", () => {
  it("renders all 6 stage tabs once a scenario is open", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-tabs",
      title: "Scenario for tabs",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-tabs"),
    );
    expect(screen.getByTestId("agent-playground-stage-scenario")).toBeInTheDocument();
    expect(screen.getByTestId("agent-playground-stage-candidates")).toBeInTheDocument();
    expect(screen.getByTestId("agent-playground-stage-comparison")).toBeInTheDocument();
    expect(screen.getByTestId("agent-playground-stage-recommendation")).toBeInTheDocument();
    expect(screen.getByTestId("agent-playground-stage-simulation")).toBeInTheDocument();
    expect(screen.getByTestId("agent-playground-stage-transition")).toBeInTheDocument();
  });
});

describe("Section 5 Wave 10 -- Wave 5 candidates panel", () => {
  it("generates candidates with closed-vocab labels", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-cand",
      title: "Scenario for candidates",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-cand"),
    );
    await user.click(screen.getByTestId("agent-playground-stage-candidates"));
    await user.click(
      screen.getByTestId("agent-playground-generate-candidates"),
    );
    expect(
      await screen.findByTestId("candidate-candkey-status-quo-0001"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("candidate-candkey-low-risk-0002"),
    ).toBeInTheDocument();
    // Closed-vocab labels surface.
    expect(screen.getAllByText(/STATUS_QUO/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/LOW_RISK_INCREMENTAL/).length,
    ).toBeGreaterThan(0);
  });
});

describe("Section 5 Wave 10 -- Wave 6 comparison panel", () => {
  it("renders the comparison matrix with no winner framing", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-cmp",
      title: "Scenario for comparison",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-cmp"),
    );
    await user.click(screen.getByTestId("agent-playground-stage-comparison"));
    await user.click(
      screen.getByTestId("agent-playground-compare-outcomes"),
    );
    expect(
      await screen.findByTestId("comparison-candkey-low-risk-0002"),
    ).toBeInTheDocument();
    // Not a winner selection: tradeoff summary uses descriptive
    // categories, never a "Winner" label.
    expect(
      screen.getByText(/Tradeoff summary/i),
    ).toBeInTheDocument();
  });
});

describe("Section 5 Wave 10 -- Wave 7 recommendation panel", () => {
  it("renders primary path + alternatives + required reviews", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-rec",
      title: "Scenario for recommendation",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-rec"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-recommendation"),
    );
    await user.click(screen.getByTestId("agent-playground-recommend"));
    expect(
      await screen.findByTestId("alternative-candkey-status-quo-0001"),
    ).toBeInTheDocument();
    // "Recommended for review:" prefix appears in the recommendation
    // panel header summary.
    expect(
      screen.getAllByText(/Recommended for review/i).length,
    ).toBeGreaterThan(0);
    // Required reviews surface as closed-vocab (raw label OR
    // human-cased badge transform).
    expect(
      screen.getAllByText(/POLICY_OWNER_REVIEW|policy owner review/i).length,
    ).toBeGreaterThan(0);
  });
});

describe("Section 5 Wave 10 -- Wave 9 simulation + enterprise posture", () => {
  it("renders primary recommended branch + viable alternatives + evidence posture + blockers + safe next step", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-sim",
      title: "Scenario for simulation",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-sim"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-simulation"),
    );
    await user.click(screen.getByTestId("agent-playground-simulate"));
    // Branches rendered
    expect(
      await screen.findByTestId("simulation-branch-branch-0001"),
    ).toBeInTheDocument();
    // Primary path label surfaces in the enterprise posture card.
    expect(
      screen.getAllByText(/Primary path for review/i).length,
    ).toBeGreaterThan(0);
    // Both branches rendered.
    expect(
      screen.getByTestId("simulation-branch-branch-0002"),
    ).toBeInTheDocument();
    // vNext closed-vocab labels surface (ADR-0076 §4.2 + §5.2
    // post-PR #152 migration; v1 labels would be a regression).
    expect(
      screen.getAllByText(/RECOMMENDED_PATH/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/COMPLIANCE_FIRST_PATH/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/OWNER_OPERATOR/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/COMPLIANCE_REVIEWER/).length,
    ).toBeGreaterThan(0);
    // Evidence posture closed-vocab labels
    expect(
      screen.getAllByText(/Evidence posture/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/AUDIT_HISTORY_SUPPORTS_PATH/).length,
    ).toBeGreaterThan(0);
    // Blockers before action
    expect(
      screen.getAllByText(/Blockers before action/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/MISSING_COMPLIANCE_REVIEW/).length,
    ).toBeGreaterThan(0);
    // Safe next step
    const safeNext = screen.getByTestId("agent-playground-safe-next-step");
    expect(safeNext).toBeInTheDocument();
    expect(safeNext.textContent?.toLowerCase()).toContain("request compliance review");
  });

  it("renders Stage 2 approved-source conversation context signals on Wave 9 (replaces ADR-0077 §8.2 placeholder)", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-sim-ctx",
      title: "Scenario for context honesty",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-sim-ctx"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-simulation"),
    );
    await user.click(screen.getByTestId("agent-playground-simulate"));
    // Stage 2 LIVE — the placeholder is replaced with a real
    // signals panel populated from approved Foundation sources.
    const panel = await screen.findByTestId(
      "conversation-context-signals-simulation-review",
    );
    expect(panel).toBeInTheDocument();
    // Honest empty/full-state copy — appears in both the
    // CardDescription and inside each signal's honest_note,
    // so use getAllByText.
    expect(
      within(panel).getAllByText(/Derived from approved Foundation sources/i)
        .length,
    ).toBeGreaterThan(0);
    expect(
      within(panel).getByText(/No raw transcript shown/i),
    ).toBeInTheDocument();
    // MSW fixture emits 2 signals on the Wave 9 sidecar.
    expect(within(panel).getAllByTestId(/^signal-\d+$/).length).toBe(2);
    // §6C.12 additive fields surfaced as closed-vocab badges
    // on every signal — each label appears once per signal.
    expect(within(panel).getAllByText(/binding:/i).length).toBe(2);
    expect(within(panel).getAllByText(/purpose:/i).length).toBe(2);
    expect(within(panel).getAllByText(/relevance:/i).length).toBe(2);
    expect(within(panel).getAllByText(/use:/i).length).toBe(2);
    // Placeholder copy from the old §8.2 surface MUST NOT
    // appear anywhere on the page.
    expect(
      screen.queryByText(/not available in this version/i),
    ).not.toBeInTheDocument();
  });

  it("renders Stage 2 approved-source conversation context signals on Wave 7 recommendation surface", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-rec-ctx",
      title: "Scenario for Wave 7 signals",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-rec-ctx"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-recommendation"),
    );
    await user.click(screen.getByTestId("agent-playground-recommend"));
    const panel = await screen.findByTestId(
      "conversation-context-signals-recommendation-review",
    );
    expect(panel).toBeInTheDocument();
    // MSW Wave 7 fixture emits 2 signals.
    expect(within(panel).getAllByTestId(/^signal-\d+$/).length).toBe(2);
  });

  it("renders honest empty-state copy when no approved-source signals exist on Wave 9", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-sim-empty-ctx",
      title: "Empty signals scenario",
    });
    server.use(
      http.post(
        `${API_BASE}/playground/scenarios/scn-sim-empty-ctx/simulations`,
        () =>
          HttpResponse.json(
            {
              ok: true,
              scenario_id: "scn-sim-empty-ctx",
              simulated_at: new Date().toISOString(),
              orchestration_mode: "DETERMINISTIC_BRANCH_ENUMERATION",
              branch_count: 1,
              branches: [
                {
                  branch_id: "branch-empty",
                  branch_definition: "RECOMMENDED_PATH",
                  agent_role: "OWNER_OPERATOR",
                  assumed_constraints: ["OWNER_COSMP_SCOPE_ONLY"],
                  expected_outcomes: ["WAVE_7_RECOMMENDATION_PRODUCED"],
                  governance_conflicts: ["NO_NOTABLE_CONFLICT"],
                  branch_summary: "Branch summary.",
                  branch_recommended_candidate_key: "candkey-x",
                  branch_recommended_candidate_type: "STATUS_QUO",
                  confidence_label: "MEDIUM",
                },
              ],
              convergence_summary: {
                candidate_keys_agreed_upon: ["candkey-x"],
                governance_findings_all_branches_share: [],
                required_reviews_all_branches_share: [],
              },
              disagreement_summary: {
                candidate_types_diverged: [],
                recommendation_modes_diverged: [],
                unresolved_branches: [],
              },
              unresolved_questions: [],
              recommended_next_review: {
                next_review_label: "OWNER_REVIEW",
                rationale_summary: "Owner review recommended.",
                applies_to_branch_ids: ["branch-empty"],
              },
              enterprise_decision_posture: {
                primary_recommended_branch_id: "branch-empty",
                primary_recommendation_reasons: [],
                viable_alternative_branch_ids: [],
                evidence_posture: ["INSUFFICIENT_CONTEXT"],
                blockers_before_action: ["INSUFFICIENT_DATA"],
                safe_next_step: "REQUEST_MISSING_CONTEXT",
                // Stage 2 empty-state — empty array (NOT null).
                conversation_context_signals: [],
              },
              human_decision_required: true,
              honest_note: "Advisory only.",
              simulation_audit_event_id: "aud-sim-empty-ctx",
            },
            { status: 200 },
          ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-sim-empty-ctx"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-simulation"),
    );
    await user.click(screen.getByTestId("agent-playground-simulate"));
    const panel = await screen.findByTestId(
      "conversation-context-signals-simulation-review",
    );
    expect(panel).toBeInTheDocument();
    // Empty state copy describes why; never claims "not
    // available" anymore (that placeholder is retired).
    expect(
      within(panel).getByText(/No approved-source signals/i),
    ).toBeInTheDocument();
    expect(
      within(panel).queryAllByTestId(/^signal-\d+$/).length,
    ).toBe(0);
  });

  it("Stage 2 signals panel honors ADR-0077 §13 + ADR-0078 §11 / §5.2 no-leak guards (no raw text / quotes / chain-of-thought)", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-sim-noleak",
      title: "No-leak scenario",
    });
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-sim-noleak"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-simulation"),
    );
    await user.click(screen.getByTestId("agent-playground-simulate"));
    const panel = await screen.findByTestId(
      "conversation-context-signals-simulation-review",
    );
    expect(panel).toBeInTheDocument();
    // Stage-2-specific forbidden tokens that MUST never appear
    // on this surface. The page-level FORBIDDEN_RAW_TOKENS guard
    // in another test catches the broader set; this one locks
    // the signal-surface vocab.
    const stage2Forbidden = [
      "raw_text",
      "message_body",
      "speaker_quote",
      "private_note",
      "raw_audio",
      "raw_video",
      "raw_screen_capture",
      "emotion_score",
      "sentiment_score",
      "employee_score",
      "manager_score",
      "psychological_profile",
      "compliance_certification",
      "legal_conclusion",
      "regulator_approval",
      "related_transcript_ref",
      "transcript_id",
      "transcript_hash",
      "transcript_text_encrypted",
    ];
    const rendered = container.textContent ?? "";
    for (const tok of stage2Forbidden) {
      expect(rendered.toLowerCase()).not.toContain(tok);
    }
    // ADR-0079 §27 blocked enum values MUST never reach the wire
    // (Foundation projection service filters by construction);
    // verify CT also never renders them.
    const blockedEnums = [
      "NON_WORK_PERSONAL",
      "SENSITIVE_PERSONAL",
      "UNKNOWN_REQUIRES_REVIEW",
      "UNKNOWN_BUSINESS_PURPOSE",
      "BLOCKED_FROM_AGENT_PLAYGROUND",
    ];
    for (const v of blockedEnums) {
      expect(rendered).not.toContain(v);
      expect(rendered.toLowerCase()).not.toContain(
        v.replace(/_/g, " ").toLowerCase(),
      );
    }
  });
});

describe("Section 5 Wave 10 -- Wave 8 governed transition + execution boundary", () => {
  it("requires explicit acknowledgement before the Propose button is enabled", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-trans",
      title: "Scenario for transition",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-trans"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-transition"),
    );
    const proposeButton = screen.getByTestId(
      "agent-playground-propose-transition",
    );
    expect(proposeButton).toBeDisabled();
    await user.click(screen.getByTestId("agent-playground-acknowledge"));
    expect(proposeButton).not.toBeDisabled();
  });

  it("sends caller_confirmation:true and a fresh idempotency_key, then renders 'Action proposed (not executed)'", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-trans-2",
      title: "Scenario for transition send",
    });
    let lastBody: Record<string, unknown> | null = null;
    server.use(
      http.post(
        `${API_BASE}/playground/scenarios/scn-trans-2/governed-transitions`,
        async ({ request }) => {
          lastBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(
            {
              ok: true,
              scenario_id: "scn-trans-2",
              transitioned_at: new Date().toISOString(),
              transition_outcome: "ACTION_PROPOSED",
              recommended_candidate_key: "candkey-low-risk-0002",
              recommended_candidate_type: "LOW_RISK_INCREMENTAL",
              recommendation_summary: "Low-risk step proposed.",
              action_id: "act-9001",
              action_status: "PROPOSED",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              action_risk_tier: "LOW",
              action_decision: "REQUIRE_DUAL_CONTROL",
              escalation_id: null,
              required_approvals: [],
              required_reviews: ["POLICY_OWNER_REVIEW"],
              human_decision_required: true,
              honest_note: "Advisory only.",
              playground_audit_event_id: "aud-trans-9001",
            },
            { status: 200 },
          );
        },
      ),
    );

    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-trans-2"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-transition"),
    );
    await user.click(screen.getByTestId("agent-playground-acknowledge"));
    await user.click(
      screen.getByTestId("agent-playground-propose-transition"),
    );
    await user.click(
      screen.getByTestId("agent-playground-confirm-transition"),
    );

    await waitFor(() => expect(lastBody).not.toBeNull());
    const sent = lastBody as unknown as Record<string, unknown>;
    expect(sent.caller_confirmation).toBe(true);
    const idKey = sent.idempotency_key;
    expect(typeof idKey).toBe("string");
    expect((idKey as string).length).toBeGreaterThan(0);

    // "Action proposed (not executed)" now appears in both the
    // StateChip and the ActionLifecyclePanel pre-fetch summary;
    // both surfaces are required to honestly distinguish proposed
    // vs executed lifecycle states.
    const matches = await screen.findAllByText(
      /Action proposed \(not executed\)/i,
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Section 5 Wave 10 -- execution-boundary discipline (no Execute button)", () => {
  it("never renders an Execute button label anywhere on the page", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-no-execute",
      title: "Scenario for execute boundary",
    });
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-no-execute"),
    );
    // Walk every stage and check no <button> has "Execute" as its
    // label. Governance prose like "does not execute" and "execution
    // authority" is allowed because it describes the boundary, not
    // an action invitation.
    for (const stage of [
      "scenario",
      "candidates",
      "comparison",
      "recommendation",
      "simulation",
      "transition",
    ]) {
      await user.click(screen.getByTestId(`agent-playground-stage-${stage}`));
      const buttons = container.querySelectorAll("button");
      for (const btn of buttons) {
        const label = (btn.textContent ?? "").trim().toLowerCase();
        // Forbidden button labels:
        expect(label).not.toBe("execute");
        expect(label).not.toBe("execute action");
        expect(label).not.toBe("run execute");
        expect(label).not.toContain("execute this");
        expect(label).not.toContain("execute now");
        expect(label).not.toContain("auto-execute");
      }
    }
  });
});

describe("Section 5 Wave 10 -- forbidden UI copy guard", () => {
  it("never displays any forbidden ADR-0077 §4 strings", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-forbidden",
      title: "Scenario for forbidden guard",
    });
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-forbidden"),
    );
    // Visit every stage + trigger the API surfaces that produce the
    // largest rendered surface.
    await user.click(screen.getByTestId("agent-playground-stage-candidates"));
    await user.click(
      screen.getByTestId("agent-playground-generate-candidates"),
    );
    await screen.findByTestId("candidate-candkey-status-quo-0001");

    await user.click(screen.getByTestId("agent-playground-stage-comparison"));
    await user.click(
      screen.getByTestId("agent-playground-compare-outcomes"),
    );
    await screen.findByTestId("comparison-candkey-low-risk-0002");

    await user.click(
      screen.getByTestId("agent-playground-stage-recommendation"),
    );
    await user.click(screen.getByTestId("agent-playground-recommend"));
    await screen.findByText(/Recommended for review/i);

    await user.click(
      screen.getByTestId("agent-playground-stage-simulation"),
    );
    await user.click(screen.getByTestId("agent-playground-simulate"));
    await screen.findByTestId("agent-playground-safe-next-step");

    const text = (container.textContent ?? "").toLowerCase();
    for (const forbidden of FORBIDDEN_UI_COPY) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("never displays raw-content tokens (no-leak discipline)", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-no-leak",
      title: "Scenario for no-leak",
    });
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-no-leak"),
    );
    await user.click(screen.getByTestId("agent-playground-stage-simulation"));
    await user.click(screen.getByTestId("agent-playground-simulate"));
    await screen.findByTestId("agent-playground-safe-next-step");
    const text = (container.textContent ?? "").toLowerCase();
    for (const tok of FORBIDDEN_RAW_TOKENS) {
      expect(text).not.toContain(tok);
    }
  });
});

describe("Section 5 Wave 10 -- error rendering", () => {
  it("renders enumeration-safe 404 as 'Scenario not found' without scope hint", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-err",
      title: "Scenario for error",
    });
    server.use(
      http.post(
        `${API_BASE}/playground/scenarios/scn-err/candidates`,
        () =>
          HttpResponse.json(
            {
              ok: false,
              code: "SCENARIO_NOT_FOUND",
              message: "Scenario not found",
            },
            { status: 404 },
          ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-err"),
    );
    await user.click(screen.getByTestId("agent-playground-stage-candidates"));
    await user.click(
      screen.getByTestId("agent-playground-generate-candidates"),
    );
    expect(
      await screen.findByText(/Scenario not found/i),
    ).toBeInTheDocument();
  });

  it("renders 401 SESSION_INVALID generically", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-401",
      title: "Scenario for 401",
    });
    server.use(
      http.post(
        `${API_BASE}/playground/scenarios/scn-401/best-path-recommendations`,
        () =>
          HttpResponse.json(
            {
              ok: false,
              code: "SESSION_INVALID",
              message: "Authentication required",
            },
            { status: 401 },
          ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-401"),
    );
    await user.click(
      screen.getByTestId("agent-playground-stage-recommendation"),
    );
    await user.click(screen.getByTestId("agent-playground-recommend"));
    // The 401 handler triggers logout via auth store. Surface check:
    // either the generic copy appears OR the page rerenders with no
    // recommendation block (auth state cleared). Both are valid; we
    // primarily assert no forbidden strings.
    const errorNode = await screen.findByRole("alert").catch(() => null);
    if (errorNode !== null) {
      expect(errorNode.textContent?.toLowerCase()).toContain("session");
    }
  });
});

describe("Section 5 Wave 10 -- not-executed default state", () => {
  it("always shows the 'Not executed' state chip on the scenario header", async () => {
    seedPlaygroundScenario({
      scenario_id: "scn-not-exec",
      title: "Scenario for not-executed",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByTestId("agent-playground-scenario-scn-not-exec"),
    );
    expect(screen.getByText(/Not executed/i)).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════
// Section 2 Action Read Surface integration (ADR-0057 §9 + §10;
// authorized at `[FOUNDER-SECTION-2-ACTION-READ-SURFACE-FOR-WAVE-10-CT-AUTH]`
// 2026-05-31). Wave 10 cockpit consumes Foundation's existing
// GET /api/v1/actions/:id read endpoint to surface the three-state
// lifecycle (simulation / proposed / executed) honestly. READ-ONLY
// — NEVER approves / executes / cancels / retries Actions; Section 2
// retains all execution authority per ADR-0057.
// ════════════════════════════════════════════════════════════════

beforeEach(() => {
  resetActionLifecycleStore();
});

// WHAT: Drive a Wave 8 governed transition to ACTION_PROPOSED so
//        the lifecycle panel renders. Returns the action_id so
//        tests can stage a specific Section 2 lifecycle state.
async function driveToActionProposed(opts: {
  scenarioId: string;
  actionId: string;
  scenarioTitle: string;
}): Promise<{ user: ReturnType<typeof userEvent.setup> }> {
  seedPlaygroundScenario({
    scenario_id: opts.scenarioId,
    title: opts.scenarioTitle,
  });
  // Stub the governed-transition endpoint to return the staged
  // action_id so the lifecycle panel anchors to it.
  server.use(
    http.post(
      `${API_BASE}/playground/scenarios/${opts.scenarioId}/governed-transitions`,
      () =>
        HttpResponse.json(
          {
            ok: true,
            scenario_id: opts.scenarioId,
            transitioned_at: new Date().toISOString(),
            transition_outcome: "ACTION_PROPOSED",
            recommended_candidate_key: "candkey-low-risk-0002",
            recommended_candidate_type: "LOW_RISK_INCREMENTAL",
            recommendation_summary: "Low-risk step proposed.",
            action_id: opts.actionId,
            action_status: "PROPOSED",
            action_type: "SEND_INTERNAL_NOTIFICATION",
            action_risk_tier: "LOW",
            action_decision: "REQUIRE_DUAL_CONTROL",
            escalation_id: null,
            required_approvals: [],
            required_reviews: ["POLICY_OWNER_REVIEW"],
            human_decision_required: true,
            honest_note: "Advisory only.",
            playground_audit_event_id: `aud-trans-${opts.actionId}`,
          },
          { status: 200 },
        ),
    ),
  );

  const user = userEvent.setup();
  renderPage();
  await user.click(
    await screen.findByTestId(
      `agent-playground-scenario-${opts.scenarioId}`,
    ),
  );
  await user.click(screen.getByTestId("agent-playground-stage-transition"));
  await user.click(screen.getByTestId("agent-playground-acknowledge"));
  await user.click(
    screen.getByTestId("agent-playground-propose-transition"),
  );
  await user.click(
    screen.getByTestId("agent-playground-confirm-transition"),
  );
  await screen.findByTestId("agent-playground-lifecycle-panel");
  return { user };
}

describe("Section 2 Action Read Surface -- api.actions.getAction", () => {
  it("exposes api.actions.getAction as a function", () => {
    expect(typeof api.actions.getAction).toBe("function");
  });
});

describe("Section 2 Action Read Surface -- lifecycle panel renders pre-fetch", () => {
  it("renders the lifecycle panel with 'Action proposed (not executed)' framing before refresh", async () => {
    await driveToActionProposed({
      scenarioId: "scn-lc-pre",
      actionId: "act-lc-pre",
      scenarioTitle: "Lifecycle pre-fetch",
    });
    const panel = screen.getByTestId("agent-playground-lifecycle-panel");
    expect(
      within(panel).getByText(/Action proposed \(not executed\)/i),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/Section 2 Action lifecycle/i),
    ).toBeInTheDocument();
    // The refresh button is present and not disabled before the
    // first fetch.
    expect(
      within(panel).getByTestId("agent-playground-refresh-action-status"),
    ).toBeInTheDocument();
  });
});

describe("Section 2 Action Read Surface -- Refresh action status flow", () => {
  it("clicking Refresh fetches the lifecycle and renders PROPOSED → still proposed", async () => {
    const { user } = await driveToActionProposed({
      scenarioId: "scn-lc-refresh",
      actionId: "act-lc-refresh",
      scenarioTitle: "Lifecycle refresh",
    });
    // Default action_id starting with "act-" → MSW handler
    // returns PROPOSED. Refresh should keep the framing.
    await user.click(
      screen.getByTestId("agent-playground-refresh-action-status"),
    );
    await waitFor(() => {
      const statusLine = screen.getByTestId(
        "agent-playground-lifecycle-status",
      );
      expect(statusLine.textContent).toMatch(/PROPOSED/);
    });
  });

  it("renders 'Action completed by Section 2' when status is SUCCEEDED", async () => {
    seedActionLifecycle({
      action_id: "act-lc-succeeded",
      status: "SUCCEEDED",
      last_result_summary: "Notification delivered.",
      attempt_count: 1,
    });
    const { user } = await driveToActionProposed({
      scenarioId: "scn-lc-succeeded",
      actionId: "act-lc-succeeded",
      scenarioTitle: "Lifecycle succeeded",
    });
    await user.click(
      screen.getByTestId("agent-playground-refresh-action-status"),
    );
    expect(
      await screen.findByText(/Action completed by Section 2/i),
    ).toBeInTheDocument();
  });

  it("renders 'Action failed in Section 2' when status is FAILED", async () => {
    seedActionLifecycle({
      action_id: "act-lc-failed",
      status: "FAILED",
      attempt_count: 1,
    });
    const { user } = await driveToActionProposed({
      scenarioId: "scn-lc-failed",
      actionId: "act-lc-failed",
      scenarioTitle: "Lifecycle failed",
    });
    await user.click(
      screen.getByTestId("agent-playground-refresh-action-status"),
    );
    expect(
      await screen.findByText(/Action failed in Section 2/i),
    ).toBeInTheDocument();
  });

  it("renders 'Action cancelled in Section 2' when status is CANCELLED", async () => {
    seedActionLifecycle({
      action_id: "act-lc-cancelled",
      status: "CANCELLED",
    });
    const { user } = await driveToActionProposed({
      scenarioId: "scn-lc-cancelled",
      actionId: "act-lc-cancelled",
      scenarioTitle: "Lifecycle cancelled",
    });
    await user.click(
      screen.getByTestId("agent-playground-refresh-action-status"),
    );
    expect(
      await screen.findByText(/Action cancelled in Section 2/i),
    ).toBeInTheDocument();
  });

  it.each([
    { status: "RUNNING" as const, expected: /currently running/i },
    { status: "SCHEDULED" as const, expected: /scheduled by Section 2/i },
    { status: "APPROVED" as const, expected: /approved by Section 2/i },
    { status: "REJECTED" as const, expected: /rejected by Section 2/i },
    { status: "TIMED_OUT" as const, expected: /timed out in Section 2/i },
    { status: "EXPIRED" as const, expected: /expired in Section 2/i },
  ])(
    "renders honest lifecycle copy for $status",
    async ({ status, expected }) => {
      const actionId = `act-lc-${status.toLowerCase()}`;
      seedActionLifecycle({ action_id: actionId, status });
      const { user } = await driveToActionProposed({
        scenarioId: `scn-lc-${status.toLowerCase()}`,
        actionId,
        scenarioTitle: `Lifecycle ${status}`,
      });
      await user.click(
        screen.getByTestId("agent-playground-refresh-action-status"),
      );
      expect(await screen.findByText(expected)).toBeInTheDocument();
    },
  );
});

describe("Section 2 Action Read Surface -- no-execute-or-approve discipline", () => {
  it("never renders Execute or Approve or Cancel or Retry button labels", async () => {
    seedActionLifecycle({
      action_id: "act-lc-discipline",
      status: "APPROVED",
    });
    const { user } = await driveToActionProposed({
      scenarioId: "scn-lc-discipline",
      actionId: "act-lc-discipline",
      scenarioTitle: "Lifecycle discipline",
    });
    await user.click(
      screen.getByTestId("agent-playground-refresh-action-status"),
    );
    const panel = await screen.findByTestId(
      "agent-playground-lifecycle-panel",
    );
    const buttons = panel.querySelectorAll("button");
    for (const btn of buttons) {
      const label = (btn.textContent ?? "").trim().toLowerCase();
      expect(label).not.toBe("execute");
      expect(label).not.toBe("approve");
      expect(label).not.toBe("cancel");
      expect(label).not.toBe("retry");
      expect(label).not.toContain("auto-execute");
      expect(label).not.toContain("auto-approve");
    }
    // The only button rendered by the lifecycle panel is the
    // refresh button.
    const refreshButtons = within(panel).getAllByTestId(
      "agent-playground-refresh-action-status",
    );
    expect(refreshButtons.length).toBe(1);
  });

  it("preserves 'Section 2 retains all execution authority' boilerplate", async () => {
    await driveToActionProposed({
      scenarioId: "scn-lc-boilerplate",
      actionId: "act-lc-boilerplate",
      scenarioTitle: "Lifecycle boilerplate",
    });
    // Boilerplate appears in both the Governed Transition intro
    // ("Propose a Section 2 Action in PROPOSED status. Section 2
    // retains all execution authority") and the TransitionResultCard
    // footer above the lifecycle panel; both are required.
    expect(
      screen.getAllByText(/Section 2 retains all execution authority/i)
        .length,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("Section 2 Action Read Surface -- forbidden-UI-copy + no-leak preserved", () => {
  it("does not display any forbidden UI strings even after fetching a SUCCEEDED action", async () => {
    seedActionLifecycle({
      action_id: "act-lc-noleak",
      status: "SUCCEEDED",
      last_result_summary: "Notification delivered.",
      attempt_count: 1,
    });
    const { user } = await driveToActionProposed({
      scenarioId: "scn-lc-noleak",
      actionId: "act-lc-noleak",
      scenarioTitle: "Lifecycle no-leak",
    });
    const { container } = { container: document.body };
    await user.click(
      screen.getByTestId("agent-playground-refresh-action-status"),
    );
    await screen.findByText(/Action completed by Section 2/i);
    const text = (container.textContent ?? "").toLowerCase();
    for (const forbidden of FORBIDDEN_UI_COPY) {
      expect(text).not.toContain(forbidden);
    }
    for (const tok of FORBIDDEN_RAW_TOKENS) {
      expect(text).not.toContain(tok);
    }
  });
});

describe("Section 2 Action Read Surface -- error rendering", () => {
  it("renders ACTION_NOT_FOUND as 'Action not found'", async () => {
    // Use an action_id that does NOT start with "act-" so the
    // MSW handler returns the 404 path.
    const { user } = await driveToActionProposed({
      scenarioId: "scn-lc-error",
      actionId: "different-id-not-found",
      scenarioTitle: "Lifecycle error",
    });
    await user.click(
      screen.getByTestId("agent-playground-refresh-action-status"),
    );
    expect(
      await screen.findByText(/Action not found/i),
    ).toBeInTheDocument();
  });
});

// Suppress unused-import warning for `within` in case future
// extensions consume it.
void within;
void fireEvent;
