// FILE: voice-action-runtime.ts
// PURPOSE: Phase 1264 (Addendum, Parts J/K) — voice as the OPERATING
//          LAYER, not just a chat box. A deterministic, pure
//          classifier that turns one spoken/typed utterance into a
//          safe VoiceAction: internal navigation, connector-status
//          navigation, a safe external-URL open, a draft-only
//          (approval-gated) action, or a fall-through to the SAME
//          governed chat path as typed input.
//
// GOVERNANCE (load-bearing):
//   - This module NEVER mutates data and NEVER performs an external
//     write. It classifies + routes. Navigation is read-only; every
//     write still happens on its governed destination surface.
//   - External URLs are protocol-allowlisted: only http/https. The
//     dangerous schemes (javascript:, data:, file:, shell:, command:,
//     vbscript:, blob:, about:) are BLOCKED with honest copy.
//   - "Send / email / post to <someone>" is DRAFT-ONLY: it routes to
//     the governed comms surface and asks for explicit approval — no
//     message ever leaves automatically in this phase.
//   - Anything not safely matched falls through to GOVERNED_CHAT.
// CONNECTS TO: command-router.ts (internal surfaces), AmbientOtzarBar
//          (executes actions + shows Heard/Action/Result/Voice),
//          tests/unit/voice-action-runtime.test.ts.

import type { AuthCapabilities } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { routeVoiceCommand } from "@/lib/voice/command-router";

export type VoiceActionKind =
  // Navigation
  | "INTERNAL_NAVIGATION"
  | "CONNECTOR_STATUS_NAVIGATION"
  | "EXTERNAL_URL_OPEN"
  | "BLOCKED_URL"
  | "ADMIN_BLOCKED"
  // Work OS — governed work (Phase 1265)
  | "CONNECTOR_STATUS_SUMMARY" // read-only: summarize real connector/OAuth state
  | "APPROVALS_REVIEW" // navigate + fetch real pending approvals
  | "DRAFT_MESSAGE" // draft only; approval + recipient confirmation required
  | "SEND_REQUIRES_APPROVAL" // never auto-send; route to approval/comms
  | "ASK_TWIN" // route to collaboration; never fake the answer
  | "SCHEDULE_MEETING" // draft a calendar proposal; never auto-create
  | "MEETING_NOTES_TO_ACTIONS" // needs a meeting/transcript; route or block
  | "ZOOM_RECORDINGS" // verified but no recordings runtime yet
  | "WORKFLOW_START" // requires confirmation; route to workflows
  | "READ_ONLY_SUMMARY" // route to the surface that owns the data
  // Fallbacks
  | "DRAFT_ONLY" // legacy umbrella (kept for back-compat)
  | "GOVERNED_CHAT"
  | "UNSUPPORTED";

export interface VoiceAction {
  kind: VoiceActionKind;
  /** The transcript exactly as heard (for the "Heard:" UI line). */
  heard: string;
  /** Short, human label for the "Action:" UI line. */
  actionLabel: string;
  /** Calm confirmation spoken back via premium voice. */
  spoken: string;
  /** Frontend route for INTERNAL_NAVIGATION / CONNECTOR_STATUS_*. */
  route?: string;
  /** Connector slug to focus (slack / google / zoom / microsoft). */
  provider?: string;
  /** Validated, normalized https?:// URL for EXTERNAL_URL_OPEN. */
  url?: string;
  /** Why a URL/action was blocked (BLOCKED_URL / UNSUPPORTED). */
  blockedReason?: string;
  /** True when the user must confirm before the action proceeds. */
  needsConfirmation?: boolean;
  /** Passthrough text for GOVERNED_CHAT. */
  transcript?: string;
  // ── Work OS structured fields (Phase 1265) ──────────────────────
  /** True when the action would write outside the org (send/post/email/invite). */
  isExternalWrite?: boolean;
  /** True when the action only reads data. */
  isReadOnly?: boolean;
  /** True when the action creates/requests an approval-gated effect. */
  requiresApproval?: boolean;
  /** Best-effort recipient/target extracted from the utterance. */
  targetEntity?: string;
  /** Best-effort connector channel (slack / email / internal / calendar). */
  connector?: string;
  /** Best-effort draft body extracted from the utterance. */
  draftPayload?: string;
  /** The Foundation action_type this maps to, when applicable. */
  backendActionType?: string;
  /** Closest real route to offer when the exact runtime is missing. */
  closestRoute?: string;
}

const NAV_VERBS = [
  "take me to",
  "go to",
  "navigate to",
  "bring up",
  "pull up",
  "open up",
  "open",
  "show me",
  "show",
];

const DANGEROUS_SCHEMES = [
  "javascript:",
  "data:",
  "file:",
  "shell:",
  "command:",
  "vbscript:",
  "blob:",
  "about:",
];

/** Provider keyword → connector slug, for CONNECTOR_STATUS navigation
 *  and provider focus on the Connector + MCP rails page. */
const PROVIDER_KEYWORDS: ReadonlyArray<{ slug: string; label: string; words: string[] }> = [
  { slug: "google", label: "Google Workspace", words: ["google", "workspace", "gmail", "google calendar"] },
  { slug: "slack", label: "Slack", words: ["slack"] },
  { slug: "zoom", label: "Zoom", words: ["zoom"] },
  { slug: "microsoft", label: "Microsoft 365", words: ["microsoft", "entra", "outlook", "microsoft teams", "365"] },
];

const CONNECTOR_RAILS_ROUTE = "/connector-rails";
const COMMS_ROUTE = "/app/comms";

/** Explicit navigation destinations named in the Voice Action Runtime
 *  spec — including the admin/system surfaces the employee-focused
 *  command-router does not carry. Longest matching keyword wins.
 *  admin_only destinations return ADMIN_BLOCKED for non-admins. */
const ACTION_DESTINATIONS: ReadonlyArray<{
  keywords: string[];
  route: string;
  label: string;
  admin_only: boolean;
}> = [
  // ── Admin / product surfaces (real routes only) ──────────────
  { keywords: ["workspace connections", "connector rails", "connector + mcp", "mcp rails", "connectors", "mcp"], route: CONNECTOR_RAILS_ROUTE, label: "Workspace connections", admin_only: true },
  { keywords: ["voice providers"], route: "/voice-providers", label: "Voice Providers", admin_only: true },
  { keywords: ["system health"], route: "/system-health", label: "System Health", admin_only: true },
  { keywords: ["admin command center", "command center", "admin home", "admin dashboard", "admin"], route: "/", label: "Admin command center", admin_only: true },
  { keywords: ["security audit", "audit log", "audit trail", "security"], route: "/security-audit", label: "Security & Audit", admin_only: true },
  { keywords: ["reports"], route: "/reports", label: "Reports", admin_only: true },
  { keywords: ["workflows", "workflow"], route: "/workflows", label: "Workflows", admin_only: true },
  { keywords: ["retention"], route: "/retention", label: "Retention", admin_only: true },
  { keywords: ["data knowledge", "data-knowledge", "knowledge base"], route: "/data-knowledge", label: "Data & Knowledge", admin_only: true },
  // ── Employee surfaces (real routes only) ─────────────────────
  { keywords: ["employee chat", "chat"], route: "/app/chat", label: "Employee Chat", admin_only: false },
  { keywords: ["employee page", "employee home", "employee"], route: "/app", label: "Employee home", admin_only: false },
  { keywords: ["my twin"], route: "/app/my-twin", label: "My Twin", admin_only: false },
  { keywords: ["authority"], route: "/app/authority-grants", label: "Authority", admin_only: false },
  { keywords: ["preferences"], route: "/app/preferences", label: "Preferences", admin_only: false },
  { keywords: ["projects"], route: "/app/work-projects", label: "Projects", admin_only: false },
  // ── Work OS cockpits (Phase 1279 durable Work Ledger) ─────────
  { keywords: ["my work", "what do i owe", "what i owe", "what is waiting on me", "what's waiting on me", "what do i need to do"], route: "/app/my-work", label: "My Work", admin_only: false },
  { keywords: ["team work", "team's work", "what does my team owe", "who is waiting on whom"], route: "/app/team-work", label: "Team Work", admin_only: false },
  { keywords: ["blind spots", "blind spot", "what am i missing", "what's blocked", "what is blocked", "what is slipping", "what's slipping"], route: "/app/blind-spots", label: "Blind Spots", admin_only: false },
  { keywords: ["work comms"], route: COMMS_ROUTE, label: "Work Comms", admin_only: false },
  { keywords: ["action center", "approvals"], route: "/app/action-center", label: "Action Center", admin_only: false },
  { keywords: ["corrections", "correct otzar"], route: "/app/corrections", label: "Corrections", admin_only: false },
  { keywords: ["conversations", "conversation history"], route: "/app/conversations", label: "Conversations", admin_only: false },
  { keywords: ["my organization", "organization context", "org context", "organization"], route: "/app/my-organization", label: "Organization", admin_only: false },
  { keywords: ["collaborators", "collaboration"], route: "/app/collaboration", label: "Collaboration", admin_only: false },
  { keywords: ["voice page", "talk to otzar", "voice"], route: "/app/voice", label: "Voice", admin_only: false },
];

/** Onboarding/setup is role-aware: admins land on the org setup /
 *  production-readiness surface; employees land on their onboarding
 *  readiness page. Both are real routes. */
const ONBOARDING_ADMIN_ROUTE = "/onboarding";
const ONBOARDING_EMPLOYEE_ROUTE = "/app/onboarding-readiness";

/** Verbs that count as "navigate me there" for onboarding, including
 *  continue/start/show which the generic NAV_VERBS list omits. */
const ONBOARDING_VERBS =
  /\b(take me to|go to|navigate to|bring up|pull up|open up|open|show me|show|continue|start|resume|begin)\b/;

// WHAT: Validate + normalize a possible URL inside an utterance.
// OUTPUT: { ok, url } for a safe http(s) URL; { blocked, reason } for a
//         dangerous scheme; { none } when no URL is present.
// WHY: voice must never be a vector for javascript:/file:/data: — the
//      allowlist is positive (http/https only).
export function classifyUrlCandidate(
  utterance: string,
):
  | { state: "ok"; url: string }
  | { state: "blocked"; reason: string }
  | { state: "none" } {
  const text = utterance.trim();
  const lower = text.toLowerCase();

  // 1) Any dangerous scheme token anywhere → block outright.
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lower.includes(scheme)) {
      return { state: "blocked", reason: `unsafe URL protocol (${scheme})` };
    }
  }

  // 2) Explicit http(s) URL.
  const explicit = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (explicit) {
    try {
      const u = new URL(explicit[0]);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return { state: "ok", url: u.toString() };
      }
      return { state: "blocked", reason: `unsafe URL protocol (${u.protocol})` };
    } catch {
      return { state: "blocked", reason: "malformed URL" };
    }
  }

  // 3) Spoken "dot" form ("niovlabs dot com") + bare domains. Only
  //    treated as a URL when an open/website intent is present so we
  //    don't hijack ordinary sentences.
  const wantsOpen =
    NAV_VERBS.some((v) => lower.includes(v)) ||
    lower.includes("url") ||
    lower.includes("website") ||
    lower.includes("link");
  const dotted = lower.replace(/\s+dot\s+/g, ".");
  const bare = dotted.match(/\b([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}(\/[^\s]*)?/i);
  if (bare && wantsOpen) {
    const candidate = bare[0];
    // Reject things that look like sentence fragments, not hosts.
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(candidate)) {
      try {
        const u = new URL(`https://${candidate}`);
        return { state: "ok", url: u.toString() };
      } catch {
        return { state: "none" };
      }
    }
  }
  return { state: "none" };
}

function matchProvider(lower: string): { slug: string; label: string } | null {
  for (const p of PROVIDER_KEYWORDS) {
    if (p.words.some((w) => lower.includes(w))) return { slug: p.slug, label: p.label };
  }
  return null;
}

/** How many distinct providers are named (drives single-focus vs
 *  multi-provider summary). */
function countProviders(lower: string): number {
  return PROVIDER_KEYWORDS.filter((p) => p.words.some((w) => lower.includes(w)))
    .length;
}

/** Hard work verbs that imply an app ACTION (not conversation). When
 *  one is present but no specific Work-OS handler matched, the request
 *  is UNSUPPORTED — never handed to the Twin to refuse. */
const HARD_WORK_VERB =
  /\b(draft|send|post|email|notify|dm|schedule|book|assign|create a task|make a task|start the|run the|kick ?off)\b/;

/** Best-effort recipient extraction ("to David", "with Vishesh", "ask
 *  David", "message Samiksha"). Verb is matched case-insensitively; the
 *  name must be a Capitalized word (so "to review" is not a recipient).
 *  Common non-name words are filtered out. */
const RECIPIENT_STOP_WORDS = new Set([
  "the",
  "this",
  "that",
  "a",
  "an",
  "everyone",
  "them",
  "him",
  "her",
  "us",
  "me",
  "my",
  "our",
  "work",
  "review",
  "it",
]);
function firstName(text: string, re: RegExp): string | undefined {
  for (const m of text.matchAll(re)) {
    const name = m[1];
    if (
      name !== undefined &&
      /^[A-Z]/.test(name) &&
      !RECIPIENT_STOP_WORDS.has(name.toLowerCase())
    ) {
      return name;
    }
  }
  return undefined;
}
function extractRecipient(text: string): string | undefined {
  // Prepositions first ("to David", "with Vishesh") so a verb like
  // "message" can't capture the preposition ("message TO David").
  return (
    firstName(text, /\b(?:to|with|for)\s+([A-Za-z]+)/gi) ??
    firstName(text, /\b(?:message|email|ask|notify|dm|send|post)\s+([A-Za-z]+)/gi)
  );
}

/** Best-effort draft body extraction ("saying ...", "that ..."). */
function extractBody(text: string): string | undefined {
  const m = text.match(/\b(?:saying|that says|that|:)\s+(.{3,})$/i);
  return m?.[1]?.trim();
}

/** Best-effort channel ("slack", "email", else internal). */
function detectChannel(lower: string): "slack" | "email" | "internal" {
  if (lower.includes("slack")) return "slack";
  if (lower.includes("email") || lower.includes("e-mail")) return "email";
  return "internal";
}

const APPROVALS_EMPLOYEE_ROUTE = "/app/approvals";
const WORK_PROJECTS_ROUTE = "/app/work-projects";
const CONVERSATIONS_ROUTE = "/app/conversations";
const WORKFLOWS_ROUTE = "/workflows";
const COLLABORATION_ROUTE = "/app/collaboration";

// WHAT: Classify one utterance into a safe VoiceAction.
// INPUT: the transcript + caller capabilities (for admin gating).
// OUTPUT: a VoiceAction the orb executes + narrates.
// WHY: deterministic, testable routing BEFORE any LLM — useful, safe,
//      and small (Addendum Part K).
export function classifyVoiceAction(
  utterance: string,
  capabilities: AuthCapabilities | null,
): VoiceAction {
  const heard = utterance.trim();
  const lower = heard.toLowerCase();
  if (heard.length === 0) {
    return {
      kind: "GOVERNED_CHAT",
      heard,
      actionLabel: "Ask Otzar",
      spoken: "",
      transcript: heard,
    };
  }

  // 1) URL handling first — explicit schemes are unambiguous.
  const urlResult = classifyUrlCandidate(heard);
  if (urlResult.state === "blocked") {
    return {
      kind: "BLOCKED_URL",
      heard,
      actionLabel: "Blocked unsafe URL",
      spoken: "I can't open that — it isn't a safe web link.",
      blockedReason: urlResult.reason,
    };
  }
  if (urlResult.state === "ok") {
    let host = urlResult.url;
    try {
      host = new URL(urlResult.url).host;
    } catch {
      /* keep full url */
    }
    return {
      kind: "EXTERNAL_URL_OPEN",
      heard,
      actionLabel: `Open external link → ${host}`,
      spoken: `Opening ${host} in your browser.`,
      url: urlResult.url,
    };
  }

  // 2a) Connector status SUMMARY (read-only, real data). Generic
  //     "what's connected", "summarize connectors", multi-provider
  //     status, or "is X connected" — the orb fetches real OAuth +
  //     adapter status and summarizes. Single-provider focus (2b) wins
  //     for "show Slack verification".
  const connectorSummaryIntent =
    /what'?s connected|what is connected|whats connected|summar(?:ise|ize)\s+(?:the\s+)?connector|connector summary|what integrations|which integrations|are (?:my )?(?:connectors|integrations)|is\s+(?:microsoft|slack|zoom|google)\b[^?]*\bconnected/.test(
      lower,
    ) || countProviders(lower) >= 2;
  if (connectorSummaryIntent) {
    return {
      kind: "CONNECTOR_STATUS_SUMMARY",
      heard,
      actionLabel: "Connector status summary",
      spoken: "Checking what's connected.",
      isReadOnly: true,
    };
  }

  // 2b) Connector-status navigation (provider + status/verification/
  //    connector/parked intent). Admin-gated like the rails page.
  const provider = matchProvider(lower);
  const connectorIntent =
    lower.includes("connector") ||
    lower.includes("verification") ||
    lower.includes("verify") ||
    lower.includes("status") ||
    lower.includes("parked") ||
    lower.includes("workspace connection");
  if (provider !== null && connectorIntent) {
    if (!isOrgAdmin(capabilities)) {
      return {
        kind: "ADMIN_BLOCKED",
        heard,
        actionLabel: "Admin-only area",
        spoken:
          "Connector status is an admin area. I can show you what you're allowed to manage — try 'my authority'.",
      };
    }
    return {
      kind: "CONNECTOR_STATUS_NAVIGATION",
      heard,
      actionLabel: `Connector status → ${provider.label}`,
      spoken: `Opening Workspace connections and focusing ${provider.label}. I won't run verification unless you ask.`,
      route: `${CONNECTOR_RAILS_ROUTE}?focus=${provider.slug}`,
      provider: provider.slug,
    };
  }

  // 2c) Approvals review — navigate to the approvals surface AND fetch
  //     the real pending count (the orb calls api.escalations.pending).
  // NOTE (Phase 1279): bare "what's waiting on me" now routes to the My
  // Work cockpit (which surfaces confirmations + approvals waiting on me);
  // this intent keeps the explicit approval phrasings only.
  const approvalsIntent =
    /\bneeds my approval\b|\bwhat (?:needs|requires) approval\b|\bpending (?:approvals|decisions)\b|\b(?:show|open|view)\b[^?]*\b(approvals?|action center)\b|\bmy approvals\b/.test(
      lower,
    );
  if (approvalsIntent) {
    return {
      kind: "APPROVALS_REVIEW",
      heard,
      actionLabel: "Approvals review",
      spoken: "Opening Action Center and checking what needs your approval.",
      route: APPROVALS_EMPLOYEE_ROUTE,
      isReadOnly: true,
    };
  }

  // 2.5) Onboarding / setup — role-aware, and recognizes verbs the
  //      generic list omits (continue / start / show). A QUESTION about
  //      onboarding ("how do I complete onboarding?") is NOT navigation.
  //      This is the fix for the live failure where "take me to the
  //      onboarding screen" fell through to the Twin.
  const mentionsOnboarding =
    /\b(onboarding|onboard|getting started|first[- ]?run)\b/.test(lower) ||
    /\bset ?up\b/.test(lower) ||
    /\bget started\b/.test(lower);
  const isQuestion =
    /^(how|what|why|when|where|can|could|would|should|do|does|is|are|will)\b/.test(
      lower,
    ) || lower.includes("?");
  // A "...onboarding workflow" command is a WORKFLOW action, not
  // onboarding navigation — let the work handler own it.
  const mentionsWorkflow = /\bworkflow\b/.test(lower);
  if (
    mentionsOnboarding &&
    ONBOARDING_VERBS.test(lower) &&
    !isQuestion &&
    !mentionsWorkflow
  ) {
    return {
      kind: "INTERNAL_NAVIGATION",
      heard,
      actionLabel: "Internal navigation → Onboarding",
      spoken: "Opening onboarding.",
      route: isOrgAdmin(capabilities)
        ? ONBOARDING_ADMIN_ROUTE
        : ONBOARDING_EMPLOYEE_ROUTE,
    };
  }

  // 2.5) Work OS cockpit QUERIES (Phase 1279) — these are first-class
  //      Work OS questions, not chat. They route to the durable Work
  //      Ledger cockpits even WITHOUT a navigation verb ("what am I
  //      missing", "what is blocked", "what is waiting on me").
  const WORK_OS_QUERIES: ReadonlyArray<{ patterns: RegExp; route: string; label: string }> = [
    {
      patterns:
        /\b(my work|what do i owe|what i owe|what(?:'s| is| are)? waiting on me|what do i need to do)\b/,
      route: "/app/my-work",
      label: "My Work",
    },
    {
      patterns:
        /\b(blind spots?|what am i missing|what(?:'s| is) blocked|what(?:'s| is) slipping)\b/,
      route: "/app/blind-spots",
      label: "Blind Spots",
    },
    {
      patterns: /\b(team work|what does my team owe|who is waiting on whom)\b/,
      route: "/app/team-work",
      label: "Team Work",
    },
  ];
  for (const q of WORK_OS_QUERIES) {
    if (q.patterns.test(lower)) {
      return {
        kind: "INTERNAL_NAVIGATION",
        heard,
        actionLabel: `Internal navigation → ${q.label}`,
        spoken: `Opening ${q.label}.`,
        route: q.route,
      };
    }
  }

  // 3) Explicit named destinations (incl. admin/system surfaces).
  //    Requires a navigation verb so ordinary chat ("what about the
  //    system health of the project") never hijacks navigation.
  const hasNavVerb = NAV_VERBS.some((v) => lower.includes(v));
  if (hasNavVerb) {
    let bestDest: { route: string; label: string; admin_only: boolean; len: number } | null =
      null;
    for (const dest of ACTION_DESTINATIONS) {
      for (const kw of dest.keywords) {
        if (lower.includes(kw) && (bestDest === null || kw.length > bestDest.len)) {
          bestDest = { route: dest.route, label: dest.label, admin_only: dest.admin_only, len: kw.length };
        }
      }
    }
    if (bestDest !== null) {
      if (bestDest.admin_only && !isOrgAdmin(capabilities)) {
        return {
          kind: "ADMIN_BLOCKED",
          heard,
          actionLabel: "Admin-only area",
          spoken:
            "That area is for admins. I can show you what you're allowed to manage — try 'my authority'.",
        };
      }
      return {
        kind: "INTERNAL_NAVIGATION",
        heard,
        actionLabel: `Internal navigation → ${bestDest.label}`,
        spoken: `Opening ${bestDest.label}.`,
        route: bestDest.route,
      };
    }
  }

  // 4) WORK OS write/action commands run BEFORE the legacy router so
  //    "schedule a meeting" / "turn this meeting into actions" / "start
  //    the X workflow" are owned by the Work OS runtime, not navigated
  //    by an alias. These are never handed to the Twin to refuse — each
  //    is executed safely, drafted, proposed, routed to approval, or
  //    honestly blocked with the exact missing runtime.

  // 5a) Ask another Twin / agent — never fake the answer.
  if (
    /\bask\b/.test(lower) &&
    /\b(twin|agent|my twin|the ai|engineer|project manager|david|samiksha|vishesh|annie|maria|carlos)\b/.test(
      lower,
    )
  ) {
    const target = extractRecipient(heard);
    return {
      kind: "ASK_TWIN",
      heard,
      actionLabel: target ? `Ask Twin → ${target}` : "Ask a Twin / agent",
      spoken:
        "I'll route this to Collaboration. I won't answer for them myself — and resolving a teammate from voice isn't wired yet, so pick them in Collaboration.",
      route: COLLABORATION_ROUTE,
      ...(target !== undefined ? { targetEntity: target } : {}),
      requiresApproval: false,
      closestRoute: COLLABORATION_ROUTE,
    };
  }

  // 5b) Zoom recordings — Phase 1270: a real read-only runtime now
  //     exists (GET /api/v1/zoom/recordings). The orb fetches the
  //     org's actual cloud recordings; honest empty/error states when
  //     there are none or the connection needs a reconnect.
  if (
    lower.includes("zoom") &&
    /\b(recording|recordings|meeting|latest)\b/.test(lower)
  ) {
    return {
      kind: "ZOOM_RECORDINGS",
      heard,
      actionLabel: "Zoom recordings",
      spoken: "Let me pull your Zoom cloud recordings.",
      route: `${CONNECTOR_RAILS_ROUTE}?focus=zoom`,
      provider: "zoom",
      isReadOnly: true,
    };
  }

  // 5c) Schedule / calendar — draft a proposal; never auto-create.
  if (
    /\b(schedule|find time|find a time|book|check availability|put (?:this|it) on (?:the )?calendar|add (?:a )?(?:follow.?up )?meeting|set up a meeting)\b/.test(
      lower,
    )
  ) {
    const participant = extractRecipient(heard);
    const prereq = heard.match(/\bafter\s+([A-Za-z][a-zA-Z'-]+)\s+confirms?\b/i);
    const prereqNote =
      prereq !== null
        ? ` Prerequisite: requires ${prereq[1]}'s confirmation first.`
        : "";
    return {
      kind: "SCHEDULE_MEETING",
      heard,
      actionLabel: participant
        ? `Draft meeting proposal → ${participant}`
        : "Draft meeting proposal",
      spoken: `I drafted a meeting proposal${participant ? ` with ${participant}` : ""}. Creating the event is gated — it proceeds only after participant resolution, a selected time, any required confirmations, Google event-write scope, and policy/authority gates pass. No event is created and no invite is sent yet.${prereqNote}`,
      ...(participant !== undefined ? { targetEntity: participant } : {}),
      connector: "calendar",
      isExternalWrite: true,
      requiresApproval: true,
      needsConfirmation: true,
      blockedReason: "calendar create runtime not exposed",
    };
  }

  // 5d) Meeting notes → action items — needs a meeting/transcript.
  if (
    /\b(turn (?:this|the) (?:meeting|conversation) into|action items|follow.?ups? (?:from|on|we discussed)|capture the decisions|create (?:tasks|action items) from)\b/.test(
      lower,
    )
  ) {
    return {
      kind: "MEETING_NOTES_TO_ACTIONS",
      heard,
      actionLabel: "Meeting notes → actions",
      spoken:
        "Share the meeting or open a capture and I'll draft the action items — turning the current voice session into a meeting transcript isn't wired yet.",
      route: CONVERSATIONS_ROUTE,
      closestRoute: CONVERSATIONS_ROUTE,
      blockedReason: "no meeting transcript in context",
    };
  }

  // 5e) Workflow start — requires confirmation; runtime not exposed.
  if (/\b(start|run|kick ?off|begin|launch)\b[^?]*\bworkflow\b/.test(lower)) {
    return {
      kind: "WORKFLOW_START",
      heard,
      actionLabel: "Start workflow",
      spoken:
        "Starting a workflow needs your confirmation, and the workflow-start runtime isn't exposed to voice yet. I'll open Workflows.",
      route: WORKFLOWS_ROUTE,
      needsConfirmation: true,
      blockedReason: "workflow start runtime not exposed",
    };
  }

  // 5f) Project work — task create / assign / blockers.
  if (
    /\b(create a task|make a task|assign (?:this|it) to|add (?:this|it) to the project|project blockers?|what'?s blocked|what is blocked|handoff report)\b/.test(
      lower,
    )
  ) {
    const isWrite = /\b(create|make|assign|add)\b/.test(lower);
    return {
      kind: isWrite ? "DRAFT_MESSAGE" : "READ_ONLY_SUMMARY",
      heard,
      actionLabel: isWrite ? "Draft project task" : "Project summary",
      spoken: isWrite
        ? "I'll open Projects. Creating or assigning a task needs approval, and task-write from voice isn't wired yet — draft it on the project surface."
        : "I'll open Projects so you can review blockers — a voice project summary isn't wired yet.",
      route: WORK_PROJECTS_ROUTE,
      ...(isWrite ? { requiresApproval: true } : { isReadOnly: true }),
      blockedReason: "project write runtime not exposed",
    };
  }

  // 5g) Draft a message — draft only; approval + recipient confirmation.
  if (
    /\bdraft\b/.test(lower) ||
    /\b(write|prepare)\s+(?:a |an )?(?:message|email|note|follow.?up|reply)\b/.test(
      lower,
    )
  ) {
    const recipient = extractRecipient(heard);
    const body = extractBody(heard);
    const channel = detectChannel(lower);
    return {
      kind: "DRAFT_MESSAGE",
      heard,
      actionLabel: recipient ? `Draft message → ${recipient}` : "Draft message",
      spoken: `Draft created${recipient ? ` for ${recipient}` : ""}. Approval is required before sending${recipient === undefined ? ", and I'll need you to confirm the recipient" : ""}. Nothing is sent automatically.`,
      route: COMMS_ROUTE,
      connector: channel,
      ...(recipient !== undefined ? { targetEntity: recipient } : {}),
      ...(body !== undefined ? { draftPayload: body } : {}),
      backendActionType: "SEND_INTERNAL_NOTIFICATION",
      requiresApproval: true,
      needsConfirmation: recipient === undefined,
    };
  }

  // 5h) Send / post / email / notify — NEVER auto-send.
  if (
    /\b(send|post|email|notify|dm)\b/.test(lower) &&
    /\bto\b|\bdavid\b|\bsamiksha\b|\bvishesh\b|\bteam\b|\bslack\b|\bemail\b|\beveryone\b|\bhim\b|\bher\b|\bthem\b/.test(
      lower,
    )
  ) {
    const recipient = extractRecipient(heard);
    const channel = detectChannel(lower);
    const external = channel === "slack" || channel === "email";
    return {
      kind: "SEND_REQUIRES_APPROVAL",
      heard,
      actionLabel: recipient
        ? `Send → ${recipient} (approval required)`
        : "Send (approval required)",
      spoken:
        "I won't send that automatically. I can draft it, but sending requires approval — open Work Comms to review and approve. Nothing left the company.",
      route: COMMS_ROUTE,
      connector: channel,
      ...(recipient !== undefined ? { targetEntity: recipient } : {}),
      backendActionType: "SEND_INTERNAL_NOTIFICATION",
      isExternalWrite: external,
      requiresApproval: true,
      needsConfirmation: true,
    };
  }

  // 5i) Read-only summary of a real surface.
  if (
    /\b(summar(?:ise|ize) my (?:work comms|day)|what happened today|what changed in slack|what should i review first)\b/.test(
      lower,
    )
  ) {
    const toComms = lower.includes("comms") || lower.includes("slack");
    return {
      kind: "READ_ONLY_SUMMARY",
      heard,
      actionLabel: "Read-only summary",
      spoken: toComms
        ? "I'll open Work Comms — a spoken summary runtime isn't wired yet."
        : "I'll open My Day — a spoken daily summary runtime isn't wired yet.",
      route: toComms ? COMMS_ROUTE : "/app/my-day",
      isReadOnly: true,
      blockedReason: "voice summary runtime not exposed",
    };
  }

  // 6) Internal navigation via the existing pure router (rich employee
  //    phrases like "what needs my attention"). Runs AFTER the specific
  //    work handlers but BEFORE the hard-verb guardrail so legacy nav
  //    aliases still work for obscure phrases.
  const routed = routeVoiceCommand(heard, capabilities);
  if (routed.kind === "ADMIN_BLOCKED") {
    return {
      kind: "ADMIN_BLOCKED",
      heard,
      actionLabel: "Admin-only area",
      spoken: routed.spoken,
    };
  }
  if (routed.kind === "NAVIGATE") {
    return {
      kind: "INTERNAL_NAVIGATION",
      heard,
      actionLabel: `Internal navigation → ${routed.surface.label}`,
      spoken: routed.spoken,
      route: routed.surface.route,
    };
  }

  // 5j) A HARD work verb with no specific handler → UNSUPPORTED, never
  //     handed to the Twin to refuse (Part G guardrail).
  if (HARD_WORK_VERB.test(lower)) {
    return {
      kind: "UNSUPPORTED",
      heard,
      actionLabel: "Work action not available",
      spoken:
        "I can't perform that work from voice yet. I can draft a message, open approvals, or take you to the related screen — tell me which.",
      blockedReason: "no matching work-os runtime",
    };
  }

  // 5.5) A navigation-SHAPED request to a screen we don't recognize is
  //      handled HERE — never handed to the Twin, which would refuse
  //      like a chatbot ("I can't navigate your UI…"). Only triggers on
  //      an explicit "navigate to a named screen/page" shape, so plain
  //      questions ("what should I do next") still reach governed chat.
  const looksLikeScreenNav =
    /(take me to|go to|navigate to|bring up|pull up|open)\b[^?]*\b(screen|page|tab|view|dashboard|panel|section)\b/.test(
      lower,
    );
  if (looksLikeScreenNav) {
    return {
      kind: "UNSUPPORTED",
      heard,
      actionLabel: "No matching screen",
      spoken:
        "I can't open that screen yet — it isn't one I can navigate to in Otzar. I can take you to your home, connectors, or system health.",
      blockedReason: "no matching internal route",
    };
  }

  // 6) Everything else → the governed chat path (same as typed input).
  return {
    kind: "GOVERNED_CHAT",
    heard,
    actionLabel: "Ask Otzar",
    spoken: "",
    transcript: heard,
  };
}

// WHAT: Open a validated external URL safely across shells.
// INPUT: a URL already validated by classifyUrlCandidate (http/https).
// OUTPUT: "OPENED" when the browser was handed the URL; "NEEDS_LINK"
//         when we couldn't hand it off (caller shows a clickable link).
// WHY: browser shells use window.open; if that's unavailable/blocked we
//      never silently fail and never surface a raw Tauri error — the
//      caller renders the URL as a clickable anchor instead.
export function safeOpenExternalUrl(url: string): "OPENED" | "NEEDS_LINK" {
  // Defense in depth: re-validate the protocol at the open boundary.
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "NEEDS_LINK";
  } catch {
    return "NEEDS_LINK";
  }
  try {
    if (typeof window !== "undefined" && typeof window.open === "function") {
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (win !== null) return "OPENED";
    }
  } catch {
    /* fall through to NEEDS_LINK */
  }
  return "NEEDS_LINK";
}
