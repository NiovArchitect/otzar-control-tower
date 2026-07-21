// FILE: first-use/state.ts
// PURPOSE: First-use walkthrough completion AND in-progress step.
//          Dual write: versioned localStorage + best-effort server marker.
//          Progress survives route changes, refresh, and return visits.
// CONNECTS TO: walkthrough.ts, FirstUseReveal, correctionMemory API.

import { api } from "@/lib/api";
import {
  WALKTHROUGH_VERSION,
  walkthroughMarker,
} from "@/lib/first-use/walkthrough";

const PREFIX = "otzar_first_use_walkthrough:";
const STEP_PREFIX = "otzar_first_use_walkthrough_step:";

export function firstUseStorageKey(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): string {
  const id = (email ?? "anonymous").trim().toLowerCase();
  return `${PREFIX}${version}:${id}`;
}

function stepStorageKey(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): string {
  const id = (email ?? "anonymous").trim().toLowerCase();
  return `${STEP_PREFIX}${version}:${id}`;
}

/** @deprecated use hasCompletedWalkthrough */
export function hasCompletedFirstUse(email: string | null | undefined): boolean {
  return hasCompletedWalkthrough(email);
}

export function hasCompletedWalkthrough(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.localStorage.getItem(firstUseStorageKey(email, version)) === "done") {
      return true;
    }
    if (version === "v1") {
      const legacy = `otzar_first_use_v1:${(email ?? "anonymous").trim().toLowerCase()}`;
      return window.localStorage.getItem(legacy) === "done";
    }
    return false;
  } catch {
    return true;
  }
}

/** Current step index (0-based). Defaults to 0 when unset. */
export function getWalkthroughStepIndex(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(stepStorageKey(email, version));
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  } catch {
    return 0;
  }
}

/** Persist in-progress step. Does not complete the walkthrough. */
export function setWalkthroughStepIndex(
  email: string | null | undefined,
  index: number,
  version: string = WALKTHROUGH_VERSION,
  options?: { persistServer?: boolean },
): void {
  if (typeof window === "undefined") return;
  const next = Math.max(0, Math.floor(index));
  try {
    window.localStorage.setItem(stepStorageKey(email, version), String(next));
  } catch {
    /* private mode */
  }
  if (options?.persistServer !== false) {
    void persistServerWalkthroughProgress(version, next);
  }
}

export function markFirstUseComplete(email: string | null | undefined): void {
  markWalkthroughComplete(email);
}

export function markWalkthroughComplete(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(firstUseStorageKey(email, version), "done");
    window.localStorage.removeItem(stepStorageKey(email, version));
    if (version === "v1") {
      const legacy = `otzar_first_use_v1:${(email ?? "anonymous").trim().toLowerCase()}`;
      window.localStorage.setItem(legacy, "done");
    }
  } catch {
    /* private mode */
  }
  void persistServerWalkthroughDone(version);
}

async function persistServerWalkthroughDone(version: string): Promise<void> {
  try {
    const marker = walkthroughMarker(version);
    const listed = await api.otzar.correctionMemory.list({
      correction_type: "PREFERENCE",
      state: "ACTIVE",
      take: 40,
    });
    if (listed.ok) {
      const hit = listed.data.corrections?.some((c) =>
        (c.safe_summary ?? "").includes(marker),
      );
      if (hit) return;
    }
    await api.otzar.correctionMemory.create({
      scope_type: "PERSONAL",
      correction_type: "PREFERENCE",
      safe_summary: `${marker} first-use walkthrough completed`,
    });
  } catch {
    /* offline / permission */
  }
}

async function persistServerWalkthroughProgress(
  version: string,
  index: number,
): Promise<void> {
  try {
    const marker = `otzar_first_use_walkthrough:${version}:step:${index}`;
    await api.otzar.correctionMemory.create({
      scope_type: "PERSONAL",
      correction_type: "PREFERENCE",
      safe_summary: marker,
    });
  } catch {
    /* best-effort; local step is source of truth while in progress */
  }
}

/** Load server completion into localStorage when present (cross-device). */
export async function hydrateWalkthroughFromServer(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): Promise<boolean> {
  if (hasCompletedWalkthrough(email, version)) return true;
  try {
    const marker = walkthroughMarker(version);
    const listed = await api.otzar.correctionMemory.list({
      correction_type: "PREFERENCE",
      state: "ACTIVE",
      take: 40,
    });
    if (!listed.ok) return false;
    const hit = listed.data.corrections?.some((c) =>
      (c.safe_summary ?? "").includes(marker),
    );
    if (hit) {
      markWalkthroughComplete(email, version);
      return true;
    }
    // Resume highest step marker if present
    let maxStep = -1;
    for (const c of listed.data.corrections ?? []) {
      const s = c.safe_summary ?? "";
      const m = s.match(
        new RegExp(
          `otzar_first_use_walkthrough:${version}:step:(\\d+)`,
        ),
      );
      if (m?.[1] !== undefined) {
        const n = Number.parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxStep) maxStep = n;
      }
    }
    if (maxStep >= 0) {
      setWalkthroughStepIndex(email, maxStep, version, { persistServer: false });
    }
  } catch {
    return false;
  }
  return false;
}

export function clearFirstUse(email: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(firstUseStorageKey(email));
    window.localStorage.removeItem(stepStorageKey(email));
    window.localStorage.removeItem(
      `otzar_first_use_v1:${(email ?? "anonymous").trim().toLowerCase()}`,
    );
  } catch {
    /* ignore */
  }
}

export function clearWalkthrough(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(firstUseStorageKey(email, version));
    window.localStorage.removeItem(stepStorageKey(email, version));
  } catch {
    /* ignore */
  }
}
