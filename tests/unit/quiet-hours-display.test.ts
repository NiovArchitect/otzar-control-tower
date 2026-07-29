import { describe, expect, it } from "vitest";
import {
  formatQuietHoursHuman,
  formatWorkingHoursHuman,
  evaluateQuietAt,
} from "@/lib/demo/quiet-hours-display";

describe("quiet-hours-display", () => {
  const pol = {
    work_start_min: 540,
    work_end_min: 1050,
    quiet_start_min: 1140,
    quiet_end_min: 420,
    quiet_permitted_silent_ai: true,
  };
  it("formats human times without raw minutes", () => {
    const q = formatQuietHoursHuman(pol, "America/New_York");
    expect(q).toMatch(/PM|AM/);
    expect(q).not.toMatch(/1140/);
    expect(formatWorkingHoursHuman(pol)).toMatch(/Mon/);
  });
  it("evaluates wrap quiet hours", () => {
    expect(evaluateQuietAt(20 * 60, pol).inQuiet).toBe(true);
    expect(evaluateQuietAt(10 * 60, pol).inQuiet).toBe(false);
    expect(evaluateQuietAt(20 * 60, pol).suppressNotify).toBe(true);
  });
});
