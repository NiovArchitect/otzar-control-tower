// FILE: pending-confirm.test.ts
// PURPOSE: Phase 1284 Wave 2 — lock the NL pending-confirm classification:
//          confirmation phrases apply to the active draft; explicit Action
//          Center navigation still navigates; the two never collide.
// CONNECTS TO: src/lib/work-os/pending-confirm.ts

import { describe, expect, it } from "vitest";
import {
  isPendingConfirmPhrase,
  isExplicitActionCenterNav,
} from "@/lib/work-os/pending-confirm";

describe("isPendingConfirmPhrase", () => {
  it("matches the required confirmation phrases", () => {
    for (const p of [
      "I approve",
      "i approve.",
      "yes send it",
      "yes, send it",
      "send it",
      "go ahead",
      "confirm",
      "do it",
    ]) {
      expect(isPendingConfirmPhrase(p)).toBe(true);
    }
  });

  it("does NOT match navigation or unrelated content", () => {
    for (const p of [
      "open action center",
      "show approvals",
      "go to action center",
      "tell david i said good morning",
      "what needs my approval",
      "open my work",
    ]) {
      expect(isPendingConfirmPhrase(p)).toBe(false);
    }
  });
});

describe("isExplicitActionCenterNav", () => {
  it("matches only explicit navigation", () => {
    expect(isExplicitActionCenterNav("open Action Center")).toBe(true);
    expect(isExplicitActionCenterNav("show approvals")).toBe(true);
    expect(isExplicitActionCenterNav("go to action center")).toBe(true);
  });
  it("does not match a bare confirmation", () => {
    expect(isExplicitActionCenterNav("I approve")).toBe(false);
    expect(isExplicitActionCenterNav("send it")).toBe(false);
  });
});
