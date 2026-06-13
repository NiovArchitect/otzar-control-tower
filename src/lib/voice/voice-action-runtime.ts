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
  | "INTERNAL_NAVIGATION"
  | "CONNECTOR_STATUS_NAVIGATION"
  | "EXTERNAL_URL_OPEN"
  | "BLOCKED_URL"
  | "ADMIN_BLOCKED"
  | "DRAFT_ONLY"
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
  { keywords: ["workspace connections", "connector rails", "connector + mcp", "mcp rails", "connectors", "mcp"], route: CONNECTOR_RAILS_ROUTE, label: "Workspace connections", admin_only: true },
  { keywords: ["voice providers"], route: "/voice-providers", label: "Voice Providers", admin_only: true },
  { keywords: ["system health"], route: "/system-health", label: "System Health", admin_only: true },
  { keywords: ["admin command center", "command center", "admin home", "admin dashboard", "admin"], route: "/", label: "Admin command center", admin_only: true },
  { keywords: ["security audit", "audit log", "audit trail", "security"], route: "/security-audit", label: "Security & Audit", admin_only: true },
  { keywords: ["reports"], route: "/reports", label: "Reports", admin_only: true },
  { keywords: ["employee chat", "chat"], route: "/app/chat", label: "Employee Chat", admin_only: false },
  { keywords: ["employee page", "employee home", "employee"], route: "/app", label: "Employee home", admin_only: false },
  { keywords: ["my twin"], route: "/app/my-twin", label: "My Twin", admin_only: false },
  { keywords: ["authority"], route: "/app/authority-grants", label: "Authority", admin_only: false },
  { keywords: ["projects"], route: "/app/work-projects", label: "Projects", admin_only: false },
  { keywords: ["work comms"], route: COMMS_ROUTE, label: "Work Comms", admin_only: false },
  { keywords: ["action center", "approvals"], route: "/app/action-center", label: "Action Center", admin_only: false },
];

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

  // 2) Connector-status navigation (provider + status/verification/
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
      route: `${CONNECTOR_RAILS_ROUTE}?provider=${provider.slug}`,
      provider: provider.slug,
    };
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

  // 4) Internal navigation via the existing pure router (rich employee
  //    phrases like "what needs my attention").
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

  // 5) Draft-only / send-gated comms. Drafting is allowed; sending is
  //    approval-gated — nothing leaves automatically this phase.
  const mentionsSend =
    /\b(send|email|post|dm|message)\b/.test(lower) &&
    /\bto\b|\bdavid\b|\bteam\b|\bslack\b|\bemail\b/.test(lower);
  const mentionsDraft = /\bdraft\b/.test(lower);
  if (mentionsDraft || mentionsSend) {
    const needsConfirmation = mentionsSend && !mentionsDraft;
    return {
      kind: "DRAFT_ONLY",
      heard,
      actionLabel: needsConfirmation
        ? "Draft only — sending needs your approval"
        : "Draft only",
      spoken: needsConfirmation
        ? "I can draft that, but sending anything externally needs your explicit approval. I'll open comms so you can review and approve."
        : "I'll open comms so you can draft that. Nothing is sent without your approval.",
      route: COMMS_ROUTE,
      needsConfirmation,
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
