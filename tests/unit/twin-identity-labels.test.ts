// FILE: twin-identity-labels.test.ts
// PURPOSE: [GAP-H] AI Teammates identity truth: the twin name comes from the
//          AUTHORITATIVE backend-projected owner ("<Owner>'s AI Twin"),
//          never the raw stored "Twin of <uuid>" string; the Owner cell says
//          "No owner assigned yet" ONLY when the owner is truly missing.
// CONNECTS TO: src/lib/labels/twin-identity.ts, src/pages/AITeammates.tsx.

import { describe, expect, it } from "vitest";
import { twinDisplayLabel, twinOwnerLabel } from "@/lib/labels/twin-identity";

const RAW = "Twin of 10daf8a2-a1bc-4d1c-9a52-b0ac3e4cf776 (Digital Twin)";

describe("[GAP-H] twinDisplayLabel", () => {
  it("renders the owner-based human name when the owner exists", () => {
    expect(
      twinDisplayLabel({ display_name: RAW, owner_display_name: "Sadeil Lewis" }),
    ).toBe("Sadeil Lewis's AI Twin");
  });
  it("NEVER surfaces the raw 'Twin of <uuid>' string — honest generic when ownerless", () => {
    for (const missing of [null, undefined, "", "   "]) {
      const label = twinDisplayLabel({ display_name: RAW, owner_display_name: missing });
      expect(label).toBe("AI Twin");
      expect(label).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
    }
  });
});

describe("[GAP-H] twinOwnerLabel", () => {
  it("renders the authoritative owner name", () => {
    expect(twinOwnerLabel({ owner_display_name: "Samiksha Sharma" })).toBe("Samiksha Sharma");
  });
  it("'No owner assigned yet' only when truly missing — never 'Unassigned'", () => {
    for (const missing of [null, undefined, ""]) {
      const label = twinOwnerLabel({ owner_display_name: missing });
      expect(label).toBe("No owner assigned yet");
      expect(label).not.toBe("Unassigned");
    }
  });
});
