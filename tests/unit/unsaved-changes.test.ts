// FILE: tests/unit/unsaved-changes.test.ts
// PURPOSE: [APP-NAV-CONTINUITY] The unsaved-work registry tracks a per-form
//          BOOLEAN only, and cleans up on unmount so no stale block lingers.
// CONNECTS TO: src/lib/navigation/unsaved-changes.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  clearUnsavedChanges,
  hasUnsavedChanges,
  useUnsavedChanges,
} from "@/lib/navigation/unsaved-changes";

beforeEach(() => clearUnsavedChanges());

describe("[APP-NAV-CONTINUITY] useUnsavedChanges registry", () => {
  it("starts clean", () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("registers a key while dirty and clears it when clean", () => {
    const { rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) => useUnsavedChanges("form-a", dirty),
      { initialProps: { dirty: false } },
    );
    expect(hasUnsavedChanges()).toBe(false);

    rerender({ dirty: true });
    expect(hasUnsavedChanges()).toBe(true);

    rerender({ dirty: false });
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("unregisters on unmount so a dirty form leaves no stale block", () => {
    const { unmount } = renderHook(() => useUnsavedChanges("form-b", true));
    expect(hasUnsavedChanges()).toBe(true);
    unmount();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("stays dirty while ANY of several forms is dirty", () => {
    const a = renderHook(() => useUnsavedChanges("a", true));
    const b = renderHook(() => useUnsavedChanges("b", true));
    expect(hasUnsavedChanges()).toBe(true);
    a.unmount();
    expect(hasUnsavedChanges()).toBe(true); // b still dirty
    b.unmount();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("does not persist anything to browser storage (no client-side draft custody)", () => {
    renderHook(() => useUnsavedChanges("secret-form", true));
    expect(hasUnsavedChanges()).toBe(true);
    // The registry holds a boolean key set — never form values, never storage.
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
