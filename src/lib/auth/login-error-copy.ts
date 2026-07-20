// FILE: login-error-copy.ts
// PURPOSE: Honest, recoverable login error strings. Sole-admin lockout must
//          never imply "ask your administrator" when the locked person may
//          be the only admin.
// CONNECTS TO: auth store login path; tests/unit/login-error-copy.test.ts.

/** Map Foundation / transport login failure codes to UI copy. */
export function loginErrorCopy(code: string | undefined): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Incorrect email or password.";
    case "SUSPENDED":
      // 5-failed-attempt auto-lockout flips the entity to SUSPENDED.
      // Org admins cannot clear their own lockout; platform recovery is required.
      return (
        "This account is temporarily locked after too many failed sign-ins. " +
        "Stop retrying — further attempts stay blocked until an Otzar operator clears the lockout. " +
        "If you are the only admin, contact Otzar support (do not wait on an in-org administrator)."
      );
    case "NETWORK_ERROR":
      return "Couldn't reach the server. Check your connection and try again.";
    default:
      return code
        ? `Login failed (${code}). Try again.`
        : "Login failed. Try again.";
  }
}
