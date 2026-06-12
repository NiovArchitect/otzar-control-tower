// FILE: tests/unit/desktop-capabilities.test.ts
// PURPOSE: Phase 1259C locks — the Tauri capability audit stays
//          honest: (1) the desktop CSP allows every runtime path the
//          app claims (blob media/images, localhost API, realtime
//          ws channels) and nothing in the wildcard class; (2) the
//          capability report uses the closed status vocab and never
//          claims WORKS for paths that need a provider, a native
//          plugin, or are still planned (no fake green); (3) the
//          customer copy is humanized — raw enum text never renders.
// CONNECTS TO: src/lib/desktop-capabilities.ts,
//          src-tauri/tauri.conf.json, src/pages/SystemHealth.tsx,
//          tests/unit/premium-tts.test.ts (1259B media-src lock).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  capabilityStatusCopy,
  getDesktopCapabilities,
  type CapabilityStatus,
} from "@/lib/desktop-capabilities";

const STATUSES: CapabilityStatus[] = [
  "WORKS",
  "FALLBACK",
  "NEEDS_NATIVE",
  "NEEDS_PROVIDER",
  "PLANNED",
];

describe("Phase 1259C — Tauri CSP capability locks", () => {
  const conf = readFileSync("src-tauri/tauri.conf.json", "utf8");
  const csp = (JSON.parse(conf) as {
    app: { security: { csp: string } };
  }).app.security.csp;

  it("media-src allows blob: (premium voice playback — the 1259B blocker)", () => {
    expect(csp).toContain("media-src 'self' blob:");
  });

  it("img-src allows data: and blob: (avatars, generated previews)", () => {
    expect(csp).toMatch(/img-src 'self' data: blob:/);
  });

  it("connect-src allows the Foundation API and realtime ws channels", () => {
    expect(csp).toContain("http://localhost:3000");
    expect(csp).toContain("ws://localhost:3000");
    expect(csp).toContain("ws://localhost:4000");
  });

  it("CSP stays strict — no wildcard sources, no unsafe-eval", () => {
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).not.toMatch(/(?:src[^;]*)\s\*\s/);
    expect(csp.split(";").some((d) => d.trim().endsWith(" *"))).toBe(false);
  });
});

describe("Phase 1259C — honest desktop capability report", () => {
  it("reports all nine audited capabilities with closed-vocab statuses", () => {
    const caps = getDesktopCapabilities();
    const ids = caps.map((c) => c.id);
    for (const id of [
      "audio_playback",
      "microphone",
      "screen_capture",
      "file_upload",
      "clipboard",
      "os_notifications",
      "external_links",
      "oauth_callbacks",
      "live_streams",
    ]) {
      expect(ids).toContain(id);
    }
    for (const c of caps) {
      expect(STATUSES).toContain(c.status);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(0);
    }
  });

  it("no fake green — planned and provider-gated paths never claim WORKS", () => {
    const caps = getDesktopCapabilities();
    const byId = new Map(caps.map((c) => [c.id, c]));
    // OAuth deep-link return and BEAM realtime streams do not exist
    // in the runtime yet — they must stay PLANNED until wired.
    expect(byId.get("oauth_callbacks")?.status).toBe("PLANNED");
    expect(byId.get("live_streams")?.status).toBe("PLANNED");
    // Screen capture has no governed pipeline yet — never WORKS.
    expect(byId.get("screen_capture")?.status).not.toBe("WORKS");
    // Microphone needs a streaming STT provider — never plain WORKS.
    expect(byId.get("microphone")?.status).not.toBe("WORKS");
  });

  it("verified runtime paths report WORKS (audio after the CSP fix, files, links)", () => {
    const byId = new Map(getDesktopCapabilities().map((c) => [c.id, c]));
    expect(byId.get("audio_playback")?.status).toBe("WORKS");
    expect(byId.get("file_upload")?.status).toBe("WORKS");
    expect(byId.get("external_links")?.status).toBe("WORKS");
  });

  it("status copy is exhaustive and humanized — raw enum text never renders", () => {
    for (const status of STATUSES) {
      const copy = capabilityStatusCopy[status];
      expect(copy.length).toBeGreaterThan(0);
      expect(copy).not.toContain("_");
      expect(copy).not.toBe(status);
    }
  });

  it("notes never expose secrets or raw key values", () => {
    for (const c of getDesktopCapabilities()) {
      expect(c.note).not.toMatch(/sk-[A-Za-z0-9]/);
      expect(c.note).not.toMatch(/api[_ ]key/i);
    }
  });
});

describe("Phase 1259C — System Health renders the capability truth", () => {
  it("SystemHealth consumes getDesktopCapabilities with humanized status badges", () => {
    const src = readFileSync("src/pages/SystemHealth.tsx", "utf8");
    expect(src).toContain("getDesktopCapabilities");
    expect(src).toContain("capabilityStatusCopy[cap.status]");
    expect(src).toContain('data-testid="system-health-capability-row"');
    // The raw status enum must never be interpolated directly.
    expect(src).not.toContain("{cap.status}</Badge>");
  });
});
