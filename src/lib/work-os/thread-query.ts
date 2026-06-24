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
  // [OTZAR-LIVE-6] response reconciliation — "Did David respond?", "any update
  // from David?", "is David ready?", "what did David reply?". Reads the latest
  // message FROM the person in the governed thread and reports it + a light
  // ready/blocked/declined/question read.
  | "RESPONSE_STATUS"
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
  // Cut at the first non-name char, then drop a trailing possessive
  // ("David's response" → "David") so the resolver gets the base name.
  return raw.replace(/[^A-Za-z'’-].*$/, "").replace(/['’]s$/i, "").trim();
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

  // [OTZAR-LIVE-6] RESPONSE_STATUS — "Did David respond?", "any update from
  // David?", "is David ready?", "has he confirmed?", "what did David reply?".
  // Checked before WAITING/RECEIVED so a response question isn't swallowed. Reads
  // the latest message FROM the person in the governed thread.
  const responsePatterns: RegExp[] = [
    new RegExp(`\\bdid\\s+${NAME}\\s+(?:respond|reply|answer|get\\s+back|confirm|acknowledge|accept|see\\s+(?:it|this|my))`, "i"),
    new RegExp(`\\bhas\\s+${NAME}\\s+(?:responded|replied|answered|confirmed|acknowledged|gotten\\s+back|seen)`, "i"),
    new RegExp(`\\b(?:any|an|some)\\s+(?:update|reply|response|word|news)\\b[^?]*?\\bfrom\\s+${NAME}`, "i"),
    new RegExp(`\\bis\\s+${NAME}\\s+ready\\b`, "i"),
    new RegExp(`\\bwhat(?:'s| is| was)\\s+(?:the\\s+)?status\\b[^?]*?\\b(?:of\\s+)?(?:the\\s+)?${NAME}(?:'s)?\\b`, "i"),
    new RegExp(`\\bwhat\\s+(?:did|was)\\s+${NAME}(?:'s)?\\s+(?:reply|response|answer)\\b`, "i"),
    new RegExp(`\\bdid\\s+${NAME}\\s+get\\s+(?:the\\s+|my\\s+)?(?:message|note|request|it)\\b`, "i"),
    new RegExp(`\\bwhat happened\\b[^?]*?\\bsent\\s+(?:to\\s+)?${NAME}`, "i"),
  ];
  for (const re of responsePatterns) {
    const m = t.match(re);
    if (m) {
      const p = cleanName(m[1] ?? "");
      const lp = p.toLowerCase();
      if (p.length > 0 && !/^(?:i|me|my|we|you|he|she|they|it|the|this|that|there|team|people|everyone|anyone|someone|nobody|today|tomorrow)$/i.test(lp)) {
        return { type: "RESPONSE_STATUS", person: p };
      }
    }
  }

  // [OTZAR-LIVE-6] Inbound message lookup — "did David send me anything", "has
  // David messaged me", "did David text/ping/reach out to me", and the founder's
  // exact "I'm asking if David messaged me". Here the SUBJECT is the sender (X)
  // with NO "from X" object, so the RECEIVED_FROM "from X" pattern below can't
  // see it — and worse, the verb "send" otherwise trips the OUTBOUND draft path
  // (the founder's "did david send me anything" wrongly drafted a message).
  // Anchored on the interrogative did/has/if/whether frame so an IMPERATIVE
  // outbound ("send David an update") is never swallowed. Mapped to RECEIVED_FROM
  // so it reads the governed thread (Otzar's own messages/replies), not the LLM.
  const inboundSenderPatterns: RegExp[] = [
    new RegExp(`\\b(?:did|has|have|did\\s*n'?t|has\\s*n'?t|have\\s*n'?t)\\s+${NAME}\\s+(?:sent|send|message|messaged|text|texted|dm|dmed|dm'?d|ping|pinged|email|emailed|e-?mailed|wrote|write|reach(?:ed)?\\s+out|got(?:ten)?\\s+back\\s+to|contact(?:ed)?)\\b[^?]*?\\bme\\b`, "i"),
    new RegExp(`\\b(?:if|whether)\\s+${NAME}\\s+(?:sent|send|messaged|message|texted|text|dm'?d|dmed|pinged|emailed|e-?mailed|wrote|reach(?:ed)?\\s+out|got(?:ten)?\\s+back\\s+to|contact(?:ed)?)\\b[^?]*?\\bme\\b`, "i"),
    new RegExp(`\\b(?:anything|something|any\\s+(?:messages?|notes?|word|updates?))\\s+(?:new\\s+)?from\\s+${NAME}\\b`, "i"),
  ];
  for (const re of inboundSenderPatterns) {
    const m = t.match(re);
    if (m) {
      const p = cleanName(m[1] ?? "");
      const lp = p.toLowerCase();
      if (p.length > 0 && !/^(?:i|me|my|we|you|he|she|they|it|the|this|that|there|team|people|everyone|anyone|someone|nobody|today|tomorrow)$/i.test(lp)) {
        return { type: "RECEIVED_FROM", person: p };
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
// WHAT: relative "x minutes ago" for a reply timestamp (speech-ready, no raw ISO).
function relativeTime(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "recently";
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

// WHAT: a light, honest read of what a reply means for the work state. Returns ""
//        when the reply doesn't clearly signal anything (never overclaims done).
export function replyStatusNote(body: string): string {
  const b = body.toLowerCase();
  if (/\b(?:blocked|waiting on|can'?t proceed|cannot proceed|need access|need approval|stuck)\b/.test(b))
    return "Sounds blocked — you may need to clear that.";
  if (/\b(?:can'?t make it|cannot make it|can'?t do|not available|won'?t be able|unable to|decline|not mine|not the owner|ask someone else)\b/.test(b))
    return "Sounds like they can't take it — it may need reassigning.";
  if (/\?\s*$|\b(?:which one|what do you mean|who is this for|what should i)\b/.test(b))
    return "They asked a question — you owe a reply.";
  if (/\b(?:done|completed|finished|reviewed|sent it|handled it|ready|confirm|on it|validate|received|got it|understood|i'?ll be ready|will be ready|i'?m on it)\b/.test(b))
    return "I'll treat that as confirmed.";
  return "";
}

export function composeThreadAnswer(
  q: ThreadQuery,
  personDisplay: string,
  messages: DirectThreadMessageView[],
  now: number = Date.now(),
): string {
  const fromThem = messages.filter((m) => !m.from_me);
  const fromMe = messages.filter((m) => m.from_me);
  const latest = <T,>(arr: T[]): T | undefined => (arr.length > 0 ? arr[arr.length - 1] : undefined);

  // [OTZAR-LIVE-6] response reconciliation — quote the latest reply + a light
  // ready/blocked/declined/question read, or an honest "no reply yet".
  if (q.type === "RESPONSE_STATUS") {
    const m = latest(fromThem);
    if (m === undefined) return `I don't see a reply from ${personDisplay} yet.`;
    const note = replyStatusNote(m.body);
    return `Yes — ${personDisplay} replied ${relativeTime(m.created_at, now)}: "${m.body}".${note ? " " + note : ""}`;
  }

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
