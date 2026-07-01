// FILE: tests/unit/workos-smoke-contract.test.ts (unit)
// PURPOSE: Deterministic, offline guard for the deep Work OS live smoke suite —
//          live smokes are NOT a replacement for unit coverage. This asserts the
//          suite's own contract is self-consistent (fixtures carry the expected
//          people + noisy tail; invariant matchers behave; markers are unique;
//          IDs are masked) so the smokes can't silently rot even when creds are
//          absent and the live suite skips.
// CONNECTS TO: tests/e2e/workos-fixtures.ts, tests/e2e/workos-helpers.ts.

import { describe, expect, it } from "vitest";
import {
  primaryTranscript,
  followUpTranscript,
  privateTranscript,
  OWNER_DAVID,
  NOISY_TOKENS,
  GITHUB_CONNECTOR,
  SEED_TOOL_ACCESS,
} from "../e2e/workos-fixtures";
import { mask, runMarker } from "../e2e/workos-helpers";

describe("Work OS smoke contract — fixtures", () => {
  const m = "test-marker";
  it("primary transcript carries the named owners + a noisy tail to quarantine", () => {
    const t = primaryTranscript(m);
    expect(t).toMatch(/David/);
    expect(t).toMatch(/Pratham/);
    expect(t).toMatch(/Shiney/);
    expect(t).toMatch(/repo access|github/i);
    // Noisy tail lines that MUST NOT become work.
    expect(t).toMatch(/you you you/);
    expect(t).toContain(m);
  });

  it("follow-up transcript reuses the same people (memory compounding)", () => {
    const t = followUpTranscript(m);
    expect(t).toMatch(/David/);
    expect(t).toMatch(/Pratham/);
    expect(t).toContain(m);
  });

  it("private transcript embeds a unique caller-owned marker", () => {
    const marker = "PRIV-XYZ";
    expect(privateTranscript(marker)).toContain(marker);
    expect(privateTranscript(marker)).toMatch(/privately|my own/i);
  });
});

describe("Work OS smoke contract — invariant matchers", () => {
  it("OWNER_DAVID matches an owner name, not unrelated names", () => {
    expect(OWNER_DAVID.test("David Odie")).toBe(true);
    expect(OWNER_DAVID.test("Pratham")).toBe(false);
  });

  it("NOISY_TOKENS flags gibberish tails, not real work titles", () => {
    expect(NOISY_TOKENS.test("you you you you")).toBe(true);
    expect(NOISY_TOKENS.test("......")).toBe(true);
    expect(NOISY_TOKENS.test("ok ok ok")).toBe(true);
    expect(NOISY_TOKENS.test("Grant Pratham write access to the repo")).toBe(false);
  });

  it("SEED_TOOL_ACCESS matches a tool-access/connector seed", () => {
    expect(SEED_TOOL_ACCESS.test("grant_tool_access GitHub is needed")).toBe(true);
    expect(SEED_TOOL_ACCESS.test("confirm_or_activate_person")).toBe(false);
  });

  it("the GitHub connector constant is the canonical id", () => {
    expect(GITHUB_CONNECTOR).toBe("GITHUB");
  });
});

describe("Work OS smoke contract — safety helpers", () => {
  it("mask never leaks a full identifier", () => {
    const id = "ae2c4bd3-e531-42fa-a3d8-50fe19005792";
    const masked = mask(id);
    expect(masked).not.toBe(id);
    expect(masked).toContain("…");
    expect(mask(null)).toBe("—");
  });

  it("run markers are unique per call", () => {
    const a = runMarker();
    const b = runMarker();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^wos-/);
  });
});
