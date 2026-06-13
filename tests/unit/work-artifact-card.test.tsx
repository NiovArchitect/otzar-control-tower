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

  it("'Include others' opens a teammate picker input — NOT a chatbot prompt", async () => {
    const user = userEvent.setup();
    render(
      <WorkArtifactCard artifact={artifact()} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    await user.click(screen.getByTestId("work-artifact-include-open"));
    const include = screen.getByTestId("work-artifact-include");
    expect(include.querySelector("input")).not.toBeNull();
    await user.type(
      screen.getByLabelText(/Include another teammate/i),
      "Samiksha",
    );
    await user.click(screen.getByTestId("work-artifact-include-add"));
    expect(screen.getByText(/To: David, Samiksha/)).toBeInTheDocument();
  });

  it("Edit opens an inline textarea (no 'what should I improve?' question)", async () => {
    const user = userEvent.setup();
    render(
      <WorkArtifactCard artifact={artifact()} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByTestId("work-artifact-edit")).toBeNull();
    await user.click(screen.getByTestId("work-artifact-edit-open"));
    // Inline editing appears immediately — direct control, not a prompt.
    expect(screen.getByTestId("work-artifact-edit")).toBeInTheDocument();
    expect(document.body.innerHTML.toLowerCase()).not.toContain(
      "what would you like me to improve",
    );
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
