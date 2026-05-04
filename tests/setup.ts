// FILE: tests/setup.ts
// PURPOSE: Vitest setup file -- pulls in jest-dom matchers and resets
//          the testing-library DOM after every test.
// CONNECTS TO: vite.config.ts vitest.setupFiles.

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
