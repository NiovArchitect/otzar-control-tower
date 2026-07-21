import { describe, expect, it } from "vitest";
import {
  resumeProviderIntent,
  calendarDateIsAllowed,
  summarizeProviderIntents,
  type CalendarIntent,
  type DocumentIntent,
  type ProviderIntent,
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
    expect(r.action).toBe("RECONCILE_EXISTING");
    expect(r.intent.status).toBe("EXECUTED");
    expect(r.intent.provider_object_id).toBe("gcal-1");
  });

  it("already executed document: reconnect does not re-create", () => {
    const executed: DocumentIntent = {
      ...doc,
      status: "EXECUTED",
      provider_object_id: "gdoc-1",
    };
    const r = resumeProviderIntent(executed, { type: "DUPLICATE_RECONNECT" });
    expect(r.action).toBe("RECONCILE_EXISTING");
    expect(r.intent.status).toBe("EXECUTED");
    expect(r.intent.provider_object_id).toBe("gdoc-1");
  });

  it("already executed calendar: reconnect does not re-create", () => {
    const executed: CalendarIntent = {
      ...cal,
      status: "EXECUTED",
      provider_object_id: "gcal-1",
    };
    const r = resumeProviderIntent(executed, { type: "AUTH_AVAILABLE" });
    expect(r.action).toBe("RECONCILE_EXISTING");
    expect(r.intent.status).toBe("EXECUTED");
    expect(r.intent.provider_object_id).toBe("gcal-1");
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

  it("waiting auth stays waiting without capability signal", () => {
    // No AUTH_AVAILABLE → simulate unknown event path via AUTH_REVOKED then check
    const waiting = { ...doc, status: "WAITING_FOR_PROVIDER_AUTH" as const };
    // Project change while waiting re-validates, still not EXECUTED
    const r = resumeProviderIntent(waiting, {
      type: "PROJECT_CHANGED",
      project_id: "proj-2",
    });
    expect(r.intent.status).toBe("WAITING_FOR_PROVIDER_AUTH");
    expect(r.action).toBe("SUPERSEDE");
  });

  it("ready to execute on auth available executes once", () => {
    const r = resumeProviderIntent(
      { ...doc, status: "READY_TO_EXECUTE" },
      { type: "AUTH_AVAILABLE" },
    );
    expect(r.action).toBe("EXECUTE_ONCE");
    expect(r.intent.status).toBe("READY_TO_EXECUTE");
  });

  it("executing does not start another provider mutation on auth", () => {
    const r = resumeProviderIntent(
      { ...doc, status: "EXECUTING" },
      { type: "AUTH_AVAILABLE" },
    );
    expect(r.action).toBe("WAIT");
    expect(r.intent.status).toBe("EXECUTING");
  });

  it("blocked advances when auth available", () => {
    const r = resumeProviderIntent(
      { ...doc, status: "BLOCKED" },
      { type: "AUTH_AVAILABLE" },
    );
    expect(r.action).toBe("EXECUTE_ONCE");
    expect(r.intent.status).toBe("READY_TO_EXECUTE");
  });

  it("owner change on pending document waits for re-validation", () => {
    const r = resumeProviderIntent(doc, {
      type: "OWNER_CHANGED",
      owner_entity_id: "owner-2",
    });
    expect(r.action).toBe("WAIT");
    expect(r.intent.status).toBe("WAITING_FOR_PROVIDER_AUTH");
    if (r.intent.kind === "DOCUMENT") {
      expect(r.intent.owner_entity_id).toBe("owner-2");
    }
  });

  it("owner change on EXECUTED document reconciles without re-create", () => {
    const executed: DocumentIntent = {
      ...doc,
      status: "EXECUTED",
      provider_object_id: "gdoc-1",
    };
    const r = resumeProviderIntent(executed, {
      type: "OWNER_CHANGED",
      owner_entity_id: "owner-2",
    });
    expect(r.action).toBe("RECONCILE_EXISTING");
    expect(r.intent.status).toBe("EXECUTED");
    if (r.intent.kind === "DOCUMENT") {
      expect(r.intent.owner_entity_id).toBe("owner-2");
      expect(r.intent.provider_object_id).toBe("gdoc-1");
    }
  });

  it("mixed batch summary counts all states without re-executing EXECUTED", () => {
    const batch: ProviderIntent[] = [
      { ...doc, idempotency_key: "d-exec", status: "EXECUTED", provider_object_id: "g1" },
      { ...doc, idempotency_key: "d-wait", status: "WAITING_FOR_PROVIDER_AUTH" },
      { ...doc, idempotency_key: "d-ready", status: "READY_TO_EXECUTE" },
      { ...doc, idempotency_key: "d-run", status: "EXECUTING" },
      { ...doc, idempotency_key: "d-block", status: "BLOCKED" },
      { ...cal, idempotency_key: "c-sup", status: "SUPERSEDED" },
      { ...cal, idempotency_key: "c-can", status: "CANCELLED" },
    ];
    const s = summarizeProviderIntents(batch);
    expect(s.total).toBe(7);
    expect(s.executed).toBe(1);
    expect(s.waiting_auth).toBe(1);
    expect(s.ready).toBe(1);
    expect(s.executing).toBe(1);
    expect(s.blocked).toBe(1);
    expect(s.superseded).toBe(1);
    expect(s.cancelled).toBe(1);
    expect(s.resumable).toBe(3); // waiting + blocked + ready

    // EXECUTED in batch: reconnect must not re-create
    const exec = batch[0]!;
    const r = resumeProviderIntent(exec, { type: "DUPLICATE_RECONNECT" });
    expect(r.intent.status).toBe("EXECUTED");
    expect(r.action).not.toBe("EXECUTE_ONCE");
  });

  it("lost response after EXECUTING reconciles to EXECUTED without duplicate path", () => {
    const inflight: CalendarIntent = {
      ...cal,
      status: "EXECUTING",
    };
    const r = resumeProviderIntent(inflight, {
      type: "RESPONSE_LOST_AFTER_SUCCESS",
      provider_object_id: "gcal-recover",
    });
    expect(r.action).toBe("RECONCILE_EXISTING");
    expect(r.intent.status).toBe("EXECUTED");
    expect(r.intent.provider_object_id).toBe("gcal-recover");
  });
});
