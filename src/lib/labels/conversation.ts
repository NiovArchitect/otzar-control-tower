// FILE: conversation.ts
// PURPOSE: Product-safe labels for conversation-session metadata + twin
//          autonomy mode. Customer copy never exposes substrate tokens;
//          unknown enum values fall back to a title-cased safe string
//          rather than leaking a raw SCREAMING_SNAKE token.
// CONNECTS TO: src/pages/app/Conversations.tsx, src/pages/app/MyTwin.tsx.

// WHAT: Title-case a SCREAMING_SNAKE / lower token safely.
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// WHAT: Product label for a conversation/twin status.
export function labelConversationStatus(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "CLOSED":
      return "Closed";
    default:
      return titleCase(status);
  }
}

// WHAT: Product label for a conversation source_type.
export function labelConversationSource(source: string): string {
  switch (source) {
    case "CHAT":
      return "Chat console";
    default:
      return titleCase(source);
  }
}

// WHAT: Product label for a twin's autonomy mode.
export function labelAutonomyMode(mode: string): string {
  switch (mode) {
    case "APPROVAL_REQUIRED":
      return "Approval required";
    case "EXECUTIVE_OVERRIDE":
      return "Executive override";
    case "OBSERVE_ONLY":
      return "Observe only";
    default:
      return titleCase(mode);
  }
}
