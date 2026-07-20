// FILE: employee-shell-viewport.test.tsx
// PURPOSE: Shell chrome (Otzar / Work OS / Talk / notifications) must stay
//          inside the visual viewport — not parked above it via 100vh lag.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Employee shell visual viewport", () => {
  it("pins shell to visual viewport so Otzar / Work OS / Talk / notifs stay in view", () => {
    const layout = read("src/components/employee/EmployeeLayout.tsx");
    // Not relative h-screen — that leaves chrome outside the visual viewport.
    expect(layout).toMatch(/fixed inset-0/);
    expect(layout).toMatch(/100dvh/);
    expect(layout).toMatch(/safe-area-inset-top/);
    expect(layout).toMatch(/employee-shell-header/);
    expect(layout).toMatch(/shrink-0/);
    // Only main scrolls; header is not in the scroll container.
    expect(layout).toMatch(/employee-shell-main/);
    expect(layout).toMatch(/overflow-y-auto/);
    // Header still frosted (overlay-layering contract).
    expect(layout).toMatch(/backdrop-blur/);
  });

  it("viewport meta allows safe-area (viewport-fit=cover)", () => {
    const html = read("index.html");
    expect(html).toMatch(/viewport-fit=cover/);
  });
});
