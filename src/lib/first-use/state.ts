// FILE: first-use/state.ts
// PURPOSE: A-04 — first-use / walkthrough completion. Dual write:
//          (1) versioned localStorage key per account
//          (2) server Twin PREFERENCE correction marker (when API allows)
//          Version bumps re-show the walkthrough.
// CONNECTS TO: walkthrough.ts, FirstUseReveal, correctionMemory API.

import { api } from "@/lib/api";
import {
  WALKTHROUGH_VERSION,
  walkthroughMarker,
} from "@/lib/first-use/walkthrough";

const PREFIX = "otzar_first_use_walkthrough:";

export function firstUseStorageKey(
  email: string | null | undefined,
  version: string = WALKTHROUGH_VERSION,
): string {
  const id = (email ?? "anonymous").trim().toLowerCase();
  return `${PREFIX}${version}:${id}`;
}

/** @deprecated use hasCompletedWalkthrough — kept for older tests */
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
    // Legacy unversioned key (A-03 era) only satisfies v1 — version bumps re-show.
    if (version === "v1") {
      const legacy = `otzar_first_use_v1:${(email ?? "anonymous").trim().toLowerCase()}`;
      return window.localStorage.getItem(legacy) === "done";
    }
    return false;
  } catch {
    return true;
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
    // Keep legacy key for v1 so A-03 readers stay quiet; never use it for v2+.
    if (version === "v1") {
      const legacy = `otzar_first_use_v1:${(email ?? "anonymous").trim().toLowerCase()}`;
      window.localStorage.setItem(legacy, "done");
    }
  } catch {
    /* private mode */
  }
  // Server marker — best-effort (Twin PREFERENCE)
  void persistServerWalkthroughDone(version);
}

async function persistServerWalkthroughDone(
  version: string,
): Promise<void> {
  try {
    const marker = walkthroughMarker(version);
    // Avoid duplicates: list PREFERENCE and skip if marker present
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
      safe_summary: `${marker} — first-use walkthrough completed`,
    });
  } catch {
    /* offline / permission — local still holds */
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
  } catch {
    return false;
  }
  return false;
}

export function clearFirstUse(email: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(firstUseStorageKey(email));
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
  } catch {
    /* ignore */
  }
}
