// FILE: human-work-state.ts
// PURPOSE: Map Foundation work objects into simple human states.
//          Users should see to do / waiting / needs review / done,
//          not obligation vs handoff vs ledger type.
// CONNECTS TO: AmbientWorkSurface, ActionCenter, project surfaces.

export type HumanWorkState =
  | "to_do"
  | "in_progress"
  | "waiting"
  | "needs_review"
  | "done";

export type HumanWorkBand =
  | "needs_me"
  | "changed"
  | "otzar_handled"
  | "waiting"
  | "next";

export function humanWorkStateLabel(state: HumanWorkState): string {
  switch (state) {
    case "to_do":
      return "To do";
    case "in_progress":
      return "In progress";
    case "waiting":
      return "Waiting";
    case "needs_review":
      return "Needs review";
    case "done":
      return "Done";
    default:
      return "Work";
  }
}

export function humanWorkBandLabel(band: HumanWorkBand): string {
  switch (band) {
    case "needs_me":
      return "Needs me";
    case "changed":
      return "Changed";
    case "otzar_handled":
      return "Otzar handled";
    case "waiting":
      return "Waiting";
    case "next":
      return "Next";
    default:
      return "Work";
  }
}

/**
 * Classify a ledger-like status into a human work state.
 * Unknown statuses default to to_do so nothing silent-drops.
 */
export function classifyLedgerHumanState(input: {
  status?: string | null;
  needs_user?: boolean;
  waiting_on_other?: boolean;
  completed?: boolean;
}): HumanWorkState {
  if (input.completed === true) return "done";
  const s = (input.status ?? "").toUpperCase();
  if (
    s.includes("EXECUTED") ||
    s.includes("VERIFIED") ||
    s.includes("COMPLETED") ||
    s.includes("DONE")
  ) {
    return "done";
  }
  if (input.waiting_on_other === true || s.includes("WAITING") || s.includes("BLOCKED")) {
    return "waiting";
  }
  if (
    input.needs_user === true ||
    s.includes("APPROVAL") ||
    s.includes("REVIEW") ||
    s.includes("NEEDS_")
  ) {
    return "needs_review";
  }
  if (s.includes("PROGRESS") || s.includes("ACTIVE") || s.includes("EXECUTING")) {
    return "in_progress";
  }
  return "to_do";
}

export interface HomeBandItem {
  key: string;
  title: string;
  detail?: string;
  to?: string;
  testId: string;
  band: HumanWorkBand;
}

/** Collapse focus/changed/twin signals into ordered home bands (empty bands omitted). */
export function composeHomeBands(input: {
  needsMe: Array<{ key: string; title: string; detail?: string; to?: string; testId: string }>;
  changed: Array<{ key: string; title: string; detail?: string; to?: string; testId: string }>;
  handled: Array<{ key: string; title: string; detail?: string; to?: string; testId: string }>;
  waiting: Array<{ key: string; title: string; detail?: string; to?: string; testId: string }>;
  next: Array<{ key: string; title: string; detail?: string; to?: string; testId: string }>;
}): Array<{ band: HumanWorkBand; label: string; items: HomeBandItem[] }> {
  const order: HumanWorkBand[] = [
    "needs_me",
    "changed",
    "otzar_handled",
    "waiting",
    "next",
  ];
  const map: Record<HumanWorkBand, typeof input.needsMe> = {
    needs_me: input.needsMe,
    changed: input.changed,
    otzar_handled: input.handled,
    waiting: input.waiting,
    next: input.next,
  };
  return order
    .map((band) => ({
      band,
      label: humanWorkBandLabel(band),
      items: (map[band] ?? []).map((i) => ({ ...i, band })),
    }))
    .filter((b) => b.items.length > 0);
}
