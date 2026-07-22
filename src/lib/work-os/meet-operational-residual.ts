// FILE: meet-operational-residual.ts
// PURPOSE: N-02 — Google Meet operational transcript residual honesty.
//          Product cannot claim PROVIDER_PROVEN until operator OAuth/scopes
//          succeed; paste + reconnect remain the honest paths.
// CONNECTS TO: MeetOperationalResidualCard, Comms, ConnectorHealth,
//          FOUNDER N-02 EXTERNALLY_BLOCKED.

export const N02_DOCTRINE =
  "Meeting notes and transcripts from Google Meet need a successful Google " +
  "reconnect with the right permissions. Until then, Otzar will not claim " +
  "meetings are fully automatic. You can still paste a transcript.";

export const N02_STATUS = "EXTERNALLY_BLOCKED" as const;

export const N02_OPERATOR_STEPS = [
  {
    id: "open_tools",
    label: "Open Connections",
    plain:
      "Use Connections or Connector Health for Google Meet (or Calendar with Meet).",
  },
  {
    id: "reauth_scopes",
    label: "Finish Google sign-in",
    plain:
      "Sign in and grant the permissions needed for meeting notes and transcripts.",
  },
  {
    id: "verify_ambient",
    label: "Confirm meetings appear",
    plain:
      "Comms sync should return real meetings — not a green light with empty data.",
  },
  {
    id: "paste_fallback",
    label: "Paste stays available",
    plain: "Until Meet is connected, paste or import is the offline capture path.",
  },
] as const;

/** Language that falsely claims Meet is fully operational. */
export const N02_FALSE_COMPLETE_PATTERNS = [
  /meet transcripts fully operational/i,
  /all meetings pulling automatically with no reconnect/i,
  /google meet provider proven/i,
  /transcripts always available without oauth/i,
  /n-02 closed without operator/i,
] as const;

export function claimsMeetFullyOperational(text: string): boolean {
  return N02_FALSE_COMPLETE_PATTERNS.some((re) => re.test(text));
}

export type MeetOperationalMode =
  | "externally_blocked"
  | "reconnect_needed"
  | "provider_proven";

/**
 * Product mode for residual card. Live product cannot auto-detect full
 * PROVIDER_PROVEN without a successful ambient probe — default blocked.
 */
export function resolveMeetOperationalMode(opts: {
  /** Explicit operator/env flag when PROVIDER_PROVEN is proven continuously. */
  providerProven?: boolean;
  needsReconnect?: boolean;
}): MeetOperationalMode {
  if (opts.providerProven === true) return "provider_proven";
  if (opts.needsReconnect === true) return "reconnect_needed";
  return "externally_blocked";
}

export function meetModeLabel(mode: MeetOperationalMode): string {
  switch (mode) {
    case "provider_proven":
      return "Meet connected — automatic pull is working";
    case "reconnect_needed":
      return "Reconnect needed — sign in again with Meet access";
    case "externally_blocked":
    default:
      return "Not fully connected — finish Google setup for Meet";
  }
}

export const N02_RESIDUAL_COPY =
  "Until Meet is reconnected and verified, paste or import stays available. " +
  "We do not claim full automatic transcripts yet.";
