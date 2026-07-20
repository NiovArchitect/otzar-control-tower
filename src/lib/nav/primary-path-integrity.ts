// FILE: primary-path-integrity.ts
// PURPOSE: C-03 — primary employee + admin paths must not be dead, fake,
//          or "coming soon". Pure checks for unit tests and register proof.
// CONNECTS TO: AmbientNav, nav-employee, nav.ts, walkthrough, focus-truth.

import { EMPLOYEE_NAV } from "@/lib/nav-employee";
import { NAV } from "@/lib/nav";
import { walkthroughStepsFor, type WalkthroughRole } from "@/lib/first-use/walkthrough";
import {
  focusApprovals,
  focusBlindSpots,
  focusReplies,
  focusTwinUnpaired,
} from "@/lib/today/focus-truth";
import { EMPLOYEE_REDIRECTS } from "@/lib/nav/route-inventory";

/** Live AmbientNav rail destinations (must match AmbientNav.tsx PRIMARY). */
export const AMBIENT_PRIMARY_PATHS: ReadonlyArray<{
  label: string;
  to: string;
}> = [
  { label: "Today", to: "/app" },
  { label: "Talk", to: "/app/voice" },
  { label: "Needs me", to: "/app/action-center" },
  { label: "People", to: "/app/collaboration" },
  { label: "Memory", to: "/app/my-memory" },
];

const REDIRECT_PATHS = new Set(EMPLOYEE_REDIRECTS.map((r) => r.path));

export function isDeadPrimaryPath(to: string): boolean {
  if (!to.startsWith("/")) return true;
  if (to === "#" || to.startsWith("#")) return true;
  // Primary rail must not land on a pure redirect alias.
  if (REDIRECT_PATHS.has(to)) return true;
  return false;
}

export function employeePrimaryNavItems() {
  return EMPLOYEE_NAV.filter((i) => i.group === "primary" && !i.hidden);
}

export function adminVisibleNavItems(showComingSoon: boolean) {
  return NAV.filter((item) => {
    if (item.hidden) return false;
    if (!showComingSoon && item.comingSoon) return false;
    return true;
  });
}

export function assertNoComingSoonInPrimaryEmployee(): string[] {
  const bad: string[] = [];
  for (const item of employeePrimaryNavItems()) {
    if (isDeadPrimaryPath(item.to)) {
      bad.push(`${item.label} → ${item.to} (dead/redirect)`);
    }
    if (/coming soon|not available|under construction/i.test(item.description)) {
      bad.push(`${item.label} has coming-soon copy`);
    }
  }
  for (const p of AMBIENT_PRIMARY_PATHS) {
    if (isDeadPrimaryPath(p.to)) {
      bad.push(`AmbientNav ${p.label} → ${p.to}`);
    }
  }
  return bad;
}

export function assertAdminDefaultNavClean(): string[] {
  const bad: string[] = [];
  for (const item of adminVisibleNavItems(false)) {
    if (item.comingSoon) {
      bad.push(`Admin nav shows comingSoon: ${item.label}`);
    }
  }
  return bad;
}

export function assertWalkthroughCtAsLive(): string[] {
  const roles: WalkthroughRole[] = [
    "administrator",
    "executive",
    "manager",
    "employee",
    "contractor",
  ];
  const bad: string[] = [];
  for (const role of roles) {
    for (const step of walkthroughStepsFor(role)) {
      if (isDeadPrimaryPath(step.ctaTo) && step.ctaTo !== "/app") {
        // /app is home — allowed
      }
      if (!step.ctaTo.startsWith("/app")) {
        bad.push(`${role}/${step.id} cta ${step.ctaTo}`);
      }
      if (REDIRECT_PATHS.has(step.ctaTo)) {
        bad.push(`${role}/${step.id} cta is redirect ${step.ctaTo}`);
      }
    }
  }
  return bad;
}

export function assertFocusLinksLive(): string[] {
  const items = [
    focusApprovals(1),
    focusBlindSpots(1),
    focusReplies(1),
    focusTwinUnpaired(),
  ];
  const bad: string[] = [];
  for (const item of items) {
    if (!item.to || !item.to.startsWith("/app")) {
      bad.push(`${item.key} missing /app link`);
    }
    if (!item.why.trim()) {
      bad.push(`${item.key} missing why`);
    }
  }
  return bad;
}
