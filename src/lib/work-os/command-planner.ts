// FILE: command-planner.ts
// PURPOSE: Phase 1273 — deterministic multi-intent command planner.
//          Splits a compound work instruction into coordinated, linked
//          actions WITHOUT flattening them into one meeting card and
//          WITHOUT dropping the second intent (the David follow-up that
//          the live test lost). It also detects single follow-up/after-
//          call promises and preserves "after X confirms" prerequisites.
//          Pure + deterministic (LLM-free) so the structure is testable
//          and never hallucinated.
// CONNECTS TO: AmbientOtzarBar (renders one card per planned action),
//          authority-context route (each action's target → authority),
//          calendar-event gated create (meeting actions).

export type PlannedActionKind =
  | "SCHEDULE_MEETING"
  | "FOLLOW_UP_NOTE"
  | "TASK"
  | "DRAFT_MESSAGE";

// Phase 1273 addendum §5 — instructions carry weight. The SAME action
// kind means different things depending on how it was uttered: a
// commitment ("I told X I would…") must become a tracked artifact; a
// delegation ("ask X to…") implies a target + acceptance; a command
// ("schedule…") is a direct execution intent. Weight is orthogonal to
// kind and feeds the authority/policy decision + the artifact's framing.
export type InstructionWeight =
  | "COMMAND"
  | "REQUEST"
  | "SUGGESTION"
  | "REMINDER"
  | "COMMITMENT"
  | "APPROVAL"
  | "DELEGATION"
  | "ESCALATION"
  | "BLOCKER"
  | "DECISION";

// Phase 1275 — confidence/evidence so inferences are explainable, never
// "the AI guessed". Attached to planned actions + surfaced in the card's
// View/Why details. Kept minimal so it never becomes noise.
export type EvidenceConfidence = "HIGH" | "MEDIUM" | "LOW";
export type EvidenceType =
  | "EXACT_ENTITY_MATCH"
  | "PHRASE_MATCH"
  | "ROLE_MATCH"
  | "PROJECT_CONTEXT"
  | "CALENDAR_SETTING"
  | "USER_SETTING"
  | "ORG_DEFAULT"
  | "DEMO_FALLBACK"
  | "HISTORICAL_PATTERN"
  | "AI_INFERENCE";

export interface InferenceEvidence {
  field: string;
  value: string;
  confidence: EvidenceConfidence;
  evidence_type: EvidenceType;
  source_text?: string;
  requires_confirmation?: boolean;
  note?: string;
}

export interface PlannedAction {
  /** Stable per-plan index id, e.g. "a1", "a2". */
  id: string;
  /** Why each inferred field was chosen (target/context/time/timezone). */
  evidence: InferenceEvidence[];
  kind: PlannedActionKind;
  /** How the instruction was uttered (command vs commitment vs …). */
  weight: InstructionWeight;
  /** Resolved later; the raw name token extracted from this segment. */
  target_name?: string;
  /** Meeting duration in minutes when stated ("30-minute"). */
  duration_minutes?: number;
  /** Coarse date phrase ("tomorrow"). */
  when?: string;
  /** True when "work hours" / "business hours" is stated. */
  work_hours?: boolean;
  /** Explicit clock time the user gave, normalized to 24h "HH:MM". */
  explicit_time?: string;
  /** Raw timezone label the user said ("pst", "et") if any. */
  explicit_timezone_label?: string;
  /** Preserved prerequisite, e.g. "Samiksha confirms". */
  prerequisite?: string;
  /** Project/context label, e.g. "Otzar voice runtime". */
  context_label?: string;
  /** The raw segment text this action came from. */
  source_segment: string;
}

export interface WorkPlan {
  source_command: string;
  /** Plan-wide project/context label when present. */
  context_label?: string;
  actions: PlannedAction[];
  /** True when more than one coordinated action was detected. */
  multi_intent: boolean;
}

// Extract ONLY the object of "about X" / "regarding X" — never the
// surrounding scheduling clause. "schedule a 30-minute meeting … about
// the Otzar voice runtime" → "Otzar voice runtime" (the prior regex
// leaked the whole clause — the live bug this fixes).
function extractContextLabel(text: string): string | undefined {
  const m = text.match(
    /\b(?:about|regarding|re:|concerning|on the topic of)\s+(?:the\s+)?(.+?)(?=[.,;]|\s+and\s+|$)/i,
  );
  if (m === null) return undefined;
  const label = (m[1] ?? "").trim().replace(/[.,;]+$/, "");
  return label.length > 0 ? label : undefined;
}

// Extract an explicit clock time + optional timezone label.
// "at 11am pst" / "11:30 am" / "at 2pm ET" → { time:"11:00",
// timezone_label:"pst" }. Requires am/pm so "30-minute" never matches.
export function extractExplicitTime(
  text: string,
): { time: string; timezone_label?: string } | undefined {
  const m = text.match(
    /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\s*(pst|pdt|pt|est|edt|et|cst|cdt|ct|mst|mdt|mt|utc|gmt)?\b/i,
  );
  if (m === null) return undefined;
  let hour = Number.parseInt(m[1] ?? "", 10);
  const minute = m[2] ?? "00";
  const ampm = (m[3] ?? "").toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  const time = `${String(hour).padStart(2, "0")}:${minute}`;
  const tz = m[4]?.toLowerCase();
  return tz !== undefined ? { time, timezone_label: tz } : { time };
}

function extractDurationMinutes(text: string): number | undefined {
  const m = text.match(/\b(\d{1,3})[\s-]*(?:minute|min|minutes)\b/i);
  if (m !== null) return Number.parseInt(m[1] ?? "", 10);
  const hr = text.match(/\b(\d{1,2})[\s-]*(?:hour|hr|hours)\b/i);
  if (hr !== null) return Number.parseInt(hr[1] ?? "", 10) * 60;
  return undefined;
}

function extractWhen(text: string): string | undefined {
  const m = text.match(/\b(today|tomorrow|next week|this week|monday|tuesday|wednesday|thursday|friday)\b/i);
  return m === null ? undefined : (m[1] ?? "").toLowerCase();
}

// "After Samiksha confirms, ..." → "Samiksha confirms".
function extractPrerequisite(text: string): string | undefined {
  const m = text.match(/\bafter\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(confirms?|approves?|responds?|replies)\b/i);
  if (m === null) return undefined;
  return `${m[1]} ${m[2]}`.replace(/\s+/g, " ").trim();
}

// Tokens that must NEVER be treated as a participant. The "ask/have" verb match
// below is case-insensitive (so "ask Vishesh" and "Ask vishesh" both resolve),
// which means a bare pronoun/verb ("ask you", "have sent") would otherwise be
// captured as a fake recipient. Reject those explicitly.
const NON_PARTICIPANT = new Set([
  "you", "your", "yours", "he", "him", "his", "she", "her", "hers", "they",
  "them", "their", "it", "me", "my", "mine", "i", "us", "we", "this", "that",
  "what", "who", "sent", "send", "confirm", "confirmed", "received", "receive",
  "got", "review", "reviewed", "check", "checked", "validate", "validated",
  "prepare", "prepared", "the", "a", "an",
]);

// Pull a participant after a preposition/verb in a single segment.
function extractParticipant(text: string): string | undefined {
  const ok = (s: string | undefined): string | undefined =>
    s !== undefined && !NON_PARTICIPANT.has(s.toLowerCase()) ? s : undefined;
  // promise "told X", meeting "with X", note/message "for X"/"to X",
  // task "ask X" / "have X". Check the promise verb first so
  // "I told Vishesh I would follow up" resolves to Vishesh, not a later
  // preposition.
  const told = text.match(/\b(?:told|promised|owe)\s+([A-Z][a-z]+)\b/);
  const toldOk = told !== null ? ok(told[1]) : undefined;
  if (toldOk !== undefined) return toldOk;
  const prep = text.match(/\b(?:with|for|to)\s+([A-Z][a-z]+)\b/);
  const prepOk = prep !== null ? ok(prep[1]) : undefined;
  if (prepOk !== undefined) return prepOk;
  const verb = text.match(/\b(?:ask|have|assign(?:\s+this)?\s+to)\s+([A-Z][a-z]+)\b/i);
  const verbOk = verb !== null ? ok(verb[1]) : undefined;
  if (verbOk !== undefined) return verbOk;
  return undefined;
}

// WHAT: Classify the instruction weight of a segment (addendum §5).
// WHY: A commitment ("I told X I would…") and a command ("schedule…")
//      are not the same even when they touch the same surface — weight
//      decides whether Otzar tracks a promise, delegates, or executes.
function classifyInstructionWeight(
  seg: string,
  kind: PlannedActionKind,
): InstructionWeight {
  const l = seg.toLowerCase();
  if (/\b(i told|i promised|i said i('?d| would)|i owe|i'?ll follow up|i will follow up)\b/.test(l)) {
    return "COMMITMENT";
  }
  if (/\b(blocked by|waiting on|we'?re waiting|stuck on)\b/.test(l)) return "BLOCKER";
  if (/\b(we (?:agreed|decided)|decision is|we will go with)\b/.test(l)) return "DECISION";
  if (/\b(escalate|urgent|asap|right away)\b/.test(l)) return "ESCALATION";
  if (/\b(remind me|don'?t forget|remember to)\b/.test(l)) return "REMINDER";
  if (/\b(ask|assign|have\s+\w+\s+review|delegate)\b/.test(l)) return "DELEGATION";
  if (/\b(maybe|consider|might want|perhaps|we could)\b/.test(l)) return "SUGGESTION";
  if (/\b(can you|could you|would you|please)\b/.test(l)) return "REQUEST";
  // Default by kind: scheduling is a command; a follow-up note is a
  // commitment; a task is a delegation; a message is a request.
  if (kind === "SCHEDULE_MEETING") return "COMMAND";
  if (kind === "FOLLOW_UP_NOTE") return "COMMITMENT";
  if (kind === "TASK") return "DELEGATION";
  return "REQUEST";
}

function classifySegment(seg: string): PlannedActionKind | null {
  const l = seg.toLowerCase();
  // Follow-up FIRST: "follow up" / "follow-up note" wins over a bare
  // "meeting" mention like "after the meeting" (the live-test trap).
  if (/\b(follow.?up|prepare a (?:follow.?up )?note)\b/.test(l)) {
    return "FOLLOW_UP_NOTE";
  }
  // Scheduling requires a real scheduling verb — NOT a bare "meeting".
  if (
    /\b(schedule|book|set up a meeting|put (?:this|it) on (?:the )?calendar|get (?:on|him|her|them) .*calendar|add (?:a )?meeting)\b/.test(
      l,
    )
  ) {
    return "SCHEDULE_MEETING";
  }
  if (/\b(assign|create a task|task for|have\s+\w+\s+review|ask\s+\w+\s+to)\b/.test(l)) {
    return "TASK";
  }
  if (/\b(draft|message|send (?:a )?note|tell|let .* know)\b/.test(l)) {
    return "DRAFT_MESSAGE";
  }
  return null;
}

// Split on coordinating "and" / commas that join independent clauses,
// but NOT inside "30-minute" or "follow-up". We split on ", and ",
// " and " (word-boundary), and "; " — then drop empty fragments.
function splitSegments(text: string): string[] {
  return text
    .split(/\s*,?\s+and\s+|\s*;\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// WHAT: Plan a (possibly compound) work command into linked actions.
// INPUT: the raw transcript.
// OUTPUT: a WorkPlan — one action per detected intent, with extracted
//         participant/duration/when/work-hours/prerequisite/context.
// WHY: The multi-intent live test failed because the second intent (the
//      David follow-up) was dropped. This guarantees every recognized
//      clause becomes its own linked, inspectable action.
export function planWorkCommand(transcript: string): WorkPlan {
  const source = transcript.trim();
  const planContext = extractContextLabel(source);
  // A leading "After X confirms," applies to the FIRST scheduling action.
  const leadingPrereq = extractPrerequisite(source);

  const segments = splitSegments(source);
  const actions: PlannedAction[] = [];
  let idx = 0;
  for (const seg of segments) {
    const kind = classifySegment(seg);
    if (kind === null) continue;
    idx += 1;
    const action: PlannedAction = {
      id: `a${idx}`,
      kind,
      evidence: [],
      weight: classifyInstructionWeight(seg, kind),
      source_segment: seg,
    };
    const target = extractParticipant(seg);
    if (target !== undefined) action.target_name = target;
    const dur = extractDurationMinutes(seg);
    if (dur !== undefined) action.duration_minutes = dur;
    const when = extractWhen(seg);
    if (when !== undefined) action.when = when;
    if (/\b(work hours|business hours|during the day)\b/i.test(seg)) {
      action.work_hours = true;
    }
    if (kind === "SCHEDULE_MEETING") {
      const t = extractExplicitTime(seg);
      if (t !== undefined) {
        action.explicit_time = t.time;
        if (t.timezone_label !== undefined) {
          action.explicit_timezone_label = t.timezone_label;
        }
      }
    }
    const segPrereq = extractPrerequisite(seg);
    const prereq = segPrereq ?? (kind === "SCHEDULE_MEETING" ? leadingPrereq : undefined);
    if (prereq !== undefined) action.prerequisite = prereq;
    const segContext = extractContextLabel(seg) ?? planContext;
    if (segContext !== undefined) action.context_label = segContext;

    // Evidence: explain each inferred field. Target resolution
    // (found/not) is the authority service's job — the planner only
    // attests it extracted a name token from a phrase.
    if (target !== undefined) {
      action.evidence.push({
        field: "target",
        value: target,
        confidence: "MEDIUM",
        evidence_type: "PHRASE_MATCH",
        source_text: target,
        requires_confirmation: true,
        note: "name token extracted; resolution decided by authority service",
      });
    }
    if (segContext !== undefined) {
      action.evidence.push({
        field: "context_label",
        value: segContext,
        confidence: "HIGH",
        evidence_type: "PHRASE_MATCH",
        source_text: "phrase after “about”",
      });
    }
    if (action.explicit_time !== undefined) {
      action.evidence.push({
        field: "time",
        value: action.explicit_time,
        confidence: "HIGH",
        evidence_type: "PHRASE_MATCH",
        source_text: "explicit clock time",
      });
    }
    if (action.explicit_timezone_label !== undefined) {
      action.evidence.push({
        field: "timezone",
        value: action.explicit_timezone_label,
        confidence: "MEDIUM",
        evidence_type: "PHRASE_MATCH",
        source_text: action.explicit_timezone_label,
        note: "interpreted to a US timezone display",
      });
    }
    actions.push(action);
  }

  return {
    source_command: source,
    ...(planContext !== undefined ? { context_label: planContext } : {}),
    actions,
    multi_intent: actions.length > 1,
  };
}
