// FILE: tests/unit/observe-correction.test.tsx
// PURPOSE: Page tests for the employee Observe + Corrections surfaces.
//          Verifies real round-trips through POST /otzar/observe and
//          POST /otzar/correction (via MSW), the duplicate-skip branch,
//          and the can_write_capsules gating.
// CONNECTS TO: src/pages/app/Observe.tsx, src/pages/app/Corrections.tsx,
//              tests/msw/handlers.ts, src/lib/stores/auth.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Observe } from "@/pages/app/Observe";
import { Corrections } from "@/pages/app/Corrections";
import { useAuthStore } from "@/lib/stores/auth";

function setWrite(write: boolean) {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: write,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

beforeEach(() => setWrite(true));

describe("Observe", () => {
  it("submits content and renders the extracted summary counts", async () => {
    const user = userEvent.setup();
    render(<Observe />);

    await user.type(
      screen.getByLabelText("Content"),
      "Quarterly planning notes",
    );
    await user.click(screen.getByRole("button", { name: /submit to otzar/i }));

    const summary = await screen.findByTestId("observe-summary");
    expect(summary).toHaveTextContent(/2 knowledge item/i);
    expect(summary).toHaveTextContent(/Commitments: 2/);
  });

  it("renders the duplicate/skipped state", async () => {
    const user = userEvent.setup();
    render(<Observe />);

    await user.type(
      screen.getByLabelText("Content"),
      "__duplicate__ content here",
    );
    await user.click(screen.getByRole("button", { name: /submit to otzar/i }));

    expect(await screen.findByTestId("observe-skipped")).toBeInTheDocument();
  });

  it("shows a not-permitted state without can_write_capsules", () => {
    setWrite(false);
    render(<Observe />);
    expect(
      screen.getByText(/capability required to submit observations/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Content")).not.toBeInTheDocument();
  });
});

describe("Corrections", () => {
  it("submits a correction and renders the saved confirmation", async () => {
    const user = userEvent.setup();
    render(<Corrections />);

    await user.type(
      screen.getByLabelText(/what otzar got wrong/i),
      "misread the deadline",
    );
    await user.type(
      screen.getByLabelText(/the correct behavior/i),
      "the deadline is Friday",
    );
    await user.click(screen.getByRole("button", { name: /submit correction/i }));

    const result = await screen.findByTestId("correction-result");
    expect(result).toHaveTextContent(/Correction saved/i);
    // Product-safe copy: no raw substrate id / "capsule" wording surfaced.
    expect(result).not.toHaveTextContent(/capsule/i);
  });

  it("shows a not-permitted state without can_write_capsules", () => {
    setWrite(false);
    render(<Corrections />);
    expect(
      screen.getByText(/capability required to submit corrections/i),
    ).toBeInTheDocument();
  });
});
