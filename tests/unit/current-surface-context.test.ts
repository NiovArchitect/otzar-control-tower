// Phase 2.9 — permissioned current-surface context: store + resolver wiring.
// (Live executor integration is covered in ambient-otzar-bar.test.tsx.)
import { describe, it, expect, beforeEach } from "vitest";
import {
  useCurrentSurfaceContextStore,
  getActiveSurfaceContext,
  type CurrentSurfaceContext,
} from "@/lib/stores/current-surface-context";
import { resolveWorkContext, isGenericDeictic } from "@/lib/work-os/work-context";

const sample: CurrentSurfaceContext = {
  id: "ctx-1",
  type: "selected_text",
  text: "Client asked for revised pricing by Friday.",
  capturedAt: "2026-06-23T10:00:00.000Z",
  active: true,
  permission: "explicit_user_provided",
};

describe("current-surface-context store", () => {
  beforeEach(() => useCurrentSurfaceContextStore.getState().clear());

  it("provide sets an active, explicitly-provided context", () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: "Client asked for revised pricing by Friday.",
    });
    const c = getActiveSurfaceContext();
    expect(c).not.toBeNull();
    expect(c!.type).toBe("selected_text");
    expect(c!.active).toBe(true);
    expect(c!.permission).toBe("explicit_user_provided");
  });

  it("rejects empty context (no contextless capture)", () => {
    useCurrentSurfaceContextStore
      .getState()
      .provide({ type: "selected_text", text: "   " });
    expect(getActiveSurfaceContext()).toBeNull();
  });

  it("clear removes context — a stale 'this' must then ask", () => {
    useCurrentSurfaceContextStore
      .getState()
      .provide({ type: "selected_text", text: "x marks it" });
    expect(getActiveSurfaceContext()).not.toBeNull();
    useCurrentSurfaceContextStore.getState().clear();
    expect(getActiveSurfaceContext()).toBeNull();
  });
});

describe("isGenericDeictic", () => {
  it("detects use/review/summarize this/that/it + current-context phrases", () => {
    for (const t of [
      "Ask David to review this.",
      "Summarize this.",
      "Remind me to follow up on this.",
      "use what I'm looking at",
      "use the current context",
      "Hey David, can you review this?",
    ]) {
      expect(isGenericDeictic(t)).toBe(true);
    }
  });
  it("is false for typed / named references and plain text", () => {
    expect(isGenericDeictic("validate what I received")).toBe(false);
    expect(isGenericDeictic("review the budget plan")).toBe(false);
    expect(isGenericDeictic("good morning team")).toBe(false);
  });
});

describe("resolveWorkContext with current-surface context", () => {
  it("resolves a generic 'this' from active current context (wins over inbox)", async () => {
    const r = await resolveWorkContext("Hey David, can you review this?", sample);
    expect(r).not.toBeNull();
    expect(r!.resolved).toBe(true);
    expect(r!.contextId).toBe("ctx-1");
    expect(r!.contextType).toBe("selected_text");
    expect(r!.needsClarification).toBe(false);
  });

  it("asks ONE focused question for 'this' with no active context", async () => {
    const r = await resolveWorkContext("Hey David, can you review this?", null);
    expect(r).not.toBeNull();
    expect(r!.resolved).toBe(false);
    expect(r!.needsClarification).toBe(true);
    expect(r!.clarificationQuestion).toMatch(
      /What should I use as the current context\?/i,
    );
  });

  it("a typed reference whose type matches the provided context uses it", async () => {
    const transcriptCtx: CurrentSurfaceContext = {
      ...sample,
      id: "ctx-t",
      type: "transcript",
      text: "…meeting transcript…",
    };
    const r = await resolveWorkContext("review the transcript", transcriptCtx);
    expect(r!.resolved).toBe(true);
    expect(r!.contextId).toBe("ctx-t");
    expect(r!.contextType).toBe("transcript");
  });

  it("a NAMED object still returns null (proceed normally)", async () => {
    expect(
      await resolveWorkContext("Hey David, can you review the budget plan?", sample),
    ).toBeNull();
  });
});
