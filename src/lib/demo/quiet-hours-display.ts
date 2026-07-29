// FILE: quiet-hours-display.ts
// PURPOSE: Human-readable quiet hours / working hours from work-profile policy.
// CONNECTS TO: DemoRoleValueCard, Preferences, after-hours policy.

export interface WorkingPolicyView {
  work_start_min?: number;
  work_end_min?: number;
  quiet_start_min?: number;
  quiet_end_min?: number;
  quiet_days?: number[];
  working_days?: number[];
  quiet_permitted_silent_ai?: boolean;
  quiet_notification_exceptions?: string[];
  quiet_escalation_threshold?: string;
}

function clock(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.floor(min)));
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const am = h24 < 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm.toString().padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

/**
 * WHAT: Format quiet hours for primary UI (never raw minute offsets).
 * INPUT: working_policy from /org/me/work-profile.
 * OUTPUT: human sentence or null if not configured.
 */
export function formatQuietHoursHuman(
  policy: WorkingPolicyView | null | undefined,
  timezone?: string | null,
): string | null {
  if (
    policy?.quiet_start_min == null ||
    policy?.quiet_end_min == null ||
    !Number.isFinite(policy.quiet_start_min) ||
    !Number.isFinite(policy.quiet_end_min)
  ) {
    return null;
  }
  const tz = timezone ? ` (${timezone})` : "";
  return `${clock(policy.quiet_start_min)}–${clock(policy.quiet_end_min)}${tz}`;
}

export function formatWorkingHoursHuman(
  policy: WorkingPolicyView | null | undefined,
  timezone?: string | null,
): string | null {
  if (
    policy?.work_start_min == null ||
    policy?.work_end_min == null ||
    !Number.isFinite(policy.work_start_min) ||
    !Number.isFinite(policy.work_end_min)
  ) {
    return null;
  }
  const tz = timezone ? ` (${timezone})` : "";
  return `Mon–Fri ${clock(policy.work_start_min)}–${clock(policy.work_end_min)}${tz}`;
}

/**
 * WHAT: Quiet-hours enforcement decision for a simulated local minute.
 * INPUT: minutes from midnight, policy.
 * OUTPUT: { inQuiet, maySilentAi, suppressNotify }.
 */
export function evaluateQuietAt(
  minutes: number,
  policy: WorkingPolicyView,
): {
  inQuiet: boolean;
  maySilentAi: boolean;
  suppressNotify: boolean;
} {
  const start = policy.quiet_start_min ?? 0;
  const end = policy.quiet_end_min ?? 0;
  let inQuiet = false;
  if (start !== end) {
    if (start < end) inQuiet = minutes >= start && minutes < end;
    else inQuiet = minutes >= start || minutes < end;
  }
  const maySilentAi = !inQuiet || policy.quiet_permitted_silent_ai !== false;
  const suppressNotify = inQuiet;
  return { inQuiet, maySilentAi, suppressNotify };
}
