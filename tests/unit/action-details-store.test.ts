// FILE: tests/unit/action-details-store.test.ts
// PURPOSE: Phase 1269 — locks the action-details store that lets the
//          Action Center show the real recipient/channel/body the user
//          authored (instead of a generic "internal note").

import { describe, expect, it, beforeEach } from "vitest";
import {
  setActionDetails,
  getActionDetails,
} from "../../src/lib/work-os/action-details-store";

beforeEach(() => {
  if (typeof window !== "undefined") window.localStorage.clear();
});

describe("action-details-store", () => {
  it("stores and reads back the human-readable detail by action id", () => {
    setActionDetails("act-1", {
      title: "Draft message → David",
      recipientLabel: "David",
      channel: "internal",
      body: "We need to review this.",
      sourceCommand: "Draft a message to David saying we need to review this.",
    });
    const d = getActionDetails("act-1");
    expect(d).not.toBeNull();
    expect(d?.recipientLabel).toBe("David");
    expect(d?.body).toBe("We need to review this.");
    expect(d?.channel).toBe("internal");
  });

  it("returns null for an unknown action id", () => {
    expect(getActionDetails("nope")).toBeNull();
    expect(getActionDetails("")).toBeNull();
  });
});
