// FILE: twin-identity.ts
// PURPOSE: [GAP-H] Human identity labels for AI Teammates rows, from the
//          AUTHORITATIVE backend-projected owner — never a raw
//          "Twin of <uuid>" string, never a guessed owner, and an honest
//          "No owner assigned yet" only when the owner is truly missing.
// CONNECTS TO: src/pages/AITeammates.tsx, Foundation GET /org/ai-teammates
//          owner projection (GAP-H), TwinDetailDrawer header.

/** "Sadeil Lewis's AI Twin" — or an honest generic when no owner exists. */
export function twinDisplayLabel(item: {
  display_name: string;
  owner_display_name?: string | null | undefined;
}): string {
  const owner = item.owner_display_name;
  if (typeof owner === "string" && owner.trim().length > 0) {
    return `${owner}'s AI Twin`;
  }
  // Never surface the raw stored "Twin of <uuid> (…)" string as a name.
  return "AI Twin";
}

/** The Owner cell: the person's name, or the honest missing state. */
export function twinOwnerLabel(item: {
  owner_display_name?: string | null | undefined;
}): string {
  const owner = item.owner_display_name;
  return typeof owner === "string" && owner.trim().length > 0
    ? owner
    : "No owner assigned yet";
}
