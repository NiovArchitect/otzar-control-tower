// FILE: repeatable-win-summary.ts
// PURPOSE: Pure builder for founder-visible repeatable-win comparison.
//          Grounded only in safe projections already loaded on Today —
//          never invents metrics. When learning + completed work are
//          present, surfaces first-run vs second-run intervention story
//          without requiring JSON inspection.
// CONNECTS TO: founder-signal-hierarchy, AmbientWorkSurface.

export interface RepeatableWinInput {
  /** True when an org-scoped Annie/research (or similar) correction is active. */
  learnedPatternActive: boolean;
  /** Short safe label of the learned pattern (no raw IDs). */
  learnedPatternLabel: string | null;
  /** Count of SUCCEEDED low-risk RECORD_CAPSULE-like completions visible. */
  completedAutonomousActions: number;
  /** Count of completed AI collaborations visible. */
  completedCollaborations: number;
  /**
   * Proven intervention counts from the last verified proof run.
   * Prefer product-derived when available; null when not yet grounded.
   */
  firstRunInterventions: number | null;
  secondRunInterventions: number | null;
}

export interface RepeatableWinView {
  visible: boolean;
  title: string;
  firstRunLine: string;
  secondRunLine: string;
  improvementLine: string;
  authorityLine: string;
  to: string;
  testId: string;
}

/**
 * WHAT: Build a founder-facing repeatable-win comparison card.
 * INPUT: Grounded counts + learning flags only.
 * OUTPUT: null-like view (visible:false) when evidence is insufficient.
 * WHY: Browser must communicate 2→0 without opening evidence JSON.
 */
export function buildRepeatableWinSummary(
  input: RepeatableWinInput,
): RepeatableWinView {
  const first = input.firstRunInterventions;
  const second = input.secondRunInterventions;
  const hasCounts =
    typeof first === "number" &&
    typeof second === "number" &&
    first >= 0 &&
    second >= 0 &&
    second < first;
  const hasWork =
    input.completedAutonomousActions > 0 || input.completedCollaborations > 0;
  const visible =
    hasCounts && hasWork && input.learnedPatternActive;

  if (!visible) {
    return {
      visible: false,
      title: "",
      firstRunLine: "",
      secondRunLine: "",
      improvementLine: "",
      authorityLine: "",
      to: "/app/corrections",
      testId: "founder-repeatable-win-hidden",
    };
  }

  const pattern =
    input.learnedPatternLabel?.trim() ||
    "a corrected org-scoped work pattern";

  return {
    visible: true,
    title: "What improved after one correction",
    firstRunLine: `First run: ${first} human intervention${first === 1 ? "" : "s"}`,
    secondRunLine: `Second run: ${second} human intervention${second === 1 ? "" : "s"}`,
    improvementLine: `Otzar reused ${pattern} within this organization. The corrected error was not repeated.`,
    authorityLine:
      "Authority did not expand. Learned routines stay org-scoped and revocable.",
    to: "/app/corrections",
    testId: "founder-repeatable-win",
  };
}
