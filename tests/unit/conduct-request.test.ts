// FILE: tests/unit/conduct-request.test.ts
// PURPOSE: [OTZAR-CONTINUITY] The governed conduct-request builder helpers — stable ids used
//          across text/voice/ambient, and the client-minted conversation id that makes a
//          first-turn response loss recoverable.

import { describe, expect, it } from "vitest";
import { buildConductRequest, newConversationId, newRequestId } from "@/lib/otzar/conduct-request";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("conduct-request builder", () => {
  it("newConversationId mints a well-formed, unique UUID (known BEFORE the first server response)", () => {
    const a = newConversationId();
    const b = newConversationId();
    expect(a).toMatch(UUID_RE);
    expect(b).toMatch(UUID_RE);
    expect(a).not.toBe(b);
  });

  it("newRequestId mints a stable, charset-safe id", () => {
    const id = newRequestId();
    expect(id.startsWith("ct-")).toBe(true);
    expect(id).toMatch(/^[A-Za-z0-9._:-]{1,200}$/);
  });

  it("buildConductRequest attaches request_id, client_timezone, and conversation_id when supplied", () => {
    const body = buildConductRequest({ message: "hi", requestId: "ct-1", conversationId: "conv-1" });
    expect(body.message).toBe("hi");
    expect(body.request_id).toBe("ct-1");
    expect(body.conversation_id).toBe("conv-1");
    // client_timezone is attached when the runtime resolves one (jsdom typically does).
    if (body.client_timezone !== undefined) expect(typeof body.client_timezone).toBe("string");
  });

  it("buildConductRequest omits conversation_id when null/absent (ambient path keeps org-wide scope)", () => {
    const body = buildConductRequest({ message: "hi", requestId: "ct-2", conversationId: null });
    expect("conversation_id" in body).toBe(false);
  });
});
