// FILE: thread-query.ts
// PURPOSE: Phase 1285 slice 1 — make Otzar answer relationship/thread
//          questions from REAL authorized thread records (not the LLM /
//          memory). Classifies "did I receive a message from X", "what did
//          X say", "what did I ask/tell X" into a thread query, and composes
//          a grounded answer from the actual GET /work-os/threads/with/:id
//          messages. Pure + unit-tested so the grounding can't silently drift.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx (handleSendText
//          intercept), api.workOs.thread, tests/unit/thread-query.test.ts.

import type {
  DirectThreadMessageView,
  WaitingOnItemView,
  RelationshipItemView,
  RelationshipWorkResponse,
} from "@/lib/types/foundation";

export type ThreadQueryType =
  | "RECEIVED_FROM"
  | "LATEST_FROM"
  | "LATEST_TO"
  | "WAITING_ON"
  | "COMPLETED_BY"
  | "BLOCKERS_WITH"
  | "DECISIONS_WITH"
  | "WAITING_ON_ME"
  | "OVERDUE_FROM"
  | "CHANGED_SINCE"
  | "RELATIONSHIP_SUMMARY";

// Relationship query types resolve against the relationship work graph
// (GET /work-os/relationship/with/:id) rather than the raw thread.
export const RELATIONSHIP_QUERY_TYPES: ReadonlyArray<ThreadQueryType> = [
  "COMPLETED_BY",
  "BLOCKERS_WITH",
  "DECISIONS_WITH",
  "WAITING_ON_ME",
  "OVERDUE_FROM",
  "CHANGED_SINCE",
  "RELATIONSHIP_SUMMARY",
];

export interface ThreadQuery {
  type: ThreadQueryType;
  person: string;
}

function cleanName(raw: string): string {
  return raw.replace(/[^A-Za-z'’-].*$/, "").trim();
}

const NAME = "([A-Za-z][A-Za-z'’-]*)";

// WHAT: Classify a thread/relationship question into {type, person}, or null.
// WHY: lets the ambient bar answer from real thread/work records instead of
//      routing to the LLM/navigation. Order matters — "what did I ask X"
//      (LATEST_TO) is checked before "what did X say" (LATEST_FROM).
export function classifyThreadQuery(text: string): ThreadQuery | null {
  const t = text.trim();

  // ── Relationship work-graph queries (Phase 1285-M) ─ checked FIRST so a
  //    specific intent ("what did David complete") isn't swallowed by a generic
  //    waiting/latest pattern. Each captures the teammate name in group 1.
  const relationshipPatterns: Array<[ThreadQueryType, RegExp]> = [
    ["RELATIONSHIP_SUMMARY", new RegExp(`\\b(?:show (?:me )?my work with|my work with|work summary with|summary with|catch me up on)\\s+${NAME}`, "i")],
    ["COMPLETED_BY", new RegExp(`\\bwhat (?:did|has)\\s+${NAME}\\s+(?:complete|completed|finish|finished|get done|got done|done)\\b`, "i")],
    ["BLOCKERS_WITH", new RegExp(`\\bblockers?\\b[^?]*?\\b(?:involve|involving|with|on|from|for)\\s+${NAME}`, "i")],
    ["BLOCKERS_WITH", new RegExp(`\\bwhat(?:'s| is)\\s+blocking\\s+${NAME}`, "i")],
    ["DECISIONS_WITH", new RegExp(`\\bdecisions?\\b[^?]*?\\b(?:did|with|involving|made with|between me and|me and)\\s+${NAME}`, "i")],
    ["DECISIONS_WITH", new RegExp(`\\bwhat did\\s+${NAME}\\s+and i (?:decide|agree)`, "i")],
    ["WAITING_ON_ME", new RegExp(`\\b${NAME}\\s+(?:is\\s+)?waiting on me\\b`, "i")],
    ["WAITING_ON_ME", new RegExp(`\\bwhat does\\s+${NAME}\\s+(?:need|want|expect)\\s+from me\\b`, "i")],
    ["OVERDUE_FROM", new RegExp(`\\b(?:what(?:'s| is| tasks are)?\\s+)?overdue\\b[^?]*?\\bfrom\\s+${NAME}`, "i")],
    ["CHANGED_SINCE", new RegExp(`\\bwhat(?:'s| has)?\\s+changed\\b[^?]*?\\bwith\\s+${NAME}`, "i")],
  ];
  for (const [type, re] of relationshipPatterns) {
    const m = t.match(re);
    if (m) {
      const p = cleanName(m[1] ?? "");
      const lp = p.toLowerCase();
      if (p.length > 0 && lp !== "i" && lp !== "me" && lp !== "my" && lp !== "the") {
        return { type, person: p };
      }
    }
  }

  // WAITING_ON — durable directional work the caller is OWED by X. Covers
  // natural + imperfect human phrasing, not just the textbook "waiting on …
  // from X". Each pattern captures the teammate's name in group 1. Checked
  // FIRST so a waiting-on intent is never swallowed by LATEST_TO/RECEIVED_FROM.
  const waitingPatterns: RegExp[] = [
    // "what am I waiting [on] from David" / "what work is waiting from David"
    /\bwaiting(?:\s+on)?\b[^?]*?\bfrom\s+([A-Za-z][A-Za-z'’-]*)/i,
    // "what am I waiting on David for"
    /\bwaiting on\s+([A-Za-z][A-Za-z'’-]*)\s+for\b/i,
    // "what do I need from David"
    /\bneed\b[^?]*?\bfrom\s+([A-Za-z][A-Za-z'’-]*)/i,
    // "what does David owe me" / "what David owes me"
    /\b([A-Za-z][A-Za-z'’-]*)\s+owes?\s+me\b/i,
    // "what is David supposed/going to send me"
    /\b([A-Za-z][A-Za-z'’-]*)\s+(?:is\s+)?(?:supposed|going)\s+to\b/i,
    // "what did I ask David for"
    /\bask(?:ed)?\s+([A-Za-z][A-Za-z'’-]*)\s+for\b/i,
    // "what is pending/outstanding from David" / "what tasks are pending from David"
    /\b(?:pending|outstanding|owed)\b[^?]*?\bfrom\s+([A-Za-z][A-Za-z'’-]*)/i,
  ];
  for (const re of waitingPatterns) {
    const m = t.match(re);
    if (m) {
      const p = cleanName(m[1] ?? "");
      const lp = p.toLowerCase();
      if (p.length > 0 && lp !== "i" && lp !== "me" && lp !== "we" && lp !== "you") {
        return { type: "WAITING_ON", person: p };
      }
    }
  }

  // "did I receive a message from David" / "any messages from David" /
  // "do I have anything from David"
  const received = t.match(
    /\b(?:did i (?:receive|get)|do i have|any|are there|have i (?:received|gotten)|is there)\b[^?]*?\bfrom\s+([A-Za-z][A-Za-z'’-]*)/i,
  );
  if (received) return { type: "RECEIVED_FROM", person: cleanName(received[1]!) };

  // "what did I ask David" / "what did I tell David" / "what did I say to David"
  const toThem = t.match(
    /\bwhat did i\s+(?:ask|tell|say to|send|message)\s+([A-Za-z][A-Za-z'’-]*)/i,
  );
  if (toThem) return { type: "LATEST_TO", person: cleanName(toThem[1]!) };

  // "what did David say" / "what did David just say" / "what did David send me"
  const fromThem = t.match(
    /\bwhat did\s+([A-Za-z][A-Za-z'’-]*)\s+(?:just\s+)?(?:say|said|send|tell)/i,
  );
  if (fromThem) {
    const p = cleanName(fromThem[1]!);
    if (p.toLowerCase() !== "i") return { type: "LATEST_FROM", person: p };
  }
  return null;
}

// WHAT: Compose a grounded answer from the actual thread messages.
// INPUT: the query, the resolved person's display name, the thread messages
//        (ordered ascending). from_me marks the caller's own messages.
// OUTPUT: a natural, speech-ready answer derived ONLY from real records.
export function composeThreadAnswer(
  q: ThreadQuery,
  personDisplay: string,
  messages: DirectThreadMessageView[],
): string {
  const fromThem = messages.filter((m) => !m.from_me);
  const fromMe = messages.filter((m) => m.from_me);
  const latest = <T,>(arr: T[]): T | undefined => (arr.length > 0 ? arr[arr.length - 1] : undefined);

  if (q.type === "RECEIVED_FROM") {
    const m = latest(fromThem);
    return m === undefined
      ? `No, you have not received any messages from ${personDisplay} yet.`
      : `Yes. ${personDisplay} sent: "${m.body}"`;
  }
  if (q.type === "LATEST_FROM") {
    const m = latest(fromThem);
    return m === undefined
      ? `${personDisplay} has not sent you a message yet.`
      : `${personDisplay} said: "${m.body}"`;
  }
  // LATEST_TO
  const m = latest(fromMe);
  return m === undefined
    ? `You have not messaged ${personDisplay} yet.`
    : `You last told ${personDisplay}: "${m.body}"`;
}

// WHAT: compose the "what am I waiting on from X" answer from durable
//        waiting-on records (never faked — empty means nothing tracked).
export function composeWaitingOnAnswer(
  personDisplay: string,
  waitingOnThem: WaitingOnItemView[],
): string {
  if (waitingOnThem.length === 0) {
    return `You're not waiting on anything tracked from ${personDisplay} right now.`;
  }
  const titles = waitingOnThem.slice(0, 5).map((w) => w.title).join("; ");
  return `You're waiting on ${personDisplay} for: ${titles}`;
}

// WHAT: compose a durable answer for a relationship work-graph query from the
//        REAL /work-os/relationship records. Empty → honest durable empty; never
//        faked, never vague-memory. Titles only (no raw ids as primary labels).
function titlesOf(items: RelationshipItemView[]): string {
  return items.slice(0, 5).map((i) => i.title).join("; ");
}

export function composeRelationshipAnswer(
  type: ThreadQueryType,
  personDisplay: string,
  rel: RelationshipWorkResponse,
  now: number = Date.now(),
): string {
  const completed = rel.completed ?? [];
  const blockers = rel.blockers ?? [];
  const decisions = rel.decisions ?? [];
  const waitingOnThem = rel.waiting_on_them ?? [];
  const pendingFromThem = rel.pending_from_them ?? [];

  switch (type) {
    case "COMPLETED_BY": {
      const done = completed.filter((c) => c.owner_display_name === personDisplay || c.owner_entity_id !== null);
      return done.length === 0
        ? `I don't see anything ${personDisplay} has completed with you yet.`
        : `${personDisplay} completed: ${titlesOf(done)}`;
    }
    case "BLOCKERS_WITH":
      return blockers.length === 0
        ? `I don't see any blockers involving ${personDisplay} right now.`
        : `Blockers involving ${personDisplay}: ${titlesOf(blockers)}`;
    case "DECISIONS_WITH":
      return decisions.length === 0
        ? `I don't see any decisions tracked with ${personDisplay} yet.`
        : `Decisions with ${personDisplay}: ${titlesOf(decisions)}`;
    case "WAITING_ON_ME":
      return pendingFromThem.length === 0
        ? `${personDisplay} isn't waiting on you for anything tracked right now.`
        : `${personDisplay} is waiting on you for: ${titlesOf(pendingFromThem)}`;
    case "OVERDUE_FROM": {
      const overdue = waitingOnThem.filter(
        (w) => w.due_at !== null && Date.parse(w.due_at) < now,
      );
      return overdue.length === 0
        ? `Nothing is overdue from ${personDisplay} right now.`
        : `Overdue from ${personDisplay}: ${titlesOf(overdue)}`;
    }
    case "CHANGED_SINCE": {
      const cutoff = now - 24 * 60 * 60 * 1000;
      const recent = [...waitingOnThem, ...pendingFromThem, ...completed, ...blockers, ...decisions].filter(
        (i) => Date.parse(i.updated_at) >= cutoff,
      );
      return recent.length === 0
        ? `Nothing tracked with ${personDisplay} changed in the last day.`
        : `Recently changed with ${personDisplay}: ${titlesOf(recent)}`;
    }
    case "RELATIONSHIP_SUMMARY":
    default: {
      const parts: string[] = [];
      if (waitingOnThem.length > 0) parts.push(`waiting on ${personDisplay} for ${waitingOnThem.length}`);
      if (pendingFromThem.length > 0) parts.push(`${personDisplay} waiting on you for ${pendingFromThem.length}`);
      if (completed.length > 0) parts.push(`${completed.length} completed`);
      if (blockers.length > 0) parts.push(`${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`);
      if (decisions.length > 0) parts.push(`${decisions.length} decision${decisions.length === 1 ? "" : "s"}`);
      if (parts.length === 0) {
        return `I don't see any tracked work with ${personDisplay} yet.`;
      }
      return `Your work with ${personDisplay}: ${parts.join(" · ")}.`;
    }
  }
}
