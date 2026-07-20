// FILE: tests/unit/outbound-mail-honesty.test.ts
// PURPOSE: N-05 — draft vs provider-accepted vs delivered honesty.

import { describe, expect, it } from "vitest";
import {
  claimsFalseMailCompletion,
  classifyOutboundMailState,
  isExternalMailChannel,
  isMailSendBridgeWired,
  outboundMailOutcomeCopy,
  outboundMailRuntimeNote,
  outboundMailStatusLabel,
} from "@/lib/work-os/outbound-mail-honesty";
import { isExplicitExternalEmailIntent } from "@/lib/work-os/ambient-outbound";
import { classifyVoiceAction } from "@/lib/voice/voice-action-runtime";
import type { AuthCapabilities } from "@/lib/stores/auth";

const EMPLOYEE: AuthCapabilities = {
  can_read_capsules: true,
  can_write_capsules: true,
  can_share_capsules: false,
  can_admin_org: false,
  can_admin_niov: false,
};

describe("N-05 outbound mail honesty", () => {
  it("detects email/gmail channels", () => {
    expect(isExternalMailChannel("email")).toBe(true);
    expect(isExternalMailChannel("gmail")).toBe(true);
    expect(isExternalMailChannel("internal")).toBe(false);
    expect(isMailSendBridgeWired("gmail")).toBe(false);
  });

  it("not_wired when send bridge missing", () => {
    const s = classifyOutboundMailState({
      channel: "gmail",
      sendBridgeWired: false,
    });
    expect(s).toBe("not_wired");
    expect(outboundMailStatusLabel(s)).toMatch(/not wired|draft/i);
    expect(outboundMailRuntimeNote(s).toLowerCase()).toMatch(
      /never auto-sent|not delivered|local draft/,
    );
    expect(outboundMailOutcomeCopy(s).toLowerCase()).toMatch(
      /not sent|not delivered|draft/,
    );
  });

  it("provider_accepted ≠ delivered", () => {
    const s = classifyOutboundMailState({
      channel: "email",
      sendBridgeWired: true,
      providerAccepted: true,
      delivered: false,
    });
    expect(s).toBe("provider_accepted");
    expect(outboundMailStatusLabel(s)).toMatch(/accepted|not confirmed/i);
    expect(
      claimsFalseMailCompletion("Email delivered to inbox", s),
    ).toBe(true);
    expect(
      claimsFalseMailCompletion(
        "Provider accepted. Delivery is not confirmed.",
        s,
      ),
    ).toBe(false);
  });

  it("provider_rejected never claims delivered", () => {
    const s = classifyOutboundMailState({
      channel: "email",
      sendBridgeWired: true,
      providerAccepted: false,
    });
    expect(s).toBe("provider_rejected");
    expect(outboundMailOutcomeCopy(s).toLowerCase()).toMatch(/rejected|not delivered/);
  });

  it("delivered only when delivery confirmed", () => {
    const s = classifyOutboundMailState({
      channel: "gmail",
      sendBridgeWired: true,
      providerAccepted: true,
      delivered: true,
    });
    expect(s).toBe("delivered");
    expect(claimsFalseMailCompletion("Email delivered (confirmed).", s)).toBe(
      false,
    );
  });

  it("draft path rejects false 'sent' claims", () => {
    const s = classifyOutboundMailState({
      channel: "email",
      sendBridgeWired: false,
    });
    expect(claimsFalseMailCompletion("Message sent to David", s)).toBe(true);
    expect(
      claimsFalseMailCompletion(
        "Draft created. External email is not sent. Nothing was delivered.",
        s,
      ),
    ).toBe(false);
  });

  it("Email <Name> is external email intent (not ambient one-shot)", () => {
    expect(
      isExplicitExternalEmailIntent(
        "Email David that the launch is Friday and ask him to confirm the deck.",
      ),
    ).toBe(true);
    expect(isExplicitExternalEmailIntent("Ask David to review this.")).toBe(
      false,
    );
  });

  it("classifyVoiceAction routes Email Name to email connector draft", () => {
    const a = classifyVoiceAction(
      "Email David that the launch is Friday and ask him to confirm the deck.",
      EMPLOYEE,
    );
    expect(a.kind).toBe("SEND_REQUIRES_APPROVAL");
    expect(a.connector).toBe("email");
    expect(a.isExternalWrite).toBe(true);
    expect(a.needsConfirmation).toBe(true);
    expect(a.spoken.toLowerCase()).toMatch(/not sent|draft|not wired|not delivered/);
  });
});
