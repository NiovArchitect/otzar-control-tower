// FILE: message-compose.test.ts
// PURPOSE: Lock intent→professional draft transformation. Instructions to
//          Otzar must never become the recipient-facing body verbatim.
// CONNECTS TO: src/lib/work-os/message-compose.ts

import { describe, expect, it } from "vitest";
import {
  composeMessageFromInstruction,
  detectWordingMode,
  looksLikeInstructionToOtzar,
  resolveDraftBody,
  stripDiscourseMarkers,
} from "@/lib/work-os/message-compose";
import { interpretAmbientOutboundWork } from "@/lib/work-os/ambient-outbound";
import { classifyVoiceAction } from "@/lib/voice/voice-action-runtime";
import type { AuthCapabilities } from "@/lib/stores/auth";

const EMPLOYEE = {
  role: "EMPLOYEE",
  can_admin: false,
} as AuthCapabilities;

describe("stripDiscourseMarkers", () => {
  it("strips Yes/Ok affirmations to Otzar", () => {
    expect(stripDiscourseMarkers("Yes, ping David for a status update")).toBe(
      "ping David for a status update",
    );
    expect(stripDiscourseMarkers("Okay. Ask Samiksha for an update.")).toBe(
      "Ask Samiksha for an update.",
    );
  });
});

describe("detectWordingMode", () => {
  it("exact dictation cues", () => {
    expect(
      detectWordingMode('Send David exactly: "Are we done?"'),
    ).toBe("EXACT");
    expect(
      detectWordingMode('Tell David exactly: "We need the update today."'),
    ).toBe("EXACT");
  });

  it("colon + quoted body is EXACT (user-provided wording)", () => {
    expect(detectWordingMode('Tell David: "Where are we on repo access?"')).toBe(
      "EXACT",
    );
  });

  it("colon without quotes is USER_DRAFT", () => {
    expect(detectWordingMode("Tell David: Where are we on repo access?")).toBe(
      "USER_DRAFT",
    );
  });

  it("plain instruction is INTENT", () => {
    expect(detectWordingMode("Ping David for a status update")).toBe("INTENT");
    expect(detectWordingMode("Yes, ping David for a status update")).toBe(
      "INTENT",
    );
  });
});

describe("composeMessageFromInstruction — founder defect", () => {
  it("does not forward 'Yes ping david for a status update' as the body", () => {
    const heard = "Yes, ping David for a status update";
    const c = composeMessageFromInstruction({
      instruction: heard,
      recipient: "David",
      extractedBody: "Yes, ping David for a status update",
    });
    expect(c.body.toLowerCase()).not.toContain("ping david");
    expect(c.body.toLowerCase()).not.toBe(heard.toLowerCase());
    expect(c.body).toMatch(/Hi David/i);
    expect(c.body.toLowerCase()).toMatch(/status update|quick update/);
    expect(c.transformed).toBe(true);
    expect(c.purpose.toLowerCase()).toMatch(/status update/);
  });

  it("composes professional status dimensions", () => {
    const c = composeMessageFromInstruction({
      instruction: "Ping David for a status update",
      recipient: "David",
    });
    expect(c.body).toMatch(/what is complete/i);
    expect(c.body).toMatch(/blocked/i);
    expect(c.body).toMatch(/need from me/i);
  });

  it("includes topic when present", () => {
    const c = composeMessageFromInstruction({
      instruction: "Ping David for a status update on repo access",
      recipient: "David",
      extractedBody: "for a status update on repo access",
    });
    expect(c.body.toLowerCase()).toContain("repo access");
    expect(c.purpose.toLowerCase()).toContain("repo access");
  });

  it("preserves exact dictation", () => {
    const c = composeMessageFromInstruction({
      instruction: 'Send David exactly: "Are we done?"',
      recipient: "David",
    });
    expect(c.mode).toBe("EXACT");
    expect(c.body).toMatch(/Are we done\??/);
    expect(c.transformed).toBe(false);
  });
});

describe("resolveDraftBody — never falls back to raw heard", () => {
  it("replaces instruction-like draftPayload", () => {
    const r = resolveDraftBody({
      heard: "Yes ping david for a status update",
      recipient: "David",
      draftPayload: "Yes ping david for a status update",
    });
    expect(r.body.toLowerCase()).not.toContain("ping david");
    expect(looksLikeInstructionToOtzar(r.body)).toBe(false);
  });

  it("keeps genuine content payload", () => {
    const r = resolveDraftBody({
      heard: "Tell David good morning and looking forward to the demo.",
      recipient: "David",
      draftPayload: "Good morning and looking forward to the demo.",
    });
    expect(r.body.toLowerCase()).toContain("good morning");
  });
});

describe("ambient-outbound — ping / Yes discourse", () => {
  it("Yes, ping David for a status update → professional draft, not verbatim", () => {
    const p = interpretAmbientOutboundWork(
      "Yes, ping David for a status update",
    );
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("INTERNAL_MESSAGE");
    expect(p!.recipient).toBe("David");
    expect(p!.recipientFacingMessage.toLowerCase()).not.toContain("ping");
    expect(p!.recipientFacingMessage.toLowerCase()).not.toBe(
      "yes, ping david for a status update",
    );
    expect(p!.recipientFacingMessage).toMatch(/David/i);
    expect(p!.recipientFacingMessage.toLowerCase()).toMatch(
      /status update|quick update/,
    );
  });

  it("Ping David for an update → composed", () => {
    const p = interpretAmbientOutboundWork("Ping David for an update.");
    expect(p!.recipientFacingMessage.toLowerCase()).not.toContain("ping");
    expect(p!.recipientFacingMessage).toMatch(/update/i);
  });
});

describe("voice-action-runtime — ping path draftPayload", () => {
  it("ping David for a status update does not put the command in draftPayload", () => {
    const a = classifyVoiceAction(
      "Yes, ping David for a status update",
      EMPLOYEE,
    );
    expect(a.kind).toBe("SEND_REQUIRES_APPROVAL");
    expect(a.targetEntity).toBe("David");
    expect(a.draftPayload).toBeDefined();
    expect(a.draftPayload!.toLowerCase()).not.toContain("ping david");
    expect(a.draftPayload!.toLowerCase()).not.toMatch(/^yes/);
    expect(a.draftPayload!.toLowerCase()).toMatch(/status update|quick update/);
  });

  it("exact dictation preserves content", () => {
    const a = classifyVoiceAction(
      'Send David exactly: "Are we done?"',
      EMPLOYEE,
    );
    // May be SEND_REQUIRES_APPROVAL or DRAFT depending on "send" path.
    // Body must preserve exact wording when draftPayload is set.
    if (a.draftPayload !== undefined) {
      expect(a.draftPayload).toMatch(/Are we done/);
    }
  });

  it("Tell David good morning still delivers content, not a status template", () => {
    const a = classifyVoiceAction(
      "Tell David I said good morning and looking forward to seeing his progress on what he is working on.",
      EMPLOYEE,
    );
    expect(a.draftPayload?.toLowerCase()).toContain("good morning");
    expect(a.draftPayload?.toLowerCase()).not.toContain("tell david");
  });
});
