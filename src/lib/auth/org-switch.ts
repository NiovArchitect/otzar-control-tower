// FILE: org-switch.ts
// PURPOSE: A-06 — Org switching resets to new org Home without blending
//          client state (chat, continuity, surface context, prior routes).
//          Pure contract + imperative clear/rebind for shell bootstrap.
// CONNECTS TO: auth store, conversation-store, continuity, surface context,
//          EmployeeLayout, FOUNDER A-06 / Q-02 / I-02.

import type { AuthCapabilities } from "@/lib/stores/auth";
import { landingPathFor } from "@/lib/auth/capabilities";
import {
  bindConversationScope,
  clearConversationScope,
} from "@/lib/work-os/conversation-store";
import { useContinuityStore } from "@/lib/stores/continuity";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";

/** Always land role Home after an org switch — never prior-org deep links. */
export const ORG_SWITCH_HOME = "/app";

/** sessionStorage key for last bound org (detect mid-session / restore change). */
export const ACTIVE_ORG_STORAGE_KEY = "otzar.active_org_entity_id";

/** Client buckets that must not bleed across orgs. */
export const ORG_SWITCH_CLEAR_BUCKETS = [
  "conversation_scope",
  "continuity",
  "surface_context",
  "prior_route",
] as const;

export type OrgSwitchClearBucket = (typeof ORG_SWITCH_CLEAR_BUCKETS)[number];

export interface OrgMembershipOption {
  org_entity_id: string;
  name: string;
  /** True when this is the session's active org. */
  active?: boolean;
}

export interface OrgSwitchPlan {
  isNoop: boolean;
  /** True only when switching between two known orgs — force Home. */
  mustNavigateHome: boolean;
  fromOrgId: string | null;
  toOrgId: string;
  destination: string;
  mustClear: ReadonlyArray<OrgSwitchClearBucket>;
  conversationScopeId: string;
  reason: string;
}

/** Build user+org conversation scope so transcripts never blend across orgs. */
export function conversationScopeId(
  userKey: string,
  orgEntityId: string | null | undefined,
): string {
  const user = (userKey ?? "").trim();
  const org = (orgEntityId ?? "").trim();
  if (user.length === 0) return org.length > 0 ? `org:${org}` : "";
  if (org.length === 0) return user;
  return `${user}::org:${org}`;
}

export function isSameOrg(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const aa = (a ?? "").trim();
  const bb = (b ?? "").trim();
  if (aa.length === 0 || bb.length === 0) return aa === bb;
  return aa === bb;
}

/** True when bound org changed and blendable client state must reset. */
export function shouldResetOnOrgChange(
  previousOrgId: string | null | undefined,
  nextOrgId: string | null | undefined,
): boolean {
  const next = (nextOrgId ?? "").trim();
  if (next.length === 0) return false;
  const prev = (previousOrgId ?? "").trim();
  if (prev.length === 0) return true; // first bind — drop any orphan global state
  return prev !== next;
}

/**
 * Plan an org switch. Destination is always role Home (never prior-org route).
 * Same-org is a no-op.
 */
export function planOrgSwitch(input: {
  fromOrgId: string | null | undefined;
  toOrgId: string;
  userKey: string;
  capabilities?: AuthCapabilities | null;
  /** Ignored on switch — prior routes must not restore across orgs. */
  priorPath?: string | null;
}): OrgSwitchPlan {
  const toOrgId = input.toOrgId.trim();
  const from =
    input.fromOrgId === undefined || input.fromOrgId === null
      ? null
      : input.fromOrgId.trim() || null;
  const home = landingPathFor(input.capabilities ?? null) || ORG_SWITCH_HOME;

  if (toOrgId.length === 0) {
    return {
      isNoop: true,
      mustNavigateHome: false,
      fromOrgId: from,
      toOrgId: "",
      destination: home,
      mustClear: [],
      conversationScopeId: conversationScopeId(input.userKey, from),
      reason: "empty_target",
    };
  }

  if (isSameOrg(from, toOrgId)) {
    return {
      isNoop: true,
      mustNavigateHome: false,
      fromOrgId: from,
      toOrgId,
      destination: home,
      mustClear: [],
      conversationScopeId: conversationScopeId(input.userKey, toOrgId),
      reason: "same_org",
    };
  }

  // First bind (no prior org): scope + light clear, do not yank deep links.
  if (from === null || from.length === 0) {
    return {
      isNoop: false,
      mustNavigateHome: false,
      fromOrgId: from,
      toOrgId,
      destination: home,
      mustClear: ["conversation_scope", "continuity", "surface_context"],
      conversationScopeId: conversationScopeId(input.userKey, toOrgId),
      reason: "first_bind",
    };
  }

  return {
    isNoop: false,
    mustNavigateHome: true,
    fromOrgId: from,
    toOrgId,
    destination: home,
    mustClear: [...ORG_SWITCH_CLEAR_BUCKETS],
    conversationScopeId: conversationScopeId(input.userKey, toOrgId),
    reason: "org_changed",
  };
}

/** Read last active org from sessionStorage (best-effort). */
export function readStoredActiveOrg(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
    return v && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

export function writeStoredActiveOrg(orgEntityId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (orgEntityId === null || orgEntityId.trim().length === 0) {
      window.sessionStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgEntityId.trim());
    }
  } catch {
    /* private mode */
  }
}

/**
 * Imperative clear + rebind for a planned org switch.
 * Does not navigate — caller navigates to plan.destination.
 */
export function applyOrgSwitchClientState(plan: OrgSwitchPlan): void {
  if (plan.isNoop) {
    // Still rebind scope so same-org reloads stay org-scoped.
    if (plan.conversationScopeId.length > 0) {
      bindConversationScope(plan.conversationScopeId);
    }
    if (plan.toOrgId.length > 0) writeStoredActiveOrg(plan.toOrgId);
    return;
  }

  if (plan.mustClear.includes("conversation_scope")) {
    clearConversationScope();
  }
  if (plan.mustClear.includes("continuity")) {
    useContinuityStore.getState().reset();
  }
  if (plan.mustClear.includes("surface_context")) {
    useCurrentSurfaceContextStore.getState().clear();
  }

  if (plan.conversationScopeId.length > 0) {
    bindConversationScope(plan.conversationScopeId);
  }
  writeStoredActiveOrg(plan.toOrgId);
}

/**
 * Full client-side org switch: plan + clear + rebind.
 * Returns plan so shell can navigate to Home.
 */
export function executeOrgSwitch(input: {
  fromOrgId: string | null | undefined;
  toOrgId: string;
  userKey: string;
  capabilities?: AuthCapabilities | null;
  priorPath?: string | null;
}): OrgSwitchPlan {
  const plan = planOrgSwitch(input);
  applyOrgSwitchClientState(plan);
  return plan;
}

/** Detect blend risk: prior path from another org context must not stick. */
export function forbidsPriorRouteOnSwitch(priorPath: string | null | undefined): boolean {
  if (priorPath === null || priorPath === undefined || priorPath === "") return true;
  // Any non-home path is refused as restore target after switch
  const p = priorPath.split("?")[0] ?? priorPath;
  return p !== ORG_SWITCH_HOME && p !== "/app" && p !== "/";
}
