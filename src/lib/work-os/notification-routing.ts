// FILE: notification-routing.ts
// PURPOSE: Phase 1266 — turn a notification into a Work-OS destination.
//          Before this, clicking a notification did nothing (or errored).
//          This pure resolver maps a SafeNotificationView to a REAL
//          in-app route: an action/approval → Action Center (focused on
//          the action), connector issues → the employee Connector Health
//          page, collaboration → Collaboration, etc. Every branch resolves
//          to an EMPLOYEE-tree (/app/*) route so a click from the employee
//          chrome never lands on the admin-only "Access Denied" screen.
//          There is always a safe real fallback (Action Center), so a click
//          never dead-ends and never throws.
//          Phase 1304-A adds forward-looking review → /review-center and
//          Federation Cloud marketplace → /marketplace mappings (inert until
//          a backend notification generator emits those classes).
// CONNECTS TO: src/components/otzar/NotificationBell.tsx,
//          tests/unit/notification-routing.test.ts.

export interface NotificationTarget {
  action_id: string | null;
  notification_class: string;
  notification_id?: string;
}

/** Resolve a notification to a real in-app route. Never returns null —
 *  there is always a safe fallback so the click does something useful. */
export function notificationRoute(n: NotificationTarget): string {
  const c = (n.notification_class ?? "").toLowerCase();
  // Phase 1284 Wave 2 — a direct internal message opens the real message
  // THREAD (From/To/body/reply/proof), NEVER the generic Comms capture page.
  if (
    (c.includes("direct") || c.includes("message")) &&
    n.notification_id !== undefined &&
    n.notification_id.length > 0
  ) {
    return `/app/inbox/${encodeURIComponent(n.notification_id)}`;
  }
  // Phase 1304-A — a high-sensitivity REVIEW notification opens the Review
  // Center ("Needs review"), NOT the generic Action Center: a review is a
  // distinct governed object, not an Action Center action (directive C).
  // This must win over the action_id default below so a review never routes
  // to Action Center. Forward-looking: no backend generator emits review-class
  // notifications yet (1304-A pre-code report) — the mapping is inert until one
  // does, but it is correct now and unit-tested.
  if (c.includes("review") || c.includes("high_sensitivity") || c.includes("high-sensitivity")) {
    return "/review-center";
  }
  // Phase 1304-A — a Federation Cloud marketplace notification opens the
  // Marketplace shell (safe metadata browse), not Action Center. Also
  // forward-looking / inert until a generator exists.
  if (c.includes("marketplace") || c.includes("listing") || c.includes("federation")) {
    return "/marketplace";
  }
  // A linked governed Action → Action Center, focused on that action.
  if (n.action_id !== null && n.action_id.length > 0) {
    return `/app/action-center?focus=${encodeURIComponent(n.action_id)}`;
  }
  // Phase OTZAR-RETURN-1 — these branches must land on EMPLOYEE-tree routes
  // (/app/*). The org-admin Control Tower routes (/connector-rails, /workflows,
  // /system-health) live under AuthGuard (can_admin_org); a normal employee
  // clicking such a notification from the employee chrome would hit the hard
  // "Access Denied" screen — a dead-end. Connector issues map to the employee's
  // own Connector Health page; workflow/system/health fall through to the
  // Action Center (the employee Work-OS inbox).
  if (c.includes("connector") || c.includes("oauth") || c.includes("integration"))
    return "/app/connector-health";
  if (c.includes("collab")) return "/app/collaboration";
  if (c.includes("workflow")) return "/app/action-center";
  if (c.includes("meeting") || c.includes("calendar")) return "/app/my-day";
  if (c.includes("system") || c.includes("health")) return "/app/action-center";
  if (c.includes("draft") || c.includes("comms"))
    return "/app/comms";
  if (
    c.includes("approval") ||
    c.includes("escalation") ||
    c.includes("action") ||
    c.includes("dual_control") ||
    c.includes("policy")
  )
    return "/app/action-center";
  // Safe real fallback — the Action Center is the Work-OS inbox.
  return "/app/action-center";
}
