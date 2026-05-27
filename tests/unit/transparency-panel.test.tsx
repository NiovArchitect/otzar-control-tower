// FILE: tests/unit/transparency-panel.test.tsx
// PURPOSE: Tests for the Wave 1 chat TransparencyPanel. Verifies the
//          governed transparency + provenance render in friendly,
//          product-safe language; access_limited is a neutral message
//          (no count); raw ids / substrate tokens / chain-of-thought
//          never leak.
// CONNECTS TO: src/components/employee/TransparencyPanel.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransparencyPanel } from "@/components/employee/TransparencyPanel";
import type {
  ChatTransparency,
  ContextProvenanceItem,
} from "@/lib/types/foundation";

const transparency: ChatTransparency = {
  context_items_used: 2,
  items_skipped_low_relevance: 1,
  items_skipped_budget: 2,
  access_limited: true,
  retrieval_status: "USED",
  retrieval_source: "COE_ASSEMBLE_CONTEXT",
  retrieval_reason: "Matched recent decisions relevant to your message.",
  memory_updated: false,
  tool_calls: [],
  approval_required: false,
  verification_status: "NOT_ACTIVE",
};

const provenance: ContextProvenanceItem[] = [
  {
    context_id: "ctx-0001",
    title: "Q4 pricing decision",
    source_type: "DECISION",
    scope: "ENTERPRISE",
    content_available: true,
    reason: "High relevance to your question.",
    tokens_used: 120,
  },
  {
    context_id: "ctx-0002",
    title: null,
    source_type: "COE_ASSEMBLE_CONTEXT",
    scope: "UNKNOWN",
    content_available: false,
    reason: "Summarized for focus.",
  },
];

describe("TransparencyPanel", () => {
  it("renders friendly transparency fields", () => {
    render(
      <TransparencyPanel transparency={transparency} provenance={provenance} />,
    );
    const panel = screen.getByTestId("transparency-panel");
    expect(panel).toHaveTextContent(/Context used/);
    expect(panel).toHaveTextContent(/Governed context layer/);
    expect(panel).toHaveTextContent(/Matched recent decisions/);
    expect(panel).toHaveTextContent(/Filtered out as not relevant/);
    expect(panel).toHaveTextContent(/Held back to keep the response focused/);
  });

  it("renders the friendly access-limited message, not a raw count", () => {
    render(<TransparencyPanel transparency={transparency} provenance={[]} />);
    const msg = screen.getByTestId("access-limited");
    expect(msg).toHaveTextContent(
      /excluded by your organization's access rules/i,
    );
    expect(msg).not.toHaveTextContent(/\d/);
  });

  it("labels tools and verification as not active yet", () => {
    render(<TransparencyPanel transparency={transparency} provenance={[]} />);
    const panel = screen.getByTestId("transparency-panel");
    expect(panel).toHaveTextContent(/Tools/);
    expect(panel).toHaveTextContent(/Verification/);
    expect(panel).toHaveTextContent(/Not active yet/);
  });

  it("renders context provenance safely without raw ids or substrate tokens", () => {
    const { container } = render(
      <TransparencyPanel transparency={transparency} provenance={provenance} />,
    );
    const list = screen.getByTestId("provenance-list");
    expect(list).toHaveTextContent(/Q4 pricing decision/);
    expect(list).toHaveTextContent(/Untitled context/); // null title fallback
    expect(list).toHaveTextContent(/Governed context layer/); // mapped source
    expect(list).toHaveTextContent(/Scoped context/); // UNKNOWN scope
    const text = container.textContent ?? "";
    expect(text).not.toContain("ctx-0001"); // context_id never displayed
    expect(text).not.toContain("ctx-0002");
    expect(text).not.toContain("COE_ASSEMBLE_CONTEXT"); // never shown literally
  });

  it("does not surface forbidden substrate terms or chain-of-thought", () => {
    const { container } = render(
      <TransparencyPanel transparency={transparency} provenance={provenance} />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(
      /capsule|vector|bridge id|bridge_id|permission envelope|capability flags|capability_flags|raw memory|chain of thought|hidden prompt/i,
    );
  });

  it("renders a graceful fallback when nothing is present", () => {
    render(<TransparencyPanel />);
    expect(screen.getByTestId("transparency-empty")).toBeInTheDocument();
  });
});
