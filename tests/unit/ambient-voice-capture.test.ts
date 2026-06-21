// FILE: tests/unit/ambient-voice-capture.test.ts
// PURPOSE: Phase OTZAR-RETURN-3 — lock the ambient voice capture readiness
//          model: honest copy (no local/on-device STT, transcript text only),
//          future wearables represented as planned-only, deterministic intent
//          routing, and a transcript-only capture event (never raw audio).
// CONNECTS TO: src/lib/voice/ambient-voice-capture.ts.

import { describe, expect, it } from "vitest";
import {
  describeAmbientVoiceMode,
  inferVoiceIntentRoute,
  createAmbientVoiceCaptureEvent,
  ambientVoiceDeviceOptions,
  ambientVoiceRouteLabel,
} from "@/lib/voice/ambient-voice-capture";

describe("describeAmbientVoiceMode — honest capture copy", () => {
  it("1. browser STT ready says transcript text only and never claims local/on-device", () => {
    const copy = describeAmbientVoiceMode({
      device_mode: "desktop_browser",
      capture_mode: "browser_stt",
      status: "ready",
      browserRecognitionSupported: true,
    });
    expect(copy).toMatch(/transcript text only/i);
    expect(copy).toMatch(/never raw audio/i);
    expect(copy.toLowerCase()).not.toContain("local");
    expect(copy.toLowerCase()).not.toContain("on-device");
    expect(copy.toLowerCase()).not.toContain("on device");
  });

  it("2. text-only mode is honest", () => {
    const copy = describeAmbientVoiceMode({
      device_mode: "desktop_browser",
      capture_mode: "text_only",
      status: "unsupported",
    });
    expect(copy).toMatch(/text mode is active/i);
    expect(copy).toMatch(/unavailable/i);
  });

  it("3. provider-blocked mode is honest", () => {
    const copy = describeAmbientVoiceMode({
      device_mode: "desktop_browser",
      capture_mode: "browser_stt",
      status: "provider_blocked",
    });
    expect(copy).toMatch(/blocked by the speech provider/i);
    expect(copy).toMatch(/text mode is active/i);
  });

  it("4. future wearable modes never claim a connected device", () => {
    for (const device_mode of ["earphones_future", "glasses_future", "lenses_future", "goggles_future"] as const) {
      const copy = describeAmbientVoiceMode({
        device_mode,
        capture_mode: "wearable_future",
        status: "future_device_not_connected",
      });
      expect(copy).toMatch(/planned/i);
      expect(copy).toMatch(/no wearable device is connected/i);
      expect(copy.toLowerCase()).not.toMatch(/(earphones|glasses|lenses|goggles) connected/);
      expect(copy.toLowerCase()).not.toContain("always listening");
    }
  });

  it("desktop mic future is honest about no background listening", () => {
    const copy = describeAmbientVoiceMode({
      device_mode: "desktop_app",
      capture_mode: "desktop_mic_future",
      status: "future_device_not_connected",
    });
    expect(copy).toMatch(/planned for tray\/app mode/i);
    expect(copy).toMatch(/without enabling background listening/i);
  });
});

describe("createAmbientVoiceCaptureEvent — transcript-only, never audio", () => {
  it("5. always sets audio_sent_to_otzar to false", () => {
    const ev = createAmbientVoiceCaptureEvent({
      transcript: "remind me tomorrow",
      device_mode: "desktop_browser",
      capture_mode: "browser_stt",
      status: "ready",
      created_at: "2026-06-21T00:00:00.000Z",
    });
    expect(ev.audio_sent_to_otzar).toBe(false);
  });

  it("6. always sets otzar_receives to transcript_text_only", () => {
    const ev = createAmbientVoiceCaptureEvent({
      transcript: "hello",
      device_mode: "desktop_browser",
      capture_mode: "browser_stt",
      status: "ready",
      created_at: "2026-06-21T00:00:00.000Z",
    });
    expect(ev.otzar_receives).toBe("transcript_text_only");
    expect(ev.event_schema).toBe("OTZAR_AMBIENT_VOICE_CAPTURE_EVENT");
    expect(ev.schema_version).toBe("0.1");
    expect(ev.confidence).toBe("deterministic_local_hint");
  });

  it("7. empty transcript → transcript_present false and intended_route unknown", () => {
    const ev = createAmbientVoiceCaptureEvent({
      transcript: "   ",
      device_mode: "desktop_browser",
      capture_mode: "text_only",
      status: "unsupported",
      created_at: "2026-06-21T00:00:00.000Z",
    });
    expect(ev.transcript_present).toBe(false);
    expect(ev.transcript_text).toBe("");
    expect(ev.intended_route).toBe("unknown");
  });

  it("an explicit route_hint wins over inference when a transcript is present", () => {
    const ev = createAmbientVoiceCaptureEvent({
      transcript: "this looks like chat",
      device_mode: "desktop_browser",
      capture_mode: "browser_stt",
      status: "ready",
      route_hint: "approval",
      created_at: "2026-06-21T00:00:00.000Z",
    });
    expect(ev.intended_route).toBe("approval");
  });

  it("defaults provider_note to null and never carries raw-audio fields", () => {
    const ev = createAmbientVoiceCaptureEvent({
      transcript: "hello",
      device_mode: "desktop_browser",
      capture_mode: "browser_stt",
      status: "ready",
      created_at: "2026-06-21T00:00:00.000Z",
    });
    expect(ev.provider_note).toBeNull();
    expect(Object.keys(ev)).not.toContain("audio");
    expect(Object.keys(ev)).not.toContain("audio_blob");
    expect(Object.keys(ev)).not.toContain("waveform");
  });
});

describe("inferVoiceIntentRoute — deterministic local routing", () => {
  it("8. 'ask twin' routes to ask_twin (before chat)", () => {
    expect(inferVoiceIntentRoute("ask twin what I committed to")).toBe("ask_twin");
    expect(inferVoiceIntentRoute("ask my twin about pricing")).toBe("ask_twin");
  });

  it("9. reply/send/tell/email route to comms", () => {
    expect(inferVoiceIntentRoute("reply to David")).toBe("comms");
    expect(inferVoiceIntentRoute("send a message to Sadeil")).toBe("comms");
    expect(inferVoiceIntentRoute("tell the team we shipped")).toBe("comms");
    expect(inferVoiceIntentRoute("email finance")).toBe("comms");
  });

  it("10. approve/decline route to approval", () => {
    expect(inferVoiceIntentRoute("approve the budget")).toBe("approval");
    expect(inferVoiceIntentRoute("decline that request")).toBe("approval");
  });

  it("11. 'remind me' routes to reminder (before action_runtime)", () => {
    expect(inferVoiceIntentRoute("remind me to follow up tomorrow")).toBe("reminder");
    expect(inferVoiceIntentRoute("set a reminder for the review")).toBe("reminder");
  });

  it("12. task/complete/follow up route to action_runtime", () => {
    expect(inferVoiceIntentRoute("create a task for the deck")).toBe("action_runtime");
    expect(inferVoiceIntentRoute("mark this complete")).toBe("action_runtime");
    expect(inferVoiceIntentRoute("follow up with the vendor")).toBe("action_runtime");
  });

  it("13. capture this / note route to note_capture", () => {
    expect(inferVoiceIntentRoute("note: the contract renews in Q3")).toBe("note_capture");
    expect(inferVoiceIntentRoute("capture this for later")).toBe("note_capture");
  });

  it("14. an unmatched transcript routes to chat", () => {
    expect(inferVoiceIntentRoute("how are things going")).toBe("chat");
  });

  it("empty transcript routes to unknown", () => {
    expect(inferVoiceIntentRoute("")).toBe("unknown");
    expect(inferVoiceIntentRoute("   ")).toBe("unknown");
  });
});

describe("ambientVoiceDeviceOptions — future devices are planned-only", () => {
  it("16. earphones/glasses/lenses/goggles are present and marked planned (never current)", () => {
    const options = ambientVoiceDeviceOptions();
    const byMode = new Map(options.map((o) => [o.mode, o]));
    for (const mode of ["earphones_future", "glasses_future", "lenses_future", "goggles_future"] as const) {
      const opt = byMode.get(mode);
      expect(opt).toBeDefined();
      expect(opt?.availability).toBe("planned");
      expect(opt?.honest_status.toLowerCase()).toContain("planned");
      expect(opt?.honest_status.toLowerCase()).toContain("not connected");
    }
    // Current devices exist and are honest.
    expect(byMode.get("desktop_browser")?.availability).toBe("current");
    expect(byMode.get("desktop_app")?.availability).toBe("current");
  });
});

describe("model output is free of AVP²/Federation references", () => {
  it("15. no AVP²/Federation/protocol strings appear in any model output", () => {
    const blob = JSON.stringify({
      event: createAmbientVoiceCaptureEvent({
        transcript: "ask twin about the roadmap",
        device_mode: "desktop_browser",
        capture_mode: "browser_stt",
        status: "ready",
        created_at: "2026-06-21T00:00:00.000Z",
      }),
      devices: ambientVoiceDeviceOptions(),
      copies: [
        describeAmbientVoiceMode({ device_mode: "desktop_browser", capture_mode: "browser_stt", status: "ready" }),
        describeAmbientVoiceMode({ device_mode: "earphones_future", capture_mode: "wearable_future", status: "future_device_not_connected" }),
        describeAmbientVoiceMode({ device_mode: "desktop_browser", capture_mode: "text_only", status: "provider_blocked" }),
      ],
      labels: (["chat", "ask_twin", "comms", "approval", "action_runtime", "note_capture", "reminder", "unknown"] as const).map(ambientVoiceRouteLabel),
    }).toLowerCase();
    expect(blob).not.toContain("avp");
    expect(blob).not.toContain("federation");
    expect(blob).not.toContain("cosmp");
    expect(blob).not.toContain("foundation");
    expect(blob).not.toContain("protocol");
  });
});
