// FILE: synthetic-principal.ts
// PURPOSE: Detect internal test / release-candidate / pressure-harness
//          principals so founder-facing People never presents them as
//          real coworkers. Filtering is display-layer only — does not
//          delete entities or change hierarchy writes.
// CONNECTS TO: PeopleStructureGlance, PeopleDirectory, person-name.

/**
 * True when email/display looks like a synthetic RC2 / pressure / load
 * principal rather than a human coworker.
 */
export function isSyntheticPrincipal(input: {
  email?: string | null;
  display_name?: string | null;
}): boolean {
  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.display_name ?? "").trim().toLowerCase();
  const local = email.includes("@") ? (email.split("@")[0] ?? "") : email;
  const hay = `${email} ${name} ${local}`;

  if (email.length === 0 && name.length === 0) return false;

  // RC2 multi-admin / pressure principals (founder-reproduced)
  if (/\brc2[-_]?admin\b/.test(hay)) return true;
  if (/\brc2[-_]/.test(local) || local.startsWith("rc2")) return true;
  // Plus-addressed automation under founder mailbox
  if (/\+rc2[-_]/.test(email) || /\+s250/.test(email)) return true;
  // Synthetic scale / pressure harness locals
  if (/^(s25|s250|s2500|synthetic|load[-_]?test|pressure[-_]|harness[-_])/i.test(local)) {
    return true;
  }
  if (/\b(synthetic|load-?test|pressure harness)\b/.test(name)) return true;
  // Disposable domains never real coworkers
  if (/@(example\.com|test\.local|localhost)$/.test(email)) return true;

  return false;
}

/** Filter a people list for coworker-facing surfaces. */
export function filterCoworkerPeople<
  T extends { email?: string | null; display_name?: string | null },
>(people: readonly T[]): T[] {
  return people.filter((p) => !isSyntheticPrincipal(p));
}

/**
 * Safe label for a person: prefer human display name; never surface a
 * raw rc2-admin email as the coworker name.
 */
export function coworkerDisplayLabel(input: {
  email?: string | null;
  display_name?: string | null;
}): string {
  if (isSyntheticPrincipal(input)) {
    return "Internal test account";
  }
  const name = (input.display_name ?? "").trim();
  if (name.length > 0 && !name.includes("@")) return name;
  const email = (input.email ?? "").trim();
  if (email.length > 0) {
    const local = email.split("@")[0] ?? email;
    return local.replace(/[._+-]+/g, " ");
  }
  return "Teammate";
}
