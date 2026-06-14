// FILE: thread-query.ts
// PURPOSE: Phase 1285 slice 1 — make Otzar answer relationship/thread
//          questions from REAL authorized thread records (not the LLM /
//          memory). Classifies "did I receive a message from X", "what did
//          X say", "what did I ask/tell X" into a thread query, and composes
//          a grounded answer from the actual GET /work-os/threads/with/:id
//          messages. Pure + unit-tested so the grounding can't silently drift.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx (handleSendText
//          intercept), api.workOs.thread, tests/unit/thread-query.test.ts.

import type { DirectThreadMessageView, WaitingOnItemView } from "@/lib/types/foundation";

export type ThreadQueryType = "RECEIVED_FROM" | "LATEST_FROM" | "LATEST_TO" | "WAITING_ON";

export interface ThreadQuery {
  type: ThreadQueryType;
  person: string;
}

function cleanName(raw: string): string {
  return raw.replace(/[^A-Za-z'’-].*$/, "").trim();
}

// WHAT: Classify a thread/relationship question into {type, person}, or null.
// WHY: lets the ambient bar answer from real thread records instead of
//      routing to the LLM/navigation. Order matters — "what did I ask X"
//      (LATEST_TO) is checked before "what did X say" (LATEST_FROM).
export function classifyThreadQuery(text: string): ThreadQuery | null {
  const t = text.trim();

  // "what am I waiting on from David" / "what does David owe me"
  const waiting = t.match(
    /\bwhat (?:am i|are we)\s+waiting on\b[^?]*?\bfrom\s+([A-Za-z][A-Za-z'’-]*)|\bwhat does\s+([A-Za-z][A-Za-z'’-]*)\s+owe me\b/i,
  );
  if (waiting) return { type: "WAITING_ON", person: cleanName(waiting[1] ?? waiting[2] ?? "") };

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
