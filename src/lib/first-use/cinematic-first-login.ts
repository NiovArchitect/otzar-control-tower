// FILE: cinematic-first-login.ts
// PURPOSE: A-08 — unified cinematic first-login journey doctrine + inventory.
//          Composes A-03/A-04/A-05 into one per-role multi-step proof surface.
// CONNECTS TO: walkthrough.ts, FirstUseReveal, FOUNDER A-08.

import {
  type WalkthroughRole,
  walkthroughStepsFor,
} from "@/lib/first-use/walkthrough";

export const A08_DOCTRINE =
  "First login is a cinematic, role-specific Work OS reveal: real org state " +
  "pointers, restrained spatial depth, one real AI action, and one provider " +
  "honesty pointer — then returning users land Home without a tour maze.";

export const A08_ROLES: readonly WalkthroughRole[] = [
  "administrator",
  "executive",
  "manager",
  "employee",
  "contractor",
] as const;

export type A08JourneyFacet =
  | "org_state"
  | "ai_action"
  | "provider_honesty"
  | "completion"
  | "return_home";

export type A08RoleJourney = {
  role: WalkthroughRole;
  steps: number;
  has_org_state: boolean;
  has_ai_action: boolean;
  has_provider_honesty: boolean;
  cta_paths: string[];
  facets: Record<A08JourneyFacet, boolean>;
};

/** Pure inventory of whether a role plan satisfies A-08 composition. */
export function inventoryA08Journey(role: WalkthroughRole): A08RoleJourney {
  const steps = walkthroughStepsFor(role);
  const paths = steps.map((s) => s.ctaTo);
  const has_org_state = steps.some(
    (s) =>
      s.ctaTo.includes("collaboration") ||
      s.ctaTo.includes("work-projects") ||
      s.ctaTo === "/app" ||
      s.ctaTo.includes("action-center") ||
      /org|people|project|needs|today|structure|reporting/i.test(
        `${s.title} ${s.body}`,
      ),
  );
  const has_ai_action = steps.some(
    (s) =>
      s.ctaTo.includes("voice") ||
      s.ctaTo.includes("my-twin") ||
      /talk|ai teammate|twin|draft/i.test(`${s.title} ${s.body}`),
  );
  const has_provider_honesty = steps.some(
    (s) =>
      s.ctaTo.includes("connector") ||
      /google|meet|calendar|docs|tools|reconnect|scope|provider/i.test(
        `${s.title} ${s.body}`,
      ),
  );
  return {
    role,
    steps: steps.length,
    has_org_state,
    has_ai_action,
    has_provider_honesty,
    cta_paths: paths,
    facets: {
      org_state: has_org_state,
      ai_action: has_ai_action,
      provider_honesty: has_provider_honesty,
      completion: steps.length >= 1 && steps.length <= 3,
      return_home: true, // returning users: dismissed walkthrough → Home
    },
  };
}

export function a08JourneyOk(j: A08RoleJourney): boolean {
  return (
    j.has_org_state &&
    j.has_ai_action &&
    j.has_provider_honesty &&
    j.steps >= 2 &&
    j.steps <= 3 &&
    j.cta_paths.every((p) => p.startsWith("/app"))
  );
}

/** All five primary roles must pass A-08 composition. */
export function a08AllRolesOk(): {
  ok: boolean;
  journeys: A08RoleJourney[];
  failures: string[];
} {
  const journeys = A08_ROLES.map(inventoryA08Journey);
  const failures = journeys
    .filter((j) => !a08JourneyOk(j))
    .map(
      (j) =>
        `${j.role}: org=${j.has_org_state} ai=${j.has_ai_action} provider=${j.has_provider_honesty} steps=${j.steps}`,
    );
  return { ok: failures.length === 0, journeys, failures };
}
