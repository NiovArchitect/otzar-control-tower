// FILE: otzar-brand-logo.test.tsx
// PURPOSE: Official Otzar mark from otzar.ai / Behance — 3D polish, not generic orb.
// CONNECTS TO: OtzarBrandLogo, public/brand/otzar-logo.png + .svg

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OtzarBrandLogo, OtzarBrandLockup } from "@/components/ambient/OtzarBrandLogo";

describe("OtzarBrandLogo — official brand mark", () => {
  it("renders the approved high-res logo for brand polish", () => {
    render(<OtzarBrandLogo tone="brand" polish />);
    const root = screen.getByTestId("otzar-brand-logo");
    expect(root).toHaveAttribute("data-brand-source", "otzar.ai");
    expect(root).toHaveAttribute("data-polish", "3d");
    const img = root.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/brand/otzar-logo.png");
  });

  it("uses SVG for monochrome ink chrome", () => {
    render(<OtzarBrandLogo tone="ink" polish={false} />);
    const img = screen.getByTestId("otzar-brand-logo").querySelector("img");
    expect(img?.getAttribute("src")).toBe("/brand/otzar-logo.svg");
  });

  it("exposes presence for ambient ring states", () => {
    render(<OtzarBrandLogo presence="LISTENING" />);
    expect(screen.getByTestId("otzar-brand-logo")).toHaveAttribute(
      "data-presence",
      "LISTENING",
    );
  });

  it("hero size is available for login WOAH moment", () => {
    render(<OtzarBrandLogo size="hero" tone="brand" polish />);
    expect(screen.getByTestId("otzar-brand-logo")).toHaveAttribute("data-size", "hero");
  });

  it("lockup shows Otzar wordmark", () => {
    render(<OtzarBrandLockup subtitle="Control Tower" />);
    expect(screen.getByTestId("otzar-brand-lockup").textContent).toMatch(/Otzar/);
    expect(screen.getByTestId("otzar-brand-lockup").textContent).toMatch(
      /Control Tower/,
    );
  });
});
