// FILE: role-home.ts
// PURPOSE: B-05 — Today Home differs by role (admin/exec/manager/employee/
//          contractor). Same ADHD surface; different presence line, glance
//          priority, and empty-state copy — not a second dashboard.
// CONNECTS TO: AmbientWorkSurface, resolveWalkthroughRole, FOUNDER B-05.

import type { WalkthroughRole } from "@/lib/first-use/walkthrough";
import { resolveWalkthroughRole } from "@/lib/first-use/walkthrough";

export type HomeRole = WalkthroughRole;

export { resolveWalkthroughRole as resolveHomeRole };

export interface RoleHomeCopy {
  role: HomeRole;
  /** Sub-label under the Today greeting. */
  presenceLine: string;
  /** Calm empty Focus line when nothing is urgent. */
  caughtUpLine: string;
  /** Soft label for the Focus panel. */
  focusLabel: string;
  /** Preferred glance chip order (keys match AmbientWorkSurface glance keys). */
  glanceOrder: ReadonlyArray<"projects" | "twin" | "needs" | "doc" | "people" | "tools">;
}

const BY_ROLE: Record<HomeRole, RoleHomeCopy> = {
  administrator: {
    role: "administrator",
    presenceLine: "Org shape and tools first, then what needs you.",
    caughtUpLine: "Org is quiet. Structure and tools stay one tap away.",
    focusLabel: "Focus · admin",
    glanceOrder: ["people", "tools", "needs", "projects", "twin", "doc"],
  },
  executive: {
    role: "executive",
    presenceLine: "A few decisions, not a dashboard wall.",
    caughtUpLine: "Clear. Open Projects or People when you want a pulse.",
    focusLabel: "Focus · decisions",
    glanceOrder: ["needs", "projects", "people", "twin", "doc", "tools"],
  },
  manager: {
    role: "manager",
    presenceLine: "Your people and stuck work, not every org signal.",
    caughtUpLine: "Team is clear. Otzar will surface handoffs and blockers.",
    focusLabel: "Focus · team",
    glanceOrder: ["needs", "people", "projects", "twin", "doc", "tools"],
  },
  employee: {
    role: "employee",
    presenceLine: "What needs you, then projects and Talk.",
    caughtUpLine: "You're clear. Otzar is listening.",
    focusLabel: "Focus",
    glanceOrder: ["needs", "projects", "twin", "doc", "people", "tools"],
  },
  contractor: {
    role: "contractor",
    presenceLine: "Only scoped work you're allowed to act on.",
    caughtUpLine: "No scoped work waiting. Stay inside your boundaries.",
    focusLabel: "Focus · scoped",
    glanceOrder: ["needs", "projects", "doc", "twin", "people", "tools"],
  },
};

export function roleHomeCopy(role: HomeRole): RoleHomeCopy {
  return BY_ROLE[role] ?? BY_ROLE.employee;
}

/** Reorder glance chips by role preference; unknown keys append at end. */
export function orderGlanceByRole<T extends { key: string }>(
  role: HomeRole,
  items: T[],
): T[] {
  const order = roleHomeCopy(role).glanceOrder;
  const rank = new Map(order.map((k, i) => [k, i]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.key as (typeof order)[number]) ?? 100;
    const rb = rank.get(b.key as (typeof order)[number]) ?? 100;
    return ra - rb;
  });
}
