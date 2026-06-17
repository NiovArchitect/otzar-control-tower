// FILE: ask-twin.ts
// PURPOSE: Phase 1285-R — deterministic classifier for the "Ask your Twin" box
//          on the My Twin page. It decides, BEFORE any LLM call, whether a
//          typed question is:
//            1. a known Work OS question  → route to its durable surface
//               (My Work / Blind Spots / Team Work), never the LLM;
//            2. aimed at ANOTHER person's Twin → disabled-honest (Otzar will
//               not answer for or impersonate someone else's Twin; offer a
//               governed request in Collaboration);
//            3. a genuine SELF question  → answered over the caller's OWN
//               governed context via the existing conductSession + COE backend.
// CONNECTS TO: src/lib/voice/voice-action-runtime.ts (matchWorkOsQuery — the
//          SHARED deterministic Work OS patterns), src/pages/app/MyTwin.tsx
//          (the Ask box), tests/unit/ask-twin.test.ts.

import { matchWorkOsQuery } from "@/lib/voice/voice-action-runtime";

export const COLLABORATION_ROUTE = "/app/collaboration";

export type AskTwinClassification =
  | { kind: "WORK_OS_ROUTE"; route: string; label: string }
  | { kind: "OTHER_TWIN"; target: string | null }
  | { kind: "SELF_ASK" };

// Known teammate first names (lowercase). Used ONLY to detect a question aimed
// at someone else's Twin so it can be routed disabled-honest. This is a
// conservative heuristic; a question that merely MENTIONS a teammate
// ("what's the status of David's review?") is still a SELF question answered
// over the caller's own governed context, NOT impersonation.
const TEAMMATE_NAMES = [
  "david",
  "samiksha",
  "vishesh",
  "annie",
  "shweta",
  "walter",
  "william",
  "maria",
  "carlos",
];

// WHAT: does the text explicitly ask SOMEONE ELSE's Twin to do/answer something?
// INPUT: lowercased text.
// OUTPUT: true when the phrasing delegates to another person's Twin.
// WHY: only an explicit "ask <name>('s twin)" / "ask their/his/her twin" is
//      cross-entity. Self ("my twin" / "otzar") is excluded by the caller.
function asksAnotherTwin(lower: string): boolean {
  if (!/\bask\b/.test(lower)) return false;
  if (/\b(my twin|my own twin|otzar)\b/.test(lower)) return false;
  // "ask <name>" or "<name>'s twin" / "their|his|her twin"
  if (/\b(their|his|her|someone'?s|somebody'?s)\s+twin\b/.test(lower)) return true;
  for (const name of TEAMMATE_NAMES) {
    // "ask david", "ask david's twin", "david's twin"
    if (new RegExp(`\\bask\\b[^.?!]*\\b${name}\\b`).test(lower)) return true;
    if (new RegExp(`\\b${name}'?s\\s+twin\\b`).test(lower)) return true;
  }
  return false;
}

// WHAT: extract the named teammate the question is aimed at (display only).
// OUTPUT: capitalized first name, or null. NEVER a raw id.
function extractTarget(lower: string, original: string): string | null {
  for (const name of TEAMMATE_NAMES) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) {
      // Recover original casing from the source text when possible.
      const m = original.match(new RegExp(`\\b(${name})\\b`, "i"));
      const found = m?.[1] ?? name;
      return found.charAt(0).toUpperCase() + found.slice(1).toLowerCase();
    }
  }
  return null;
}

// WHAT: classify an "Ask your Twin" question deterministically.
// INPUT: the raw question text.
// OUTPUT: AskTwinClassification (work-os route | other-twin | self-ask).
// WHY: known Work OS questions ALWAYS go to their durable surface; questions
//      aimed at another person's Twin stay disabled-honest; everything else is
//      a self question for the governed backend. No LLM is consulted here.
export function classifyAskTwin(text: string): AskTwinClassification {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1) Known Work OS question → deterministic route (never the LLM).
  const workOs = matchWorkOsQuery(lower);
  if (workOs !== null) {
    return { kind: "WORK_OS_ROUTE", route: workOs.route, label: workOs.label };
  }

  // 2) Aimed at someone else's Twin → disabled-honest.
  if (asksAnotherTwin(lower)) {
    return { kind: "OTHER_TWIN", target: extractTarget(lower, trimmed) };
  }

  // 3) Self question → governed conductSession over the caller's own context.
  return { kind: "SELF_ASK" };
}
