// FILE: tests/unit/app-back-button.test.tsx
// PURPOSE: [APP-NAV-CONTINUITY] The Back affordance never bounces the user out
//          of the app: it walks in-app history when there is one, falls back to
//          the shell's safe home otherwise, and renders no dead button.
// CONNECTS TO: src/components/navigation/AppBackButton.tsx.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

import { AppBackButton } from "@/components/navigation/AppBackButton";

/** Simulate the history idx that createBrowserRouter stamps in production. */
function setHistoryIdx(idx: number) {
  window.history.replaceState({ ...window.history.state, idx }, "");
}

beforeEach(() => {
  navigateMock.mockReset();
  setHistoryIdx(0);
});

function renderAt(pathname: string, fallback: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppBackButton fallback={fallback} />
    </MemoryRouter>,
  );
}

describe("[APP-NAV-CONTINUITY] AppBackButton", () => {
  it("renders no dead button when there's no history and we're already home", () => {
    setHistoryIdx(0);
    renderAt("/app", "/app");
    expect(screen.queryByTestId("app-back-button")).not.toBeInTheDocument();
  });

  it("with no in-app history on a sub-page, goes to the safe fallback home", async () => {
    setHistoryIdx(0);
    renderAt("/app/my-twin/calibration/writing-style", "/app");
    const btn = screen.getByTestId("app-back-button");
    expect(btn).toHaveAttribute("aria-label", "Go back");
    await userEvent.click(btn);
    expect(navigateMock).toHaveBeenCalledWith("/app");
  });

  it("with in-app history, walks back one entry (never to an external referrer)", async () => {
    setHistoryIdx(3);
    renderAt("/app/action-center", "/app");
    await userEvent.click(screen.getByTestId("app-back-button"));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it("is a real, focusable button with an accessible name", () => {
    setHistoryIdx(2);
    renderAt("/", "/app");
    const btn = screen.getByRole("button", { name: "Go back" });
    expect(btn).toBeInTheDocument();
  });
});
