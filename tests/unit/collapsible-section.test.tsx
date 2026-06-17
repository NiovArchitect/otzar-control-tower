// FILE: tests/unit/collapsible-section.test.tsx
// PURPOSE: Phase 1287-C — the ambient CollapsibleSection primitive: header with
//          title + count, default open/closed honored, keyboard-accessible
//          toggle (real button + aria-expanded), content present only when open.
// CONNECTS TO: src/components/ui/CollapsibleSection.tsx

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders the title + count and shows content when defaultOpen", () => {
    render(
      <CollapsibleSection title="Needs action" count={3} defaultOpen testId="sec">
        <div data-testid="child">item</div>
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("collapsible-toggle").textContent).toContain("Needs action (3)");
    expect(screen.getByTestId("collapsible-content")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByTestId("collapsible-toggle").getAttribute("aria-expanded")).toBe("true");
  });

  it("starts collapsed when defaultOpen is false and toggles open", async () => {
    render(
      <CollapsibleSection title="Recently created" defaultOpen={false} testId="sec">
        <div data-testid="child">item</div>
      </CollapsibleSection>,
    );
    expect(screen.queryByTestId("collapsible-content")).toBeNull();
    expect(screen.queryByTestId("child")).toBeNull();
    expect(screen.getByTestId("collapsible-toggle").getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(screen.getByTestId("collapsible-toggle"));
    expect(screen.getByTestId("collapsible-content")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
