// FILE: tests/unit/ai-breakdown-button.test.tsx
// PURPOSE: Phase 1214 — locks the reusable "Why this matters" /
//          brain-icon popover. Covers: open/close interactions,
//          rendering the caller-provided points + optional
//          confidence, the user-safe footnote disclaiming
//          chain-of-thought, and the privacy invariant.
// CONNECTS TO: src/components/otzar/AIBreakdownButton.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AIBreakdownButton,
  type AIBreakdown,
} from "@/components/otzar/AIBreakdownButton";

function example(): AIBreakdown {
  return {
    title: "Why Otzar drafted this",
    points: [
      {
        label: "Why this matters",
        body: "Otzar inferred from your request that you wanted to send David a note.",
      },
      {
        label: "What happens if you approve",
        body: "Otzar submits this as a governed internal action. David sees an unread note.",
      },
      {
        label: "Risk + permission",
        body: "Internal note — low risk.",
      },
    ],
    confidence: "HIGH",
  };
}

describe("AIBreakdownButton — open / close", () => {
  it("popover is closed by default", () => {
    render(<AIBreakdownButton breakdown={example()} />);
    expect(screen.getByTestId("ai-breakdown-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-breakdown-popover")).toBeNull();
  });

  it("clicking the trigger opens the popover", async () => {
    const user = userEvent.setup();
    render(<AIBreakdownButton breakdown={example()} />);
    await user.click(screen.getByTestId("ai-breakdown-trigger"));
    expect(screen.getByTestId("ai-breakdown-popover")).toBeInTheDocument();
  });

  it("clicking the trigger again closes the popover", async () => {
    const user = userEvent.setup();
    render(<AIBreakdownButton breakdown={example()} />);
    const t = screen.getByTestId("ai-breakdown-trigger");
    await user.click(t);
    await user.click(t);
    expect(screen.queryByTestId("ai-breakdown-popover")).toBeNull();
  });

  it("Escape closes the popover", async () => {
    const user = userEvent.setup();
    render(<AIBreakdownButton breakdown={example()} />);
    await user.click(screen.getByTestId("ai-breakdown-trigger"));
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("ai-breakdown-popover")).toBeNull();
  });
});

describe("AIBreakdownButton — content", () => {
  it("renders the title + every point's label and body", async () => {
    const user = userEvent.setup();
    render(<AIBreakdownButton breakdown={example()} />);
    await user.click(screen.getByTestId("ai-breakdown-trigger"));
    const pop = screen.getByTestId("ai-breakdown-popover");
    expect(pop).toHaveTextContent("Why Otzar drafted this");
    const points = screen.getAllByTestId("ai-breakdown-point");
    expect(points).toHaveLength(3);
    expect(pop).toHaveTextContent("Otzar inferred from your request");
    expect(pop).toHaveTextContent("David sees an unread note");
    expect(pop).toHaveTextContent("low risk");
  });

  it("renders the confidence chip when supplied", async () => {
    const user = userEvent.setup();
    render(<AIBreakdownButton breakdown={example()} />);
    await user.click(screen.getByTestId("ai-breakdown-trigger"));
    expect(screen.getByTestId("ai-breakdown-confidence")).toHaveTextContent(
      "High confidence",
    );
  });

  it("omits the confidence chip when not supplied", async () => {
    const user = userEvent.setup();
    render(
      <AIBreakdownButton
        breakdown={{ title: "x", points: [{ label: "a", body: "b" }] }}
      />,
    );
    await user.click(screen.getByTestId("ai-breakdown-trigger"));
    expect(screen.queryByTestId("ai-breakdown-confidence")).toBeNull();
  });

  it("always includes the user-safe 'not the AI's hidden reasoning' footnote", async () => {
    const user = userEvent.setup();
    render(<AIBreakdownButton breakdown={example()} />);
    await user.click(screen.getByTestId("ai-breakdown-trigger"));
    expect(screen.getByTestId("ai-breakdown-popover")).toHaveTextContent(
      /not the AI's hidden reasoning/i,
    );
  });
});

describe("AIBreakdownButton — privacy invariants (RULE 0)", () => {
  it("renders only the caller-provided fields (no hidden surfaces)", async () => {
    const user = userEvent.setup();
    render(<AIBreakdownButton breakdown={example()} />);
    await user.click(screen.getByTestId("ai-breakdown-trigger"));
    const html = screen.getByTestId("ai-breakdown-popover").outerHTML;
    // Caller's content present.
    expect(html).toContain("Otzar inferred from your request");
    // No internals.
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/payload_redacted/i);
    expect(html).not.toMatch(/policy_envelope/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/chain.of.thought/i);
  });
});

describe("AIBreakdownButton — aria + test hooks", () => {
  it("defaults the aria-label to 'Why this matters'", () => {
    render(<AIBreakdownButton breakdown={example()} />);
    expect(screen.getByLabelText("Why this matters")).toBeInTheDocument();
  });

  it("respects a custom ariaLabel", () => {
    render(
      <AIBreakdownButton
        breakdown={example()}
        ariaLabel="Otzar's view"
      />,
    );
    expect(screen.getByLabelText("Otzar's view")).toBeInTheDocument();
  });

  it("respects a custom triggerTestId", () => {
    render(
      <AIBreakdownButton
        breakdown={example()}
        triggerTestId="custom-trigger"
      />,
    );
    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
  });
});
