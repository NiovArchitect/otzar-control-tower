// FILE: command-router.ts
// PURPOSE: Phase 1253 — voice as the REMOTE CONTROL for Otzar. A
//          central, pure router that maps natural-language commands
//          (spoken OR typed — the text fallback rides the same
//          router) onto a registry of voice-addressable surfaces.
//          The user never needs to know where a button lives:
//          "what needs my approval" routes to the approvals surface,
//          "open provider settings" routes admins to Integrations.
//
//          GOVERNANCE: the router NEVER mutates data and NEVER
//          executes external actions. It classifies, role-gates, and
//          routes. Every write/action it leads to still happens on
//          the destination surface through identity → DMW → COSMP →
//          policy → approval → governed Action → audit. Memory
//          saves, sends, approvals, and transactions are previews/
//          confirmations on their governed surfaces — voice cannot
//          bypass any of it. Unmatched utterances fall through to
//          the governed voice-intent API (conversational path).
// CONNECTS TO: AmbientOtzarBar (speak/type entry), capabilities.ts
//          (role gating), tests/unit/voice-command-router.test.ts,
//          docs/product/otzar-ambient-work-os-design-law.md §Voice.

import type { AuthCapabilities } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";

export interface VoiceSurface {
  surface_id: string;
  label: string;
  route: string;
  /** Lowercase phrases/keywords that address this surface. */
  aliases: string[];
  admin_only: boolean;
  /** What the router may do here without confirmation: navigation
   *  and read-summaries only. Writes happen ON the surface through
   *  governed flows. */
  kind: "READ" | "GOVERNED_WRITE_SURFACE";
  /** Calm spoken/printed acknowledgement when routed. */
  ack: string;
}

export const VOICE_SURFACES: readonly VoiceSurface[] = [
  {
    surface_id: "my_day",
    label: "My Day",
    route: "/app/my-day",
    aliases: ["what matters today", "my day", "what needs my attention", "what am i late on", "what can wait", "what is blocking me", "priorities"],
    admin_only: false,
    kind: "READ",
    ack: "Here's what matters today.",
  },
  {
    surface_id: "notifications",
    label: "Notes & replies",
    route: "/app/comms",
    aliases: ["notifications", "read my notifications", "my notes", "new notes", "messages for me", "reply to"],
    admin_only: false,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "Here are your notes.",
  },
  {
    surface_id: "approvals",
    label: "Action Center",
    route: "/app/action-center",
    aliases: ["approvals", "action center", "what needs my approval", "needs approval", "approve", "deny", "things i need to approve", "pending decisions", "audit trail"],
    admin_only: false,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "Here's what's waiting on your decision. Approving or denying happens right here, with the full why.",
  },
  {
    surface_id: "comms",
    label: "Comms",
    route: "/app/comms",
    aliases: ["work messages", "work comms", "open comms", "call", "summarize that call", "summarize the call", "what did david commit to", "draft the follow-up", "follow up"],
    admin_only: false,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "Opening your work comms. Anything that leaves the company still needs your approval.",
  },
  {
    surface_id: "meeting_capture",
    label: "Meeting captures",
    route: "/app/meeting-captures",
    aliases: ["meeting", "start capture", "summarize the meeting", "meeting summary", "what decisions were made", "who consented", "send reminders"],
    admin_only: false,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "Here are your meeting captures — decisions, commitments, and consent in one place.",
  },
  {
    surface_id: "observe",
    label: "Observe",
    route: "/app/observe",
    aliases: ["read this screen", "what am i looking at", "read this", "help me with this form", "summarize this document", "extract the action items", "observe"],
    admin_only: false,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "Share what you're looking at and I'll read it — nothing happens without your approval.",
  },
  {
    surface_id: "workspaces",
    label: "Workspaces",
    route: "/app/collaboration-workspaces",
    aliases: ["workspace", "launch workspace", "show me the commitments", "who is waiting on us", "what do we owe", "what do they owe us", "add this note to the workspace", "attach this to the workspace"],
    admin_only: false,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "Here's the workspace — people, decisions, and who owes what.",
  },
  {
    surface_id: "people",
    label: "People & Collaboration",
    route: "/app/collaboration",
    aliases: ["who is", "people", "collaboration", "who should we onboard next", "who is overloaded", "who is disconnected", "who should collaborate", "org growth", "onboard next"],
    admin_only: false,
    kind: "READ",
    ack: "Here's your team and how the organization is growing.",
  },
  {
    surface_id: "memory",
    label: "My Twin & memory",
    route: "/app/my-twin",
    aliases: ["save this to memory", "what do you remember", "forget this", "do not remember that", "my twin", "show me what memory you used", "why are you using that memory"],
    admin_only: false,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "Memory is yours to control — saves and forgets are approved here, never silent.",
  },
  {
    surface_id: "authority",
    label: "Authority",
    route: "/app/authority-grants",
    aliases: ["can i approve this", "who has authority", "why am i blocked", "request permission", "who needs to approve", "my authority", "digital work wallet"],
    admin_only: false,
    kind: "READ",
    ack: "Here's your authority — what you can do, and who to ask when you can't.",
  },
  {
    surface_id: "voice_settings",
    label: "Talk to Otzar",
    route: "/app/voice",
    aliases: ["voice settings", "check voice providers", "voice setup", "pronunciation test", "say my name"],
    admin_only: false,
    kind: "READ",
    ack: "Here's the voice surface.",
  },
  // ── Admin-only surfaces (role-gated; employees get a warm no) ──
  {
    surface_id: "provider_settings",
    label: "Integrations & MCP",
    route: "/connector-rails",
    aliases: ["provider settings", "open provider settings", "what key is missing", "why is the ai brain not connected", "api keys", "mcp", "integrations", "credentials"],
    admin_only: true,
    kind: "GOVERNED_WRITE_SURFACE",
    ack: "I opened Integrations — provider status and what's missing, with no secrets shown.",
  },
  {
    surface_id: "connector_health",
    label: "Connector Health",
    route: "/app/connector-health",
    aliases: ["connector health", "check google calendar", "connectors", "which connectors are missing"],
    admin_only: true,
    kind: "READ",
    ack: "Here's connector health.",
  },
  {
    surface_id: "production_readiness",
    label: "Production readiness",
    route: "/onboarding",
    aliases: ["what is blocking production", "production blockers", "production readiness", "what can i demo today", "transaction readiness", "make a transaction", "regulator package status", "risky ai permissions"],
    admin_only: true,
    kind: "READ",
    ack: "Here's the truth: what's live, what's blocked, and exactly why. Transactions stay mock-only until credentials and explicit authorization exist.",
  },
] as const;

export type VoiceRouteResult =
  | { kind: "NAVIGATE"; surface: VoiceSurface; spoken: string }
  | { kind: "ADMIN_BLOCKED"; surface: VoiceSurface; spoken: string }
  | { kind: "NO_MATCH" };

// WHAT: Route one utterance (spoken or typed) to a surface.
// INPUT: utterance + caller capabilities.
// OUTPUT: NAVIGATE (with calm ack), ADMIN_BLOCKED (warm refusal),
//         or NO_MATCH (falls through to the conversational AI path).
// WHY: Voice should click without clicking — but only ever into
//      governed surfaces, and only within the caller's role.
export function routeVoiceCommand(
  utterance: string,
  capabilities: AuthCapabilities | null,
): VoiceRouteResult {
  const text = utterance.trim().toLowerCase();
  if (text.length < 3) return { kind: "NO_MATCH" };
  let best: { surface: VoiceSurface; aliasLength: number } | null = null;
  for (const surface of VOICE_SURFACES) {
    for (const alias of surface.aliases) {
      if (text.includes(alias)) {
        if (best === null || alias.length > best.aliasLength) {
          best = { surface, aliasLength: alias.length };
        }
      }
    }
  }
  if (best === null) return { kind: "NO_MATCH" };
  const { surface } = best;
  if (surface.admin_only && !isOrgAdmin(capabilities)) {
    return {
      kind: "ADMIN_BLOCKED",
      surface,
      spoken:
        "That area is for admins. I can show you what you're allowed to manage — try 'my authority'.",
    };
  }
  return { kind: "NAVIGATE", surface, spoken: surface.ack };
}
