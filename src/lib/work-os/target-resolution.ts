// FILE: target-resolution.ts
// PURPOSE: Phase 1266 — resolve a spoken/typed name ("David",
//          "Samiksha", "Vishesh", "the AI engineer") to a REAL org
//          entity_id so Work-OS actions (draft/send/ask-twin/schedule/
//          assign) can target a governed Action. Uses the real
//          GET /api/v1/org/entities roster (PERSON + AI_AGENT). NEVER
//          invents a person, NEVER fabricates an entity_id, NEVER
//          touches passwords/logins.
//
// CONTRACT:
//   - RESOLVED_HUMAN / RESOLVED_AI_AGENT → a single confident match.
//   - AMBIGUOUS → multiple matches; caller asks the user to pick.
//   - NOT_FOUND → roster loaded but no match.
//   - RUNTIME_MISSING → roster not reachable (e.g. caller lacks the
//     org-roster capability); caller routes to a target picker.
// CONNECTS TO: AmbientOtzarBar (draft/send/ask-twin), api.org.entities,
//          tests/unit/target-resolution.test.ts.

import { api } from "@/lib/api";
import type { Entity } from "@/lib/types/foundation";

export type ResolutionKind =
  | "RESOLVED_HUMAN"
  | "RESOLVED_TWIN"
  | "RESOLVED_AI_AGENT"
  | "AMBIGUOUS"
  | "NOT_FOUND"
  | "RUNTIME_MISSING";

export interface ResolvedTarget {
  kind: ResolutionKind;
  entityId?: string;
  displayName?: string;
  /** Populated for AMBIGUOUS so the UI can offer a pick list. */
  candidates?: Array<{ entityId: string; displayName: string }>;
}

/** Pure matcher (exported for tests): match a name against a roster.
 *  Prefers an exact display-name match; falls back to a unique
 *  word/substring match. Email local-part is also accepted. */
export function matchRoster(name: string, roster: Entity[]): ResolvedTarget {
  const needle = name.trim().toLowerCase();
  if (needle.length === 0) return { kind: "NOT_FOUND" };

  const exact = roster.filter(
    (e) => (e.display_name ?? "").toLowerCase() === needle,
  );
  const partial = roster.filter((e) => {
    const dn = (e.display_name ?? "").toLowerCase();
    const emailLocal = (e.email ?? "").toLowerCase().split("@")[0] ?? "";
    return (
      dn === needle ||
      dn.split(/\s+/).includes(needle) || // first/last name token
      dn.startsWith(needle) ||
      emailLocal === needle
    );
  });

  const matches = exact.length > 0 ? exact : partial;
  if (matches.length === 0) return { kind: "NOT_FOUND" };
  if (matches.length > 1) {
    return {
      kind: "AMBIGUOUS",
      candidates: matches.map((e) => ({
        entityId: e.entity_id,
        displayName: e.display_name,
      })),
    };
  }
  const e = matches[0]!;
  return {
    kind: e.entity_type === "AI_AGENT" ? "RESOLVED_AI_AGENT" : "RESOLVED_HUMAN",
    entityId: e.entity_id,
    displayName: e.display_name,
  };
}

/** Resolve a name against the live org roster. */
export async function resolveTarget(name: string): Promise<ResolvedTarget> {
  if (name.trim().length === 0) return { kind: "NOT_FOUND" };
  const res = await api.org.entities.list({ take: 200 });
  if (!res.ok) {
    // Roster not reachable (often: caller isn't an org admin). Honest
    // signal — the caller routes to a target picker, never guesses.
    return { kind: "RUNTIME_MISSING" };
  }
  return matchRoster(name, res.data.items);
}

/** Phase 2.5 — resolve a name through the READ-scoped backend resolver
 *  (POST /work-os/resolve-target), so a STANDARD (non-admin) employee can
 *  resolve a same-org teammate without org-roster access. The backend enforces
 *  same-org / active-membership scope. Ambiguity returns named candidates so
 *  the caller can ask ONE focused clarification. Falls back to the admin roster
 *  ONLY when the route itself is unreachable (non-ok / RUNTIME_MISSING) — a
 *  clean NOT_FOUND stays NOT_FOUND (the roster is admin-only anyway). */
export async function resolveTargetGoverned(
  name: string,
): Promise<ResolvedTarget> {
  if (name.trim().length === 0) return { kind: "NOT_FOUND" };
  const res = await api.workOs.resolveTarget({ target_name: name });
  if (!res.ok) return resolveTarget(name); // route unavailable → roster fallback
  const r = res.data.resolution;
  switch (r.code) {
    case "RESOLVED_INTERNAL_ENTITY":
      if (r.match !== null) {
        return {
          // resolve-target does not distinguish PERSON vs AI_AGENT; the
          // governed rails target the resolved entity_id directly, and the
          // interpret layer already maps "<Name>'s Twin" → the person.
          kind: "RESOLVED_HUMAN",
          entityId: r.match.entity_id,
          displayName: r.match.display_name,
        };
      }
      return { kind: "NOT_FOUND" };
    case "AMBIGUOUS":
      return {
        kind: "AMBIGUOUS",
        candidates: r.candidates.map((c) => ({
          entityId: c.entity_id,
          displayName: c.display_name,
        })),
      };
    case "RUNTIME_MISSING":
      return resolveTarget(name); // backend couldn't run resolver → roster
    case "NEEDS_EMAIL":
    case "NOT_FOUND":
    default:
      return { kind: "NOT_FOUND" };
  }
}
