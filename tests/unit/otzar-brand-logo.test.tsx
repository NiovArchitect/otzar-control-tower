// FILE: otzar-brand-logo.test.tsx
// PURPOSE: Official Otzar mark from otzar.ai / Behance — not a generic orb.
// CONNECTS TO: OtzarBrandLogo, public/brand/otzar-logo.svg

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OtzarBrandLogo, OtzarBrandLockup } from "@/components/ambient/OtzarBrandLogo";

describe("OtzarBrandLogo — official brand mark", () => {
  it("renders the approved logo asset path", () => {
    render(<OtzarBrandLogo />);
    const root = screen.getByTestId("otzar-brand-logo");
    expect(root).toHaveAttribute("data-brand-source", "otzar.ai");
    const img = root.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/brand/otzar-logo.svg");
  });

  it("exposes presence for ambient ring states", () => {
    render(<OtzarBrandLogo presence="LISTENING" />);
    expect(screen.getByTestId("otzar-brand-logo")).toHaveAttribute(
      "data-presence",
      "LISTENING",
    );
  });

  it("lockup shows Otzar wordmark", () => {
    render(<OtzarBrandLockup subtitle="Control Tower" />);
    expect(screen.getByTestId("otzar-brand-lockup").textContent).toMatch(/Otzar/);
    expect(screen.getByTestId("otzar-brand-lockup").textContent).toMatch(
      /Control Tower/,
    );
  });
});
