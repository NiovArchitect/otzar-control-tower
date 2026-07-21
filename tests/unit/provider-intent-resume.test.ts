import { describe, expect, it } from "vitest";
import {
  resumeProviderIntent,
  calendarDateIsAllowed,
  type CalendarIntent,
  type DocumentIntent,
} from "../../src/lib/org/provider-intent-resume";

const cal: CalendarIntent = {
  kind: "CALENDAR",
  idempotency_key: "cal-1",
  project_id: "proj",
  status: "WAITING_FOR_PROVIDER_AUTH",
  final_date: "2026-09-18",
  rejected_dates: ["2026-09-11"],
  attendees: ["a", "b"],
};

const doc: DocumentIntent = {
  kind: "DOCUMENT",
  idempotency_key: "doc-1",
  project_id: "proj",
  status: "WAITING_FOR_PROVIDER_AUTH",
  owner_entity_id: "owner-1",
};

describe("provider intent resume", () => {
  it("auth available executes once", () => {
    const r = resumeProviderIntent(cal, { type: "AUTH_AVAILABLE" });
    expect(r.action).toBe("EXECUTE_ONCE");
    expect(r.intent.status).toBe("READY_TO_EXECUTE");
  });
  it("duplicate reconnect after success skips create", () => {
    const done = resumeProviderIntent(cal, {
      type: "PROVIDER_SUCCESS",
      provider_object_id: "gcal-1",
    });
    const r = resumeProviderIntent(done.intent, { type: "DUPLICATE_RECONNECT" });
    expect(r.action).toBe("SKIP_ALREADY_DONE");
  });
  it("date supersede rejects old final", () => {
    const r = resumeProviderIntent(cal, {
      type: "DATE_SUPERSEDED",
      new_final_date: "2026-09-25",
    });
    expect(r.action).toBe("SUPERSEDE");
    if (r.intent.kind === "CALENDAR") {
      expect(r.intent.final_date).toBe("2026-09-25");
      expect(r.intent.rejected_dates).toContain("2026-09-18");
      expect(calendarDateIsAllowed(r.intent, "2026-09-11")).toBe(false);
      expect(calendarDateIsAllowed(r.intent, "2026-09-25")).toBe(true);
    }
  });
  it("auth revoke returns to waiting", () => {
    const r = resumeProviderIntent(
      { ...doc, status: "READY_TO_EXECUTE" },
      { type: "AUTH_REVOKED" },
    );
    expect(r.intent.status).toBe("WAITING_FOR_PROVIDER_AUTH");
    expect(r.action).toBe("BLOCK");
  });
  it("response lost after success reconciles", () => {
    const r = resumeProviderIntent(cal, {
      type: "RESPONSE_LOST_AFTER_SUCCESS",
      provider_object_id: "gcal-9",
    });
    expect(r.action).toBe("RECONCILE_EXISTING");
    expect(r.intent.status).toBe("EXECUTED");
  });
  it("rejected date never allowed as current", () => {
    expect(calendarDateIsAllowed(cal, "2026-09-11")).toBe(false);
    expect(calendarDateIsAllowed(cal, "2026-09-18")).toBe(true);
  });
});
