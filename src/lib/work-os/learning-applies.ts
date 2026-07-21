// FILE: learning-applies.ts
// PURPOSE: H-03 — Approved work-style learning changes later work;
//          rejected candidates never apply. Pure contract for product
//          + deep smoke.
// CONNECTS TO: MyMemory Teach Otzar, PortableCoreCard, Preferences,
//          FOUNDER H-03.

export const LEARNING_APPLIES_DOCTRINE =
  "Only preferences you approve become part of how Otzar helps later. " +
  "Rejected candidates are discarded — they never shape drafts, tone, or routing.";

export const REJECTED_NEVER_APPLIES =
  "Reject means never apply. A rejected candidate does not enter your approved " +
  "list, portable personal core, or later-work surfaces.";

export const LATER_WORK_SURFACES = [
  {
    id: "portable_core",
    label: "Portable personal core",
    path: "/app/my-memory",
    plain: "Approved methods stay in your personal core inventory.",
  },
  {
    id: "preferences",
    label: "Teach your AI Teammate (Preferences)",
    path: "/app/preferences",
    plain: "Standing preferences and tone you taught explicitly.",
  },
  {
    id: "my_twin",
    label: "My AI Teammate",
    path: "/app/my-twin",
    plain: "Behavior and tracking sidecars reflect what you've approved.",
  },
] as const;

export function normalizePreferenceText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\[(portable|org-bound)\]\s*/gi, "")
    .replace(/portable personal|org-bound \(stays\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rejected fingerprints must not appear in the approved set.
 * Short tokens (<12 chars) are ignored to avoid boilerplate collisions.
 */
export function rejectedNeverInApproved(
  rejectedPlain: string[],
  approvedPlain: string[],
): boolean {
  const approved = new Set(
    approvedPlain.map(normalizePreferenceText).filter((t) => t.length >= 12),
  );
  for (const r of rejectedPlain) {
    const n = normalizePreferenceText(r);
    if (n.length < 12) continue;
    if (approved.has(n)) return false;
    for (const a of approved) {
      if (a.includes(n) || n.includes(a)) {
        if (Math.min(a.length, n.length) >= 20) return false;
      }
    }
  }
  return true;
}

/** Approved items are exactly the ones that may apply to later work. */
export function approvedAppliesToLaterWork(
  approvedIds: string[],
  laterWorkIds: string[],
): boolean {
  const later = new Set(laterWorkIds);
  return approvedIds.every((id) => later.has(id));
}

export function sessionOutcomeSummary(input: {
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}): string {
  const { approved_count, rejected_count, pending_count } = input;
  if (approved_count === 0 && rejected_count === 0 && pending_count === 0) {
    return "No candidates yet — start a Teach Otzar session to generate some.";
  }
  const parts: string[] = [];
  if (approved_count > 0) {
    parts.push(
      `${approved_count} approved (will shape later work)`,
    );
  }
  if (rejected_count > 0) {
    parts.push(`${rejected_count} rejected (will never apply)`);
  }
  if (pending_count > 0) {
    parts.push(`${pending_count} still waiting for your decision`);
  }
  return parts.join(" · ");
}
