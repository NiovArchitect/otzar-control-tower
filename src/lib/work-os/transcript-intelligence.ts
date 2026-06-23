// FILE: transcript-intelligence.ts
// PURPOSE: Phase 3A — turn PROVIDED transcript/meeting text into work structure
//          (decisions / blockers / commitments / follow-ups / risks / open
//          questions + proposed actions), DETERMINISTICALLY and honestly (with
//          confidence). Meetings/transcripts are sources of WORK, not just
//          summaries. No live capture, no recording, no provider secrets — this
//          operates only on text the user explicitly provided (Phase 2.9
//          current-surface context). Provided text is UNTRUSTED content: it is
//          parsed for work, never executed as instructions.
// CONNECTS TO: AmbientOtzarBar (transcript commands), current-surface-context,
//          work-context, tests/unit/transcript-intelligence.test.ts.

export type TranscriptWorkItemKind =
  | "decision"
  | "blocker"
  | "commitment"
  | "follow_up"
  | "risk"
  | "open_question";

export interface TranscriptWorkItem {
  kind: TranscriptWorkItemKind;
  text: string;
  ownerName?: string;
  dueHint?: string;
  targetName?: string;
  confidence: number;
}

export interface TranscriptDigest {
  summary: string;
  decisions: TranscriptWorkItem[];
  blockers: TranscriptWorkItem[];
  commitments: TranscriptWorkItem[];
  followUps: TranscriptWorkItem[];
  risks: TranscriptWorkItem[];
  openQuestions: TranscriptWorkItem[];
  proposedActions: TranscriptWorkItem[];
}

// Classification rules in PRIORITY order — the first match wins per sentence so
// one line yields one primary work item. Strong cue → higher confidence.
const RULES: ReadonlyArray<{
  kind: TranscriptWorkItemKind;
  re: RegExp;
  confidence: number;
}> = [
  { kind: "decision", re: /\b(we\s+(?:decided|agreed)|decided\s+to|decision\b|agreed\s+to|we'?ll\s+go\s+with|chose\s+to|concluded)\b/i, confidence: 0.82 },
  { kind: "blocker", re: /\b(blocked\b|blocker\b|waiting\s+on|stuck\s+on|can'?t\s+proceed|cannot\s+proceed|held\s+up|depends\s+on)\b/i, confidence: 0.8 },
  { kind: "commitment", re: /\b(i\s+will|i'?ll|we\s+will|we'?ll|i'?m\s+going\s+to|committed\s+to|i\s+can\s+take|i'?ll\s+own)\b/i, confidence: 0.78 },
  { kind: "follow_up", re: /\b(follow[\s-]?up|next\s+step|action\s+item|to[\s-]?do|need\s+to|needs\s+to|should\s+(?:send|prepare|review|share)|let'?s\b)\b/i, confidence: 0.66 },
  { kind: "risk", re: /\b(risk\b|concern\b|worried|might\s+(?:fail|slip)|could\s+slip|at\s+risk)\b/i, confidence: 0.68 },
  { kind: "open_question", re: /\b(open\s+(?:item|question)|unclear|tbd\b|to\s+be\s+decided|not\s+sure|still\s+deciding)\b/i, confidence: 0.62 },
];

const DUE_RE =
  /\b(?:by|before|due(?:\s+by)?)\s+(the\s+\w+(?:\s+\w+)?|\w+day|tomorrow|next\s+week|eod|cob|\w+\s+\d{1,2})\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function ownerOf(sentence: string): string | undefined {
  // "Samiksha will…", "David is going to…", "we need David to…", "ask William to…"
  const m =
    sentence.match(/\b([A-Z][a-z]+)\s+(?:will|is\s+going\s+to|agreed\s+to|to\s+take|owns?)\b/) ??
    sentence.match(/\b(?:need|ask|tell|assign(?:ed)?(?:\s+to)?|have)\s+([A-Z][a-z]+)\s+to\b/);
  return m?.[1];
}

function dueOf(sentence: string): string | undefined {
  return sentence.match(DUE_RE)?.[1]?.trim();
}

function classify(sentence: string): TranscriptWorkItem | null {
  // A trailing question is an open question unless a stronger cue matched first.
  for (const rule of RULES) {
    if (rule.re.test(sentence)) {
      const owner = ownerOf(sentence);
      const due = dueOf(sentence);
      return {
        kind: rule.kind,
        text: sentence.replace(/\s+/g, " ").trim(),
        ...(owner !== undefined ? { ownerName: owner } : {}),
        ...(due !== undefined ? { dueHint: due } : {}),
        confidence: rule.confidence,
      };
    }
  }
  if (/\?\s*$/.test(sentence)) {
    const owner = ownerOf(sentence);
    return {
      kind: "open_question",
      text: sentence.replace(/\s+/g, " ").trim(),
      ...(owner !== undefined ? { ownerName: owner } : {}),
      confidence: 0.55,
    };
  }
  return null;
}

// WHAT: Extract a work digest from provided transcript/meeting text.
// INPUT: the raw text the user explicitly provided.
// OUTPUT: a TranscriptDigest — typed work items + a short honest summary +
//         proposed actions (follow-ups + commitments are the things to do next).
export function extractTranscriptDigest(text: string): TranscriptDigest {
  const items = splitSentences(text)
    .map(classify)
    .filter((x): x is TranscriptWorkItem => x !== null);

  const by = (k: TranscriptWorkItemKind): TranscriptWorkItem[] =>
    items.filter((i) => i.kind === k);

  const decisions = by("decision");
  const blockers = by("blocker");
  const commitments = by("commitment");
  const followUps = by("follow_up");
  const risks = by("risk");
  const openQuestions = by("open_question");
  // Proposed next actions = what someone committed to + explicit follow-ups.
  const proposedActions = [...commitments, ...followUps].map((i) => ({
    ...i,
    kind: "follow_up" as const,
  }));

  const counts: string[] = [];
  if (decisions.length > 0) counts.push(`${decisions.length} decision${decisions.length === 1 ? "" : "s"}`);
  if (blockers.length > 0) counts.push(`${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`);
  if (followUps.length + commitments.length > 0) {
    const n = followUps.length + commitments.length;
    counts.push(`${n} follow-up${n === 1 ? "" : "s"}`);
  }
  if (risks.length > 0) counts.push(`${risks.length} risk${risks.length === 1 ? "" : "s"}`);
  const summary =
    counts.length > 0
      ? `Found ${counts.join(", ")}.`
      : "I couldn't find clear decisions, blockers, or follow-ups in that text.";

  return {
    summary,
    decisions,
    blockers,
    commitments,
    followUps,
    risks,
    openQuestions,
    proposedActions,
  };
}

// WHAT: A short, human "what counts as the headline" line for the orb.
export function digestCounts(d: TranscriptDigest): string {
  const decisions = d.decisions.length;
  const followUps = d.followUps.length + d.commitments.length;
  const blockers = d.blockers.length;
  const total = decisions + followUps + blockers + d.risks.length + d.openQuestions.length;
  if (total === 0) {
    return "I didn't find clear decisions, follow-ups, or blockers in that text.";
  }
  const parts = [
    `${decisions} decision${decisions === 1 ? "" : "s"}`,
    `${followUps} follow-up${followUps === 1 ? "" : "s"}`,
    `${blockers} blocker${blockers === 1 ? "" : "s"}`,
  ];
  return `I found ${parts[0]}, ${parts[1]}, and ${parts[2]}.`;
}

// WHAT: A deterministic, context-grounded "why this matters" — surfaces the
//        blockers / risks / decisions / deadlines that make the work matter.
//        Answers from context; never an internal message, never invented.
export function whyThisMatters(d: TranscriptDigest): string {
  const reasons: string[] = [];
  if (d.blockers.length > 0) {
    reasons.push(
      `there ${d.blockers.length === 1 ? "is a blocker" : `are ${d.blockers.length} blockers`} that could hold up the work`,
    );
  }
  const dued = [...d.decisions, ...d.followUps, ...d.commitments].find(
    (i) => i.dueHint !== undefined,
  );
  if (dued?.dueHint !== undefined) {
    reasons.push(`something is due ${dued.dueHint}`);
  }
  if (d.risks.length > 0) {
    reasons.push(`${d.risks.length === 1 ? "a risk was raised" : `${d.risks.length} risks were raised`}`);
  }
  if (d.decisions.length > 0) {
    reasons.push(
      `${d.decisions.length === 1 ? "a decision was made" : `${d.decisions.length} decisions were made`} that affect the next steps`,
    );
  }
  if (reasons.length === 0) {
    return "From the context you shared, I don't see a blocker, deadline, or decision that makes this urgent right now.";
  }
  return `This matters because ${reasons.join(", and ")}.`;
}

export type TranscriptItemSelector =
  | "decisions"
  | "blockers"
  | "follow_ups"
  | "commitments"
  | "risks"
  | "open_questions"
  | "next_steps"
  | "action_items";

// WHAT: Pick the items a routing command refers to ("send X the decisions").
export function pickItems(
  d: TranscriptDigest,
  selector: TranscriptItemSelector,
): TranscriptWorkItem[] {
  switch (selector) {
    case "decisions":
      return d.decisions;
    case "blockers":
      return d.blockers;
    case "commitments":
      return d.commitments;
    case "risks":
      return d.risks;
    case "open_questions":
      return d.openQuestions;
    case "follow_ups":
    case "next_steps":
      return d.followUps;
    case "action_items":
      return d.proposedActions;
  }
}

export type TranscriptCommand =
  | { kind: "DIGEST"; create: boolean }
  | { kind: "WHY" }
  | { kind: "ROUTE"; targetName: string; selector: TranscriptItemSelector };

// WHAT: Detect a transcript-intelligence command. A DELEGATION ("tell/ask X to
//        …") is NOT a local digest — it returns null so the governed outbound
//        path routes it (with the transcript attached as context). Returns null
//        when the text is not a transcript command.
export function detectTranscriptCommand(text: string): TranscriptCommand | null {
  const t = text.trim();

  // Delegation ("tell/ask/have/remind X to …") → let the outbound path handle it
  // (it attaches the transcript as context). Exclude self pronouns so "ask my
  // twin why this matters" is NOT treated as a delegation.
  if (
    /\b(?:tell|ask|have|remind|message|msg)\s+(?!me\b|my\b|myself\b)[a-z][a-z'’-]+\s+to\b/i.test(
      t,
    )
  ) {
    return null;
  }

  // Route extracted items to a named teammate ("send William the decisions").
  const route = t.match(
    /\b(?:send|tell|give|share)\s+([A-Z][a-zA-Z'’-]+)\s+(?:the\s+)?(decisions?|blockers?|follow[\s-]?ups?|action\s+items?|next\s+steps?|commitments?|risks?)\b/i,
  );
  if (route !== null) {
    const target = route[1]!;
    const selector = normalizeSelector(route[2]!);
    if (selector !== null) {
      return { kind: "ROUTE", targetName: target, selector };
    }
  }

  // Why this matters (incl. "ask my Twin why this matters").
  if (/\bwhy\s+(?:does\s+)?(?:this|it)\s+matters?\b/i.test(t)) {
    return { kind: "WHY" };
  }

  // Local digest / extraction. The summarize/digest verb must point at a
  // transcript/meeting/deictic object so it never captures "summarize my open
  // work" or other non-transcript intents.
  const create = /\bcreate\s+(?:the\s+)?follow[\s-]?ups?\b/i.test(t);
  if (
    /\b(?:summari[sz]e|digest|recap)\b\s+(?:the\s+|this\s+|that\s+)?(?:transcript|meeting|note|conversation|thread|call|this|that|it|current\s+context)\b/i.test(t) ||
    /\bextract\s+(?:the\s+)?(?:decisions?|blockers?|follow[\s-]?ups?|action\s+items?|commitments?)\b/i.test(t) ||
    /\bwhat\s+(?:were|are)\s+the\s+(?:decisions?|blockers?|follow[\s-]?ups?|risks?|open\s+questions?)\b/i.test(t) ||
    create
  ) {
    return { kind: "DIGEST", create };
  }

  return null;
}

function normalizeSelector(raw: string): TranscriptItemSelector | null {
  const r = raw.toLowerCase().replace(/[\s-]/g, "_");
  if (/^decisions?$/.test(r)) return "decisions";
  if (/^blockers?$/.test(r)) return "blockers";
  if (/^follow_?ups?$/.test(r)) return "follow_ups";
  if (/^commitments?$/.test(r)) return "commitments";
  if (/^risks?$/.test(r)) return "risks";
  if (/^next_steps?$/.test(r)) return "next_steps";
  if (/^action_items?$/.test(r)) return "action_items";
  return null;
}
