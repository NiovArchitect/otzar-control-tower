// FILE: window-context-session.test.ts
// PURPOSE: D-04 — selected-window share: no covert capture, indicator rules.

import { describe, expect, it } from "vitest";
import {
  WINDOW_CONTEXT_NEVER,
  WINDOW_CONTEXT_PROMISE,
  activateWindowShare,
  canStartWindowShare,
  endWindowShare,
  failWindowShare,
  initialWindowContextSession,
} from "@/lib/observation/window-context-session";

describe("D-04 window-context-session", () => {
  it("unsupported when getDisplayMedia is missing", () => {
    const s = initialWindowContextSession(false);
    expect(s.state).toBe("unsupported");
    expect(s.indicatorVisible).toBe(false);
    expect(canStartWindowShare(s)).toBe(false);
  });

  it("idle with no indicator until user activates", () => {
    const s = initialWindowContextSession(true);
    expect(s.state).toBe("idle");
    expect(s.indicatorVisible).toBe(false);
  });

  it("activate requires prior idle/ended; shows indicator with scope", () => {
    const active = activateWindowShare(initialWindowContextSession(true), {
      scopeLabel: "Selected window",
    });
    expect(active.state).toBe("active");
    expect(active.indicatorVisible).toBe(true);
    expect(active.scopeLabel).toMatch(/window/i);
  });

  it("end clears indicator and discards scope (no silent residual share)", () => {
    const active = activateWindowShare(initialWindowContextSession(true), {
      scopeLabel: "Selected window",
    });
    const ended = endWindowShare(active);
    expect(ended.state).toBe("ended");
    expect(ended.indicatorVisible).toBe(false);
    expect(ended.scopeLabel).toBeNull();
  });

  it("permission failure never leaves indicator on", () => {
    const failed = failWindowShare(
      initialWindowContextSession(true),
      "Permission denied — nothing was shared.",
    );
    expect(failed.indicatorVisible).toBe(false);
    expect(failed.lastError).toMatch(/Permission denied/i);
  });

  it("copy rejects surveillance framing", () => {
    expect(WINDOW_CONTEXT_PROMISE).toMatch(/choose|permission|indicator/i);
    expect(WINDOW_CONTEXT_PROMISE).not.toMatch(/track you|monitor you|spy/i);
    expect(WINDOW_CONTEXT_NEVER.join(" ")).toMatch(/Background|surveillance/i);
  });
});
