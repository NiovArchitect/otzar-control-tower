// FILE: tests/unit/org-switch.test.ts
// PURPOSE: A-06 — org switch Home reset + no blend contract.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  ACTIVE_ORG_STORAGE_KEY,
  applyOrgSwitchClientState,
  conversationScopeId,
  executeOrgSwitch,
  forbidsPriorRouteOnSwitch,
  isSameOrg,
  planOrgSwitch,
  readStoredActiveOrg,
  shouldResetOnOrgChange,
  writeStoredActiveOrg,
} from "@/lib/auth/org-switch";
import {
  bindConversationScope,
  clearConversationScope,
  useConversationStore,
} from "@/lib/work-os/conversation-store";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";
import { useContinuityStore } from "@/lib/stores/continuity";

describe("A-06 org switch contract", () => {
  beforeEach(() => {
    clearConversationScope();
    useContinuityStore.getState().reset();
    useCurrentSurfaceContextStore.getState().clear();
    writeStoredActiveOrg(null);
  });
  afterEach(() => {
    clearConversationScope();
    writeStoredActiveOrg(null);
  });

  it("scopes conversation keys by user+org", () => {
    expect(conversationScopeId("user@x.com", null)).toBe("user@x.com");
    expect(conversationScopeId("user@x.com", "org-a")).toBe(
      "user@x.com::org:org-a",
    );
    expect(conversationScopeId("user@x.com", "org-a")).not.toBe(
      conversationScopeId("user@x.com", "org-b"),
    );
  });

  it("same org is noop; change forces Home", () => {
    const same = planOrgSwitch({
      fromOrgId: "org-a",
      toOrgId: "org-a",
      userKey: "u@x.com",
      priorPath: "/app/action-center",
    });
    expect(same.isNoop).toBe(true);
    expect(same.mustNavigateHome).toBe(false);

    const change = planOrgSwitch({
      fromOrgId: "org-a",
      toOrgId: "org-b",
      userKey: "u@x.com",
      priorPath: "/app/action-center",
    });
    expect(change.isNoop).toBe(false);
    expect(change.mustNavigateHome).toBe(true);
    expect(change.destination).toBe("/app");
    expect(change.mustClear).toContain("conversation_scope");
    expect(change.mustClear).toContain("continuity");
    expect(change.mustClear).toContain("surface_context");
    expect(change.mustClear).toContain("prior_route");
  });

  it("first bind does not force Home (preserves deep links)", () => {
    const first = planOrgSwitch({
      fromOrgId: null,
      toOrgId: "org-a",
      userKey: "u@x.com",
      priorPath: "/app/action-center",
    });
    expect(first.mustNavigateHome).toBe(false);
    expect(first.reason).toBe("first_bind");
    expect(first.conversationScopeId).toContain("org-a");
  });

  it("shouldResetOnOrgChange and isSameOrg", () => {
    expect(shouldResetOnOrgChange(null, "org-a")).toBe(true);
    expect(shouldResetOnOrgChange("org-a", "org-a")).toBe(false);
    expect(shouldResetOnOrgChange("org-a", "org-b")).toBe(true);
    expect(isSameOrg("org-a", "org-a")).toBe(true);
    expect(isSameOrg("org-a", "org-b")).toBe(false);
  });

  it("forbids restoring prior-org routes after switch", () => {
    expect(forbidsPriorRouteOnSwitch("/app/action-center")).toBe(true);
    expect(forbidsPriorRouteOnSwitch("/app")).toBe(false);
    expect(forbidsPriorRouteOnSwitch(null)).toBe(true);
  });

  it("org change clears surface context and continuity; rebinds org scope", () => {
    bindConversationScope(conversationScopeId("u@x.com", "org-a"));
    useConversationStore.getState().append({
      role: "user",
      text: "secret from org A",
      at: new Date().toISOString(),
    });
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: "org-a selection",
    });
    expect(useConversationStore.getState().entries.length).toBe(1);
    expect(useCurrentSurfaceContextStore.getState().context).not.toBeNull();

    const plan = executeOrgSwitch({
      fromOrgId: "org-a",
      toOrgId: "org-b",
      userKey: "u@x.com",
    });
    expect(plan.mustNavigateHome).toBe(true);
    expect(useCurrentSurfaceContextStore.getState().context).toBeNull();
    // org-b scope starts empty — no blend of org-a transcript
    expect(useConversationStore.getState().entries).toEqual([]);
    expect(readStoredActiveOrg()).toBe("org-b");

    // Re-bind org-a recovers prior transcript (scoped storage, not blend)
    applyOrgSwitchClientState(
      planOrgSwitch({
        fromOrgId: "org-b",
        toOrgId: "org-a",
        userKey: "u@x.com",
      }),
    );
    expect(
      useConversationStore.getState().entries.some((e) =>
        e.text.includes("secret from org A"),
      ),
    ).toBe(true);
  });

  it("persists active org key", () => {
    writeStoredActiveOrg("org-z");
    expect(readStoredActiveOrg()).toBe("org-z");
    expect(sessionStorage.getItem(ACTIVE_ORG_STORAGE_KEY)).toBe("org-z");
    writeStoredActiveOrg(null);
    expect(readStoredActiveOrg()).toBeNull();
  });
});
