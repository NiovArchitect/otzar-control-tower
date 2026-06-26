// FILE: tests/unit/person-name.test.ts
// PURPOSE: [OTZAR-LIVE-6] The shared person-name formatter makes people read as
//          people without corrupting emails, ids/UUIDs, or all-caps acronyms,
//          and humanizes an email local-part when only an email exists.
// CONNECTS TO: src/lib/identity/person-name.ts,
//          src/lib/identity/canonical-entity.ts (entityLabel fold-in),
//          src/lib/work-os/pending-clarification.ts (formatRecipientList).

import { describe, it, expect } from "vitest";
import { formatPersonName, nameFromEmail } from "@/lib/identity/person-name";
import { entityLabel, UNRESOLVED_LABEL } from "@/lib/identity/canonical-entity";
import { formatRecipientList } from "@/lib/work-os/pending-clarification";

describe("formatPersonName", () => {
  it("capitalizes a lower-case first name", () => {
    expect(formatPersonName("david")).toBe("David");
  });

  it("title-cases a full lower-case name", () => {
    expect(formatPersonName("david odie")).toBe("David Odie");
    expect(formatPersonName("samiksha sharma")).toBe("Samiksha Sharma");
  });

  it("leaves an already-cased name untouched", () => {
    expect(formatPersonName("David Odie")).toBe("David Odie");
  });

  it("never title-cases an email address", () => {
    expect(formatPersonName("samiksha.sharma@example.com")).toBe(
      "samiksha.sharma@example.com",
    );
  });

  it("does not corrupt all-caps acronyms", () => {
    expect(formatPersonName("NIOV")).toBe("NIOV");
    expect(formatPersonName("HR")).toBe("HR");
  });

  it("does not corrupt a raw id/UUID (leading non-letter)", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(formatPersonName(uuid)).toBe(uuid);
  });

  it("safely ignores empty / blank / nullish names", () => {
    expect(formatPersonName("")).toBe("");
    expect(formatPersonName("   ")).toBe("");
    expect(formatPersonName(null)).toBe("");
    expect(formatPersonName(undefined)).toBe("");
  });
});

describe("nameFromEmail", () => {
  it("humanizes a dotted local-part into a full name", () => {
    expect(nameFromEmail("samiksha.sharma@example.com")).toBe("Samiksha Sharma");
  });

  it("humanizes a single-token local-part", () => {
    expect(nameFromEmail("david@example.com")).toBe("David");
  });

  it("handles underscores and hyphens as separators", () => {
    expect(nameFromEmail("david_odie@x.com")).toBe("David Odie");
    expect(nameFromEmail("jane-roe@x.com")).toBe("Jane Roe");
  });

  it("returns null when there is nothing usable", () => {
    expect(nameFromEmail(null)).toBeNull();
    expect(nameFromEmail("")).toBeNull();
    expect(nameFromEmail("@x.com")).toBeNull();
  });
});

describe("entityLabel folds in the formatter", () => {
  it("humanizes a lower-case display name", () => {
    expect(entityLabel("samiksha sharma")).toBe("Samiksha Sharma");
  });

  it("still returns the canonical label for blank/nullish", () => {
    expect(entityLabel("")).toBe(UNRESOLVED_LABEL);
    expect(entityLabel(null)).toBe(UNRESOLVED_LABEL);
  });

  it("still never corrupts a raw UUID passed as a name", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(entityLabel(uuid)).toBe(uuid);
  });
});

describe("formatRecipientList humanizes each name", () => {
  it("capitalizes names in the joined list", () => {
    expect(formatRecipientList(["david", "samiksha"])).toBe(
      "David and Samiksha",
    );
    expect(formatRecipientList(["david", "samiksha", "william"])).toBe(
      "David, Samiksha, and William",
    );
  });
});
