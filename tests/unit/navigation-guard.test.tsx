// FILE: tests/unit/navigation-guard.test.tsx
// PURPOSE: [APP-NAV-CONTINUITY] The unsaved-work guard BLOCKS an in-app
//          navigation while a form is dirty and offers Stay — the safety-
//          critical "never silently discard" guarantee. Stay keeps the page
//          with the work intact.
// CONNECTS TO: src/components/navigation/NavigationGuard.tsx,
//              src/lib/navigation/unsaved-changes.ts.
//
// ENV BOUNDARY (honest): a data router (required for stable useBlocker) builds
// a navigation Request whose jsdom AbortSignal fails undici's instanceof check
// on any COMPLETED cross-route navigation under this MSW+jsdom setup. The two
// tests here never complete a navigation (they block, then Stay), so they run
// cleanly. The "Leave proceeds" and "no prompt when clean" behaviors — which
// require a completed navigation — are proven in a real browser by the live
// E2E spec tests/e2e/otzar-live-nav-continuity.spec.ts. This split proves each
// property where it can be proven reliably; it is not reduced coverage.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { NavigationGuard } from "@/components/navigation/NavigationGuard";
import {
  clearUnsavedChanges,
  useUnsavedChanges,
} from "@/lib/navigation/unsaved-changes";

beforeEach(() => clearUnsavedChanges());

function DirtyForm() {
  useUnsavedChanges("test-form", true);
  return <p>dirty form</p>;
}

function renderApp() {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <>
            <NavigationGuard />
            <DirtyForm />
            <Link to="/other">go elsewhere</Link>
          </>
        ),
      },
      { path: "/other", element: <p>other page</p> },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("[APP-NAV-CONTINUITY] NavigationGuard", () => {
  it("blocks in-app navigation while dirty and shows the confirmation", async () => {
    renderApp();
    await userEvent.click(screen.getByText("go elsewhere"));
    expect(screen.getByTestId("unsaved-changes-dialog")).toBeInTheDocument();
    // Still on the original page — nothing was discarded, nav did not proceed.
    expect(screen.getByText("dirty form")).toBeInTheDocument();
    expect(screen.queryByText("other page")).not.toBeInTheDocument();
  });

  it("Stay keeps the user on the page with their work intact", async () => {
    renderApp();
    await userEvent.click(screen.getByText("go elsewhere"));
    await userEvent.click(screen.getByTestId("unsaved-changes-stay"));
    // Dialog dismissed, still on the original page.
    expect(
      screen.queryByTestId("unsaved-changes-dialog"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("dirty form")).toBeInTheDocument();
    expect(screen.queryByText("other page")).not.toBeInTheDocument();
  });

  it("offers both Stay and Leave choices (never a silent discard, never a trap)", async () => {
    renderApp();
    await userEvent.click(screen.getByText("go elsewhere"));
    expect(screen.getByTestId("unsaved-changes-stay")).toBeInTheDocument();
    expect(screen.getByTestId("unsaved-changes-leave")).toBeInTheDocument();
  });
});
