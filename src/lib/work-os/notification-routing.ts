// FILE: notification-routing.ts
// PURPOSE: Phase 1266 — turn a notification into a Work-OS destination.
//          Before this, clicking a notification did nothing (or errored).
//          This pure resolver maps a SafeNotificationView to a REAL
//          in-app route: an action/approval → Action Center (focused on
//          the action), connector issues → Connector Rails, collaboration
//          → Collaboration, etc. There is always a safe real fallback
//          (Action Center), so a click never dead-ends and never throws.
// CONNECTS TO: src/components/otzar/NotificationBell.tsx,
//          tests/unit/notification-routing.test.ts.

export interface NotificationTarget {
  action_id: string | null;
  notification_class: string;
}

/** Resolve a notification to a real in-app route. Never returns null —
 *  there is always a safe fallback so the click does something useful. */
export function notificationRoute(n: NotificationTarget): string {
  // A linked governed Action → Action Center, focused on that action.
  if (n.action_id !== null && n.action_id.length > 0) {
    return `/app/action-center?focus=${encodeURIComponent(n.action_id)}`;
  }
  const c = (n.notification_class ?? "").toLowerCase();
  if (c.includes("connector") || c.includes("oauth") || c.includes("integration"))
    return "/connector-rails";
  if (c.includes("collab")) return "/app/collaboration";
  if (c.includes("workflow")) return "/workflows";
  if (c.includes("meeting") || c.includes("calendar")) return "/app/my-day";
  if (c.includes("system") || c.includes("health")) return "/system-health";
  if (c.includes("draft") || c.includes("comms") || c.includes("message"))
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
