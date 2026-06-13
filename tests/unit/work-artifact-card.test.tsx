// FILE: tests/unit/work-artifact-card.test.tsx
// PURPOSE: Phase 1267 — locks the visible, editable work artifact card:
//          shows recipient/channel/body/status/prerequisite, and the
//          Edit / Confirm / Cancel controls work (no hearsay UI).

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  WorkArtifactCard,
  type WorkArtifact,
} from "@/components/otzar/WorkArtifactCard";

function artifact(over: Partial<WorkArtifact> = {}): WorkArtifact {
  return {
    kind: "DRAFT_MESSAGE",
    title: "Draft message → David",
    targetLabel: "David",
    channel: "internal",
    body: "We need to review this.",
    status: "Approval required",
    ...over,
  };
}

describe("WorkArtifactCard", () => {
  it("renders title, target, body, and status", () => {
    render(
      <WorkArtifactCard artifact={artifact()} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText(/Draft message → David/)).toBeInTheDocument();
    expect(screen.getByTestId("work-artifact-body").textContent).toMatch(
      /We need to review this\./,
    );
    expect(screen.getByTestId("work-artifact-status").textContent).toMatch(
      /Approval required/,
    );
    expect(screen.getByText(/To: David/)).toBeInTheDocument();
  });

  it("Edit reveals a textarea; Save fires onEdit with the new body", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkArtifactCard
        artifact={artifact()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onEdit={onEdit}
      />,
    );
    await user.click(screen.getByTestId("work-artifact-edit-open"));
    const textarea = screen.getByTestId("work-artifact-edit");
    await user.clear(textarea);
    await user.type(textarea, "Revised: please review by Friday.");
    await user.click(screen.getByTestId("work-artifact-save"));
    expect(onEdit).toHaveBeenCalledWith("Revised: please review by Friday.");
  });

  it("Confirm fires onConfirm with the current body", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkArtifactCard
        artifact={artifact()}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("work-artifact-confirm"));
    expect(onConfirm).toHaveBeenCalledWith("We need to review this.");
  });

  it("Cancel fires onCancel", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkArtifactCard
        artifact={artifact()}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByTestId("work-artifact-cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("renders a preserved prerequisite (after-X-confirms)", () => {
    render(
      <WorkArtifactCard
        artifact={artifact({
          kind: "SCHEDULE_MEETING",
          title: "Meeting proposal → Vishesh",
          prerequisite: "Requires Samiksha's confirmation",
        })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId("work-artifact-prereq").textContent).toMatch(
      /Requires Samiksha's confirmation/,
    );
  });
});
