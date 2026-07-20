// FILE: contextual-work-surfaces.ts
// PURPOSE: C-04 — Blind spots / corrections / obligations / handoffs /
//          evidence live in contextual work surfaces (Needs me, Memory,
//          Today deep-links) — not as primary destinations.
// CONNECTS TO: ActionCenter, App routes, FOUNDER C-04.

/** Work kinds that must not be sole primary destinations. */
export type ContextualWorkKind =
  | "blind_spots"
  | "corrections"
  | "obligations"
  | "handoffs"
  | "evidence"
  | "open_work"
  | "approvals";

export interface ContextualWorkSurface {
  kind: ContextualWorkKind;
  /** Human label */
  label: string;
  /** Primary contextual host path (employee shell). */
  hostPath: string;
  /** data-testid of the host lane/panel when present. */
  hostTestId: string;
  /** Legacy deep-link that must redirect or reframe into host. */
  legacyPath: string | null;
  /** Query deep-link supported on host (e.g. ?handoff=). */
  deepLinkQuery: string | null;
  notes: string;
}

/**
 * Canonical map: every C-04 work kind → where it lives in the product.
 * Host paths are employee Work OS routes.
 */
export const CONTEXTUAL_WORK_SURFACES: ReadonlyArray<ContextualWorkSurface> = [
  {
    kind: "blind_spots",
    label: "Blind spots",
    hostPath: "/app/action-center",
    hostTestId: "blind-spots-lane",
    legacyPath: "/app/blind-spots",
    deepLinkQuery: "lane=blind-spots",
    notes: "Watcher/risk feed on Needs me; legacy route redirects",
  },
  {
    kind: "corrections",
    label: "Corrections",
    hostPath: "/app/action-center",
    hostTestId: "corrections-context-lane",
    // Full form stays at /app/corrections as secondary deep-link (not primary nav).
    legacyPath: null,
    deepLinkQuery: "lane=corrections",
    notes: "Context strip on Needs me; full form at /app/corrections deep-link",
  },
  {
    kind: "obligations",
    label: "Obligations",
    hostPath: "/app/action-center",
    hostTestId: "open-obligations-lane",
    legacyPath: null,
    deepLinkQuery: "obligation",
    notes: "Open obligations lane; Today next-best deep-link",
  },
  {
    kind: "handoffs",
    label: "Handoffs",
    hostPath: "/app/action-center",
    hostTestId: "incoming-handoffs-lane",
    legacyPath: null,
    deepLinkQuery: "handoff",
    notes: "Incoming handoffs lane with ambient acknowledge",
  },
  {
    kind: "evidence",
    label: "Decision evidence",
    hostPath: "/app/action-center",
    hostTestId: "decision-evidence-lane",
    legacyPath: null,
    deepLinkQuery: null,
    notes: "Completed decisions whose evidence changed",
  },
  {
    kind: "open_work",
    label: "Open work",
    hostPath: "/app/action-center",
    hostTestId: "open-work-lane",
    legacyPath: "/app/my-work",
    deepLinkQuery: null,
    notes: "Owned ledger work; my-work redirects to Needs me",
  },
  {
    kind: "approvals",
    label: "Approvals / decisions",
    hostPath: "/app/action-center",
    hostTestId: "action-center",
    legacyPath: "/app/approvals",
    deepLinkQuery: null,
    notes: "Action lifecycle tabs; approvals redirects",
  },
];

/** Legacy paths that must not remain primary destinations. */
export const C04_LEGACY_REDIRECTS: ReadonlyArray<{
  path: string;
  target: string;
}> = CONTEXTUAL_WORK_SURFACES.filter((s) => s.legacyPath !== null).map((s) => ({
  path: s.legacyPath as string,
  target: s.hostPath,
}));

export function surfaceForKind(
  kind: ContextualWorkKind,
): ContextualWorkSurface | undefined {
  return CONTEXTUAL_WORK_SURFACES.find((s) => s.kind === kind);
}

export function hostPathForKind(kind: ContextualWorkKind): string {
  return surfaceForKind(kind)?.hostPath ?? "/app/action-center";
}

/** True when a path is a legacy alias that should redirect into context. */
export function isLegacyContextualPath(pathname: string): boolean {
  const p = pathname.split("?")[0]?.replace(/\/$/, "") || pathname;
  return C04_LEGACY_REDIRECTS.some((r) => r.path === p);
}

export function legacyRedirectTarget(pathname: string): string | null {
  const p = pathname.split("?")[0]?.replace(/\/$/, "") || pathname;
  return C04_LEGACY_REDIRECTS.find((r) => r.path === p)?.target ?? null;
}

/**
 * All C-04 kinds must host under Needs me (or explicit Memory for teach).
 * Returns kinds that violate the contract.
 */
export function assertAllKindsContextual(): string[] {
  const bad: string[] = [];
  for (const s of CONTEXTUAL_WORK_SURFACES) {
    if (!s.hostPath.startsWith("/app/")) {
      bad.push(`${s.kind} host outside /app: ${s.hostPath}`);
    }
    if (!s.hostTestId) {
      bad.push(`${s.kind} missing hostTestId`);
    }
    // Primary home must not be a standalone legacy path for these kinds
    if (s.legacyPath && s.hostPath === s.legacyPath) {
      bad.push(`${s.kind} host equals legacy (not contextual)`);
    }
  }
  return bad;
}

/** Fingerprint for tests / live markers. */
export function contextualSurfaceFingerprint(): string {
  return CONTEXTUAL_WORK_SURFACES.map((s) => s.kind).join(">");
}
