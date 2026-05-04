// FILE: tests/setup.ts
// PURPOSE: Vitest setup file -- jest-dom matchers + DOM cleanup +
//          MSW lifecycle (12B.1).
// CONNECTS TO: vite.config.ts vitest.setupFiles, tests/msw/server.ts.

import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// 12B.2: jsdom doesn't implement ResizeObserver, but Radix's
// react-use-size hook (loaded by Checkbox, Select, etc.) instantiates
// one on mount. Without this polyfill, any test that mounts a Radix
// component depending on size measurement throws "ResizeObserver is
// not defined" at commit time.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

// 12B.1: jsdom doesn't implement Element.setPointerCapture /
// hasPointerCapture / releasePointerCapture, but sonner's
// onPointerDown handler (and Radix select/dialog) call them. Polyfill
// to no-ops so the toast action click in audit-aware-button.test.tsx
// doesn't surface an unhandled TypeError.
if (typeof Element !== "undefined") {
  type PointerCapableElement = Element & {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    hasPointerCapture?: (pointerId: number) => boolean;
  };
  const proto = Element.prototype as PointerCapableElement;
  if (typeof proto.setPointerCapture !== "function") {
    proto.setPointerCapture = function () {};
  }
  if (typeof proto.releasePointerCapture !== "function") {
    proto.releasePointerCapture = function () {};
  }
  if (typeof proto.hasPointerCapture !== "function") {
    proto.hasPointerCapture = function () {
      return false;
    };
  }
}

// 12B.1: MSW lifecycle. onUnhandledRequest:"error" surfaces any
// test that hits an endpoint without a handler -- forces every
// new endpoint consumer in 12B.2-12B.4 to register a handler.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
