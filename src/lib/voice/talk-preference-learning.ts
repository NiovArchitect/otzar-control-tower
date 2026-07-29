// FILE: talk-preference-learning.ts
// PURPOSE: Slice 4 — detect clear personal preference instructions in Talk
//          and apply them immediately with a concise confirmation (no form).
// CONNECTS TO: AmbientOtzarBar, api.otzar.correction, useful-memory.

export type PreferenceScope = "personal" | "organizational" | "unclear";

export interface DetectedTalkPreference {
  /** Short label for Memory / confirmation. */
  label: string;
  /** Text stored as correct behavior. */
  correct_behavior: string;
  /** What was wrong / prior default. */
  incorrect_description: string;
  scope: PreferenceScope;
  /** Safe to apply immediately without a separate approval card. */
  apply_immediately: boolean;
  /** Concise confirmation Otzar should say. */
  confirmation: string;
}

/**
 * WHAT: Classify a user Talk utterance as a teachable preference.
 * INPUT: raw user text.
 * OUTPUT: DetectedTalkPreference or null.
 * WHY: Users must teach Otzar naturally — not only via long forms.
 */
export function detectTalkPreference(text: string): DetectedTalkPreference | null {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length < 8 || t.length > 280) return null;
  const lower = t.toLowerCase();

  // Organizational signals — never auto-apply as personal.
  if (
    /\b(everyone|all employees|company policy|org-wide|organization-wide|whole team|all of us)\b/i.test(
      t,
    )
  ) {
    return {
      label: "Organization policy candidate",
      incorrect_description: "Unspecified org default",
      correct_behavior: `[org-bound] ${t}`,
      scope: "organizational",
      apply_immediately: false,
      confirmation:
        "That sounds like organization policy. An admin would need to set it for everyone — I will not apply it as only your personal preference.",
    };
  }

  if (
    /keep (my |the )?answers? concise|be more concise|shorter answers?|answer first/i.test(
      lower,
    )
  ) {
    return {
      label: "Concise answers",
      incorrect_description: "Longer essay-style answers by default",
      correct_behavior: "[portable] Keep answers concise: direct answer first, details optional",
      scope: "personal",
      apply_immediately: true,
      confirmation: "Got it. I'll keep the answer first and details optional.",
    };
  }

  if (
    /risk before (the )?background|show (the )?risk first|recommendation before/i.test(
      lower,
    )
  ) {
    return {
      label: "Decision briefs",
      incorrect_description: "Background before risk/recommendation",
      correct_behavior:
        "[portable] Show recommendation and risk before background in executive summaries",
      scope: "personal",
      apply_immediately: true,
      confirmation:
        "Understood. I'll lead with the recommendation and risk before the background.",
    };
  }

  if (
    /do not schedule external|don't schedule external|ask before scheduling/i.test(
      lower,
    )
  ) {
    return {
      label: "Scheduling caution",
      incorrect_description: "May schedule without asking",
      correct_behavior:
        "[portable] Do not schedule external meetings without asking me first",
      scope: "personal",
      apply_immediately: true,
      confirmation: "Got it. I won't schedule external meetings without asking you.",
    };
  }

  if (/stop using (that |this )?preference|forget that preference/i.test(lower)) {
    return {
      label: "Stop preference",
      incorrect_description: "Continue applying a preference",
      correct_behavior: "[portable] Stop using the last preference I taught you",
      scope: "personal",
      apply_immediately: true,
      confirmation: "I'll stop using that preference. You can re-teach me anytime.",
    };
  }

  if (
    /use this (review )?format|prefer bullet|use bullet points when/i.test(lower)
  ) {
    return {
      label: "Format preference",
      incorrect_description: "Generic formatting",
      correct_behavior: `[portable] ${t}`,
      scope: "personal",
      apply_immediately: true,
      confirmation: "Saved. I'll use that format when it fits.",
    };
  }

  // Unclear personal vs org — ask once.
  if (/\balways ask before sending\b/i.test(lower)) {
    return {
      label: "Send caution",
      incorrect_description: "May send without asking",
      correct_behavior: t,
      scope: "unclear",
      apply_immediately: false,
      confirmation:
        "Should that apply only to you, or to everyone in your organization?",
    };
  }

  // Explicit teach phrasing
  if (
    /^(always|please |from now on |going forward )/i.test(t) &&
    /(prefer|use|keep|show|ask|don't|do not)/i.test(lower)
  ) {
    return {
      label: "Personal preference",
      incorrect_description: "Previous default",
      correct_behavior: `[portable] ${t}`,
      scope: "personal",
      apply_immediately: true,
      confirmation: "Got it — I'll apply that for you going forward.",
    };
  }

  return null;
}
