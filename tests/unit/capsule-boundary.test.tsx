// FILE: tests/unit/capsule-boundary.test.tsx
// PURPOSE: [GAP-S S-1] lock the ownership-boundary rendering: the capsule
//          boundary map matches the FND write-time wallet routing truth
//          (DECISION → org wallet; WORK_PATTERN/CORRECTION → employee
//          wallet; COMMITMENT/CONVERSATION_LEARNING → employee wallet but
//          company-referencing → mixed), no company/source data is ever
//          marked personal, no copy claims a shipped portability feature,
//          and the WalletProvenanceBadge renders the owner honestly with
//          future language explicitly marked "not yet available".
// CONNECTS TO: src/lib/labels/capsule-types.ts,
//              src/components/sovereignty/WalletProvenanceBadge.tsx,
//              docs/otzar/OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  CAPSULE_TYPE_BOUNDARY,
  CAPSULE_TYPE_LABELS,
  getCapsuleBoundary,
  getCapsuleBoundaryLabel,
  getCapsuleBoundaryShortLabel,
} from "@/lib/labels/capsule-types";
import { WalletProvenanceBadge } from "@/components/sovereignty/WalletProvenanceBadge";
import type { CapsuleType } from "@/lib/types/foundation";

const ALL_TYPES = Object.keys(CAPSULE_TYPE_LABELS) as CapsuleType[];

describe("[GAP-S S-1] capsule boundary map — matches write-time routing truth", () => {
  it("covers every capsule type (exhaustive with the label map)", () => {
    for (const t of ALL_TYPES) {
      expect(CAPSULE_TYPE_BOUNDARY[t], `boundary for ${t}`).toBeDefined();
    }
  });

  it("org-wallet-routed and company-record types are company-owned", () => {
    // DECISION routes to the ORG wallet (observation.service.ts) — company.
    expect(getCapsuleBoundary("DECISION")).toBe("company");
    for (const t of ["COMPLIANCE_RECORD", "RELATIONSHIP", "BLOCKER", "RISK", "HANDOFF"] as const) {
      expect(getCapsuleBoundary(t), t).toBe("company");
    }
  });

  it("employee-wallet-routed style/learning types are personal", () => {
    for (const t of [
      "PREFERENCE", "COMMUNICATION_PREF", "DECISION_STYLE", "WORK_PATTERN",
      "BEHAVIORAL_PATTERN", "IDENTITY", "SESSION_LEARNING", "TASK_LEARNING",
      "CORRECTION", "FOUNDATIONAL", "DOMAIN_KNOWLEDGE",
    ] as const) {
      expect(getCapsuleBoundary(t), t).toBe("personal");
    }
  });

  it("employee-wallet-routed but company-referencing types are MIXED — never plainly personal", () => {
    expect(getCapsuleBoundary("COMMITMENT")).toBe("mixed");
    expect(getCapsuleBoundary("CONVERSATION_LEARNING")).toBe("mixed");
    expect(getCapsuleBoundaryLabel("COMMITMENT")).toBe(
      "Personal only after company details are stripped",
    );
  });

  it("device data is device-bound", () => {
    expect(getCapsuleBoundary("DEVICE_DATA")).toBe("device");
    expect(getCapsuleBoundaryShortLabel("DEVICE_DATA")).toBe("Device-bound");
  });

  it("no boundary copy claims shipped portability or leaks backend enums", () => {
    for (const t of ALL_TYPES) {
      const copy = `${getCapsuleBoundaryLabel(t)} ${getCapsuleBoundaryShortLabel(t)}`;
      expect(copy).not.toMatch(/export|take this with you|portable today/i);
      expect(copy).not.toMatch(/CAPSULE|_/); // no SCREAMING_SNAKE leakage
    }
  });
});

describe("[GAP-S S-1] WalletProvenanceBadge — honest owner, future marked as future", () => {
  it("enterprise wallet states company ownership", () => {
    render(<WalletProvenanceBadge walletType="ENTERPRISE" entityType="COMPANY" />);
    expect(screen.getByText(/Enterprise wallet — stays with company/)).toBeInTheDocument();
  });

  it("personal wallet states employee ownership WITHOUT claiming shipped portability", () => {
    render(<WalletProvenanceBadge walletType="PERSONAL" entityType="PERSON" />);
    expect(
      screen.getByText(/Personal wallet. Yours, not the company's/),
    ).toBeInTheDocument();
    // The old label claimed present-tense travel; that claim must be gone.
    expect(screen.queryByText(/travels with employee/)).toBeNull();
  });

  it("AI teammate wallet ties to the person, not the company", () => {
    render(<WalletProvenanceBadge walletType="PERSONAL" entityType="AI_AGENT" />);
    expect(
      screen.getByText(/AI Teammate wallet — the employee's, not the company's/),
    ).toBeInTheDocument();
  });
});
