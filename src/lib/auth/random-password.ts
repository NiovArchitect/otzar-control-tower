// FILE: random-password.ts
// PURPOSE: Generate a strong random password used as the placeholder
//          credential for newly invited members. The invitee never
//          sees this value -- their real onboarding path is the
//          activation_credential returned by Phase 3.
//
// SECURITY POSTURE (decision #21, SECTION_12_DISCIPLINE.md):
// - Uses crypto.getRandomValues() (cryptographically random).
// - 32 chars, base64-safe alphabet (no I/O ambiguous chars).
// - NEVER displayed to the admin.
// - NEVER logged.
// - NEVER stored client-side.
// - Lives only in the POST /org/members request body and is
//   immediately discarded after the fetch resolves.
// - The real invitee credential is Phase3Result.activation_credential,
//   delivered out-of-band by the invite link.
//
// CONNECTS TO: src/lib/api.ts (members.create injects the password
//              into the request body before delegating to request<T>()).

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const TARGET_LENGTH = 32;

// WHAT: Generate a random 32-char placeholder password.
// INPUT: None.
// OUTPUT: A 32-character string from a base64-safe alphabet.
// WHY: Foundation's POST /org/members requires a non-empty password.
//      The activation_credential from Phase 3 is the invitee's real
//      access path; this value just satisfies the contract.
export function generateRandomPassword(): string {
  const bytes = new Uint8Array(TARGET_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < TARGET_LENGTH; i++) {
    // bytes[i] is 0..255; modulo 64 picks an alphabet index. The
    // small modulo bias (256 / 64 = exact) is acceptable for a
    // throwaway placeholder credential.
    const byte = bytes[i] ?? 0;
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}
