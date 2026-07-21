// FILE: meet-operational-residual.ts
// PURPOSE: N-02 — Google Meet operational transcript residual honesty.
//          Product cannot claim PROVIDER_PROVEN until operator OAuth/scopes
//          succeed; paste + reconnect remain the honest paths.
// CONNECTS TO: MeetOperationalResidualCard, Comms, ConnectorHealth,
//          FOUNDER N-02 EXTERNALLY_BLOCKED.

export const N02_DOCTRINE =
  "Google Meet operational meeting artifacts and transcripts require live " +
  "provider OAuth and scopes. Until an operator reconnects Meet successfully, " +
  "Otzar must never claim meetings are fully pulling or that transcripts are " +
  "complete. Paste fallback and Tools reconnect stay honest.";

export const N02_STATUS = "EXTERNALLY_BLOCKED" as const;

export const N02_OPERATOR_STEPS = [
  {
    id: "open_tools",
    label: "Open Tools reconnect",
    plain: "Use Connector Health / Tools & Connections for Google Meet (or Calendar with Meet).",
  },
  {
    id: "reauth_scopes",
    label: "Complete OAuth with Meet scopes",
    plain: "Operator signs in and grants the scopes required for meeting artifacts/transcripts.",
  },
  {
    id: "verify_ambient",
    label: "Re-prove ambient sync",
    plain: "Comms Sync connected sources must return real meetings — not false green.",
  },
  {
    id: "paste_fallback",
    label: "Paste remains available",
    plain: "Until Meet is operational, paste/import is the offline capture path.",
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
      return "Meet provider proven — ambient pull operational";
    case "reconnect_needed":
      return "Reconnect needed — tools signal reauth/scopes";
    case "externally_blocked":
    default:
      return "Externally blocked — operator OAuth residual";
  }
}

export const N02_RESIDUAL_COPY =
  "N-02 stays EXTERNALLY_BLOCKED until operator Meet OAuth succeeds and ambient " +
  "sync is re-proven on live. Product honesty (reconnect + paste) is shipped; " +
  "operational transcripts are not claimed.";
