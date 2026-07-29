// FILE: first-use/state.ts
// PURPOSE: Versioned first-use walkthrough completion + in-progress step.
//          Local storage is the in-session source of truth for step index.
//          Server only stores "done" (not mid-walk resume) after founder
//          rejection of silent resume-at-step-8/11 from accumulated markers.
// CONNECTS TO: walkthrough.ts, FirstUseReveal, correctionMemory API.

import { api } from "@/lib/api";
import {
  WALKTHROUGH_VERSION,
  walkthroughMarker,
} from "@/lib/first-use/walkthrough";

const PREFIX = "otzar_first_use_walkthrough:";
const STEP_PREFIX = "otzar_first_use_walkthrough_step:";

/**
 * WHAT: Stable localStorage key for completion.
 * INPUT: email (demo uses persona@demo.local) + version.
 * OUTPUT: namespaced key so version bumps invalidate stale progress.
 */
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

/**
 * WHAT: Persist in-progress step locally only.
 * WHY: Server step markers caused silent resume at step 8/11 after smoke tests.
 *      Founder rejection: never accumulate mid-walk progress as cross-session truth.
 */
export function setWalkthroughStepIndex(
  email: string | null | undefined,
  index: number,
  version: string = WALKTHROUGH_VERSION,
  _options?: { persistServer?: boolean },
): void {
  if (typeof window === "undefined") return;
  const next = Math.max(0, Math.floor(index));
  try {
    window.localStorage.setItem(stepStorageKey(email, version), String(next));
  } catch {
    /* private mode */
  }
  // Intentionally do NOT write mid-walk step markers to the server.
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

/**
 * WHAT: Hydrate ONLY completion from server — never mid-walk step index.
 * WHY: Prior hydrateWalkthroughFromServer resumed highest step:N marker
 *      written by every Next click, so clean browsers still opened at 8/12.
 */
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
    // Explicitly ignore otzar_first_use_walkthrough:*:step:* markers.
  } catch {
    return false;
  }
  return false;
}

export function clearFirstUse(email: string | null | undefined): void {
  clearWalkthrough(email);
}

/**
 * WHAT: Full local reset for Start over / demo re-launch.
 * INPUT: email + version
 * OUTPUT: no local done/step for this version key
 */
export function clearWalkthrough(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(firstUseStorageKey(email, version));
    window.localStorage.removeItem(stepStorageKey(email, version));
    // Also clear previous major versions that may linger in the same browser.
    for (const v of ["v1", "v2", "v3", "v4", "v5", "yc-demo-v5"]) {
      window.localStorage.removeItem(firstUseStorageKey(email, v));
      window.localStorage.removeItem(stepStorageKey(email, v));
    }
    window.localStorage.removeItem(
      `otzar_first_use_v1:${(email ?? "anonymous").trim().toLowerCase()}`,
    );
  } catch {
    /* ignore */
  }
}

/**
 * WHAT: Demo persona launch must start at step 1 unless user chose Continue.
 * INPUT: email for the demo persona
 * OUTPUT: clears local progress for a clean first-time start
 */
export function resetWalkthroughForDemoLaunch(
  email: string | null | undefined,
): void {
  clearWalkthrough(email, WALKTHROUGH_VERSION);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      "otzar_walkthrough_force_start",
      WALKTHROUGH_VERSION,
    );
  } catch {
    /* ignore */
  }
}
