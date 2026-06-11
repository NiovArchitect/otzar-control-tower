// FILE: tests/unit/ambient-quiet-mode.test.tsx
// PURPOSE: Phase 1235b — locks quiet mode on the ambient Otzar dock:
//          the moon toggle, the quiet banner copy (incl. the honest
//          calendar line), mic disabled while quiet, the muted
//          collapsed pill, and calm copy throughout.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { useAuthStore } from "@/lib/stores/auth";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

beforeEach(() => setAuth());

function renderBar(): void {
  render(
    <MemoryRouter>
      <AmbientOtzarBar />
    </MemoryRouter>,
  );
}

async function expand(): Promise<void> {
  await userEvent.click(screen.getByTestId("ambient-otzar-bar"));
}

describe("AmbientOtzarBar — quiet mode (Phase 1235b)", () => {
  it("collapsed dock starts in normal (non-quiet) state", () => {
    renderBar();
    const pill = screen.getByTestId("ambient-otzar-bar");
    expect(pill).toHaveAttribute("data-quiet", "false");
    expect(pill).toHaveTextContent("Talk to Otzar");
  });

  it("quiet toggle shows the banner with honest calendar copy and pauses the mic", async () => {
    renderBar();
    await expand();
    await userEvent.click(screen.getByTestId("ambient-quiet-toggle"));

    const banner = screen.getByTestId("ambient-quiet-banner");
    expect(banner).toHaveTextContent(
      "Quiet mode — Otzar won't speak or listen.",
    );
    expect(banner).toHaveTextContent(
      "When your calendar is connected, Otzar will go quiet automatically during meetings.",
    );
    expect(
      screen.getByRole("button", { name: "Voice is paused in quiet mode" }),
    ).toBeDisabled();
    expect(screen.getByTestId("ambient-quiet-toggle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("collapsing while quiet shows the muted 'Otzar · quiet' pill", async () => {
    renderBar();
    await expand();
    await userEvent.click(screen.getByTestId("ambient-quiet-toggle"));
    await userEvent.click(screen.getByRole("button", { name: "Collapse" }));

    const pill = screen.getByTestId("ambient-otzar-bar");
    expect(pill).toHaveAttribute("data-quiet", "true");
    expect(pill).toHaveTextContent("Otzar · quiet");
  });

  it("leaving quiet mode restores voice affordances", async () => {
    renderBar();
    await expand();
    await userEvent.click(screen.getByTestId("ambient-quiet-toggle"));
    await userEvent.click(screen.getByTestId("ambient-quiet-toggle"));
    expect(screen.queryByTestId("ambient-quiet-banner")).toBeNull();
    expect(screen.getByTestId("ambient-quiet-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("quiet copy never uses developer vocabulary", async () => {
    renderBar();
    await expand();
    await userEvent.click(screen.getByTestId("ambient-quiet-toggle"));
    const text = document.body.textContent ?? "";
    for (const banned of [
      "payload",
      "schema",
      "adapter",
      "capsule_id",
      "wallet_id",
      "calendar connector credential",
    ]) {
      expect(text).not.toContain(banned);
    }
  });
});
