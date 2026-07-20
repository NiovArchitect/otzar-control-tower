// FILE: tests/unit/overlay-layering.test.ts
// PURPOSE: [OVERLAY-LAYERING] The employee shell's stacking contract.
//          Found live 2026-07-07: the notification dropdown opened BEHIND
//          the ambient content cards ("Needs you", "What changed",
//          "Context", …). Cause: the frosted header's backdrop-blur
//          creates a stacking context that CAPS the dropdown's z-50
//          inside it, while the frosted cards in <main> (later in DOM
//          order, own blur contexts) painted over it. The durable fix
//          portals the dropdown to document.body (escaping the header's
//          blur context) at a fixed z-[70] ABOVE the whole ambient ladder.
//          The contract this file locks:
//            content plane (z-auto)
//              < header chrome (relative z-40)
//              < ambient edge glow (z-[55], pointer-events-none)
//              < ambient notification stack (z-[58])
//              < ambient Otzar bar (z-[60])
//              < notification dropdown (portaled, fixed z-[70])
//          A regression on any rung re-buries an overlay behind content.
// CONNECTS TO: src/components/employee/EmployeeLayout.tsx (the header),
//          src/components/otzar/NotificationBell.tsx (the dropdown),
//          AmbientEdgeGlow / AmbientNotificationStack / AmbientOtzarBar.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("[OVERLAY-LAYERING] employee shell stacking contract", () => {
  it("the employee header chrome is elevated above the content plane (relative z-40)", () => {
    const layout = read("src/components/employee/EmployeeLayout.tsx");
    // className may be single-line or split; anchor on employee-shell-header.
    const header =
      layout.match(
        /className="([^"]*)"[^>]*data-testid="employee-shell-header"/,
      ) ??
      layout.match(
        /data-testid="employee-shell-header"[^>]*className="([^"]*)"/,
      ) ??
      layout.match(/<header className="([^"]*)"/);
    expect(header, "EmployeeLayout must render a <header>").not.toBeNull();
    const classes = header![1] ?? "";
    // The blur creates a stacking context; without an explicit z the
    // dropdown inside is capped beneath the later-painted content cards.
    expect(classes).toContain("backdrop-blur");
    expect(classes).toContain("relative");
    expect(classes).toContain("z-40");
  });

  it("the notification dropdown is portaled to document.body and layers above the ambient ladder (fixed z-[70])", () => {
    const bell = read("src/components/otzar/NotificationBell.tsx");
    expect(bell).toContain('data-testid="notification-bell-dropdown"');
    // Durable fix: the panel escapes the frosted header's backdrop-blur
    // stacking context by portaling to document.body — an `absolute` offset
    // inside the header can never paint above the root-level ambient ladder.
    expect(bell).toContain("createPortal");
    expect(bell).toMatch(/createPortal\([\s\S]*?document\.body/);
    // Locate the portaled panel's class block via its unique ref anchor.
    const dropdown = bell.match(/ref=\{dropdownRef\}\s*\n\s*className="([^"]*)"/);
    expect(dropdown, "portaled dropdown class block must be findable").not.toBeNull();
    const cls = dropdown![1] ?? "";
    // Fixed-positioned (computed from the bell rect), no longer header-local absolute.
    expect(cls).toContain("fixed");
    expect(cls).not.toContain("absolute");
    // Above the whole ambient ladder, including the Otzar orb at z-[60].
    expect(cls).toContain("z-[70]");
  });

  it("in-card popovers elevate their positioned ancestor while open (z-30 under the header chrome)", () => {
    const breakdown = read("src/components/otzar/AIBreakdownButton.tsx");
    // The frosted cards are backdrop-blur stacking contexts; without the
    // open-state elevation the popover paints under the NEXT sibling card.
    expect(breakdown).toContain('open ? "z-30" : ""');
  });

  it("the ambient overlay ladder keeps its documented order (55 < 58 < 60)", () => {
    expect(read("src/components/otzar/AmbientEdgeGlow.tsx")).toContain("z-[55]");
    expect(read("src/components/otzar/AmbientNotificationStack.tsx")).toContain(
      "z-[58]",
    );
    expect(read("src/components/otzar/AmbientOtzarBar.tsx")).toContain("z-[60]");
  });
});
