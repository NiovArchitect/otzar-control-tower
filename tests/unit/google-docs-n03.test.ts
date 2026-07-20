// FILE: tests/unit/google-docs-n03.test.ts
// PURPOSE: N-03 — non-empty create body, append session, edit detection.

import { describe, expect, it } from "vitest";
import {
  buildCreateBody,
  defaultAppendMaterial,
  defaultWorkingDocBody,
  editDetectionLabel,
  isNonEmptyDocBody,
  MIN_NONEMPTY_BODY_CHARS,
  sessionAfterAppend,
  sessionAfterCreate,
} from "@/lib/connectors/google-docs-n03";

describe("N-03 non-empty create", () => {
  it("rejects empty/tiny bodies", () => {
    expect(isNonEmptyDocBody("")).toBe(false);
    expect(isNonEmptyDocBody("   ")).toBe(false);
    expect(isNonEmptyDocBody("short")).toBe(false);
    expect(isNonEmptyDocBody("x".repeat(MIN_NONEMPTY_BODY_CHARS))).toBe(true);
  });

  it("buildCreateBody always produces non-empty default body", () => {
    const b = buildCreateBody({ title: "Notes", dayIso: "2026-07-20" });
    expect("error" in b).toBe(false);
    if ("error" in b) return;
    expect(b.nonEmpty).toBe(true);
    expect(b.body_text.length).toBeGreaterThanOrEqual(MIN_NONEMPTY_BODY_CHARS);
    expect(b.body_text.toLowerCase()).toMatch(/non-empty|owners|decisions/);
  });

  it("defaultWorkingDocBody is non-empty", () => {
    expect(isNonEmptyDocBody(defaultWorkingDocBody("2026-07-20"))).toBe(true);
  });
});

describe("N-03 append + edit detection session", () => {
  it("create session starts with editDetected false", () => {
    const s = sessionAfterCreate({
      documentId: "doc1",
      title: "Notes",
      webViewLink: "https://docs.google.com/document/d/doc1/edit",
      bodyChars: 80,
    });
    expect(s.editDetected).toBe(false);
    expect(s.createdBodyChars).toBe(80);
    expect(editDetectionLabel(s).toLowerCase()).toMatch(/non-empty|append/);
  });

  it("append flips editDetected and accumulates chars", () => {
    const s0 = sessionAfterCreate({
      documentId: "doc1",
      title: "Notes",
      webViewLink: null,
      bodyChars: 80,
    });
    const s1 = sessionAfterAppend(s0, 42, "2026-07-20T12:00:00Z");
    expect(s1.editDetected).toBe(true);
    expect(s1.appendedChars).toBe(42);
    expect(s1.lastAppendAt).toBe("2026-07-20T12:00:00Z");
    expect(editDetectionLabel(s1).toLowerCase()).toMatch(/edit detected/);
  });

  it("default append material is non-empty", () => {
    expect(isNonEmptyDocBody(defaultAppendMaterial("2026-07-20T12:00:00Z"))).toBe(
      true,
    );
  });
});
