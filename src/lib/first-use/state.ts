// FILE: first-use/state.ts
// PURPOSE: Client first-use completion flag (per account). Server-authoritative
//          onboarding can replace this later; for now we gate the first-login
//          reveal without inventing a disconnected onboarding universe.
//          Keyed by email so logout/login as another user cannot inherit state.

const PREFIX = "otzar_first_use_v1:";

export function firstUseStorageKey(email: string | null | undefined): string {
  const id = (email ?? "anonymous").trim().toLowerCase();
  return `${PREFIX}${id}`;
}

export function hasCompletedFirstUse(email: string | null | undefined): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(firstUseStorageKey(email)) === "done";
  } catch {
    return true;
  }
}

export function markFirstUseComplete(email: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(firstUseStorageKey(email), "done");
  } catch {
    /* private mode — reveal may reappear; not a hard failure */
  }
}

export function clearFirstUse(email: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(firstUseStorageKey(email));
  } catch {
    /* ignore */
  }
}
