// FILE: action-details-store.ts
// PURPOSE: Phase 1269 — the human-readable detail for a created
//          ProposedAction. Foundation's SafeActionView deliberately
//          omits the body (it's the *Action* surface, not the
//          *Notification* body), so the Action Center showed only a
//          generic "Internal note" label. This store keeps the SAFE
//          artifact content the USER authored (recipient label,
//          channel, body, source command) keyed by action_id, so the
//          Action Center can show "To: David · We need to review this"
//          instead of a useless generic label.
//
// SAFETY: stores ONLY the user-authored artifact content already shown
//          on screen — never secrets, never tokens, never raw audio,
//          never entity ids beyond a display label.
// CONNECTS TO: AmbientOtzarBar (writes on Confirm), ActionCenter
//          (reads per card), tests/unit/action-details-store.test.ts.

export interface ActionDetails {
  title: string;
  recipientLabel?: string;
  channel?: string;
  body: string;
  sourceCommand?: string;
}

const STORAGE_KEY = "otzar.action-details.v1";
const MAX_ENTRIES = 200;

function loadMap(): Record<string, ActionDetails> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, ActionDetails>)
      : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, ActionDetails>): void {
  if (typeof window === "undefined") return;
  try {
    // Cap growth: keep only the most recent MAX_ENTRIES keys.
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      const trimmed: Record<string, ActionDetails> = {};
      for (const k of keys.slice(-MAX_ENTRIES)) trimmed[k] = map[k]!;
      map = trimmed;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Record the human-readable detail for a created action. */
export function setActionDetails(actionId: string, details: ActionDetails): void {
  if (actionId.length === 0) return;
  const map = loadMap();
  map[actionId] = details;
  saveMap(map);
}

/** Look up the detail for an action_id, or null if unknown. */
export function getActionDetails(actionId: string): ActionDetails | null {
  if (actionId.length === 0) return null;
  return loadMap()[actionId] ?? null;
}
