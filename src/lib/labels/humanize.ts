// FILE: humanize.ts
// PURPOSE: Phase 1255 — central admin copy humanizer. Admins are
//          CEOs, HR leads, compliance officers — not developers.
//          Raw EVENT_NAMES_WITH_UNDERSCORES, provider codes, and
//          status enums become plain sentences; anything technical
//          (hashes, ids) belongs behind a "technical proof"
//          disclosure, never in primary copy.
// CONNECTS TO: src/pages/Security.tsx, admin pages, AUDIT label map
//          (src/lib/audit/event-types.ts — consulted first),
//          tests/unit/admin-humanize.test.ts.

import { AUDIT_EVENT_TYPE_LABELS } from "@/lib/audit/event-types";

const SPECIAL_WORDS: Record<string, string> = {
  ai: "AI",
  llm: "AI provider",
  mcp: "AI tool",
  cosmp: "governed memory",
  dmw: "Digital Work Wallet",
  stt: "speech-to-text",
  tts: "voice output",
  ocr: "document reading",
  api: "API",
  id: "ID",
};

// WHAT: UNDERSCORE_EVENT_NAME → "Sentence case title".
// WHY: every audit row must read as an activity a human did or saw,
//      with the curated label map first and a safe generic fallback
//      so NEW Foundation literals never leak raw into the UI.
export function humanizeAuditEventType(eventType: string): string {
  const curated = (AUDIT_EVENT_TYPE_LABELS as Record<string, string>)[
    eventType
  ];
  if (curated !== undefined) return curated;
  const words = eventType
    .toLowerCase()
    .split("_")
    .filter((w) => w.length > 0)
    .map((w) => SPECIAL_WORDS[w] ?? w);
  if (words.length === 0) return "Activity";
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// WHAT: Provider/status enums → calm labels.
export function humanizeStatus(status: string): string {
  const map: Record<string, string> = {
    CONFIGURED: "Connected",
    BLOCKED_BY_CREDENTIALS: "Needs credentials",
    BLOCKED_BY_APP_REVIEW: "Needs app review",
    NOT_AUTHORIZED: "Needs explicit authorization",
    DEMO_ONLY: "Demo only",
    DEV_ONLY: "Development only",
    NOT_CONFIGURED: "Not set up yet",
    PROD: "Live",
    PROD_READY_PENDING_SCHEMA_PUSH: "Ready — awaiting schema approval",
    NOT_STARTED: "Not started",
    FALLBACK_AVAILABLE: "Working with built-in fallback",
  };
  return map[status] ?? humanizeAuditEventType(status);
}
