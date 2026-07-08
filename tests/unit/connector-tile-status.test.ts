// FILE: connector-tile-status.test.ts
// PURPOSE: [CONNECTOR-STATUS] connectorTileStatus prioritizes the tenant's LIVE
//          OAuth connection over the platform adapter's rollout gate — a verified
//          Google connection reads "Connected", never "App review pending" beside
//          a working connection — while never faking verification.

import { describe, expect, it } from "vitest";
import { connectorTileStatus, humanizeStatus } from "@/lib/labels/humanize";

describe("[CONNECTOR-STATUS] connectorTileStatus — live connection wins", () => {
  it("VERIFIED tenant + adapter BLOCKED_BY_APP_REVIEW → 'Connected' primary, app-review as a secondary note", () => {
    const r = connectorTileStatus("BLOCKED_BY_APP_REVIEW", "VERIFIED", true);
    expect(r.label).toBe("Connected");
    expect(r.note).toBe("App review pending for broader rollout");
  });

  it("VERIFIED tenant + fully-configured adapter → 'Connected' with no note (no false claim)", () => {
    const r = connectorTileStatus("CONFIGURED", "VERIFIED", false);
    expect(r.label).toBe("Connected");
    expect(r.note).toBeUndefined();
  });

  it("no tenant connection + adapter BLOCKED_BY_APP_REVIEW → 'App review pending' (never 'Connected')", () => {
    const r = connectorTileStatus("BLOCKED_BY_APP_REVIEW", undefined, true);
    expect(r.label).toBe("App review pending");
    expect(r.note).toBeUndefined();
  });

  it("reconnect / revoked live status → 'Reconnect required' (overrides the adapter gate)", () => {
    expect(connectorTileStatus("BLOCKED_BY_APP_REVIEW", "ERROR_NEEDS_RECONNECT", true).label).toBe("Reconnect required");
    expect(connectorTileStatus("CONFIGURED", "REVOKED", false).label).toBe("Reconnect required");
  });

  it("CONNECTED_UNVERIFIED → 'Connecting…' + verifying note, regardless of adapter gate (calm, not an error, not app-review)", () => {
    const withGate = connectorTileStatus("BLOCKED_BY_APP_REVIEW", "CONNECTED_UNVERIFIED", true);
    expect(withGate.label).toBe("Connecting…");
    expect(withGate.note).toBe("Otzar is verifying this connection.");
    const configured = connectorTileStatus("CONFIGURED", "CONNECTED_UNVERIFIED", false);
    expect(configured.label).toBe("Connecting…");
    expect(configured.note).toBe("Otzar is verifying this connection.");
  });

  it("no live oauth / credentials missing → falls back to the honest adapter status", () => {
    expect(connectorTileStatus("BLOCKED_BY_CREDENTIAL", "READY_FOR_CONSENT", false).label).toBe("Needs credentials");
    expect(connectorTileStatus("BLOCKED_BY_CREDENTIAL", undefined, undefined).label).toBe("Needs credentials");
    expect(connectorTileStatus("BLOCKED_BY_APP_REVIEW", "APP_CREDENTIALS_MISSING", true).label).toBe("App review pending");
  });

  it("does not fake app verification: only a VERIFIED live status yields 'Connected'", () => {
    for (const s of ["CONNECTED_UNVERIFIED", "READY_FOR_CONSENT", "APP_CREDENTIALS_MISSING", "ERROR_NEEDS_RECONNECT", undefined]) {
      expect(connectorTileStatus("BLOCKED_BY_APP_REVIEW", s, true).label).not.toBe("Connected");
    }
  });

  it("existing 'App review pending' wording is still available via humanizeStatus", () => {
    expect(humanizeStatus("BLOCKED_BY_APP_REVIEW")).toBe("App review pending");
  });
});
