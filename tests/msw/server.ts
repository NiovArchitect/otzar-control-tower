// FILE: server.ts
// PURPOSE: MSW Node server instance for vitest. Wired into
//          tests/setup.ts (beforeAll/afterEach/afterAll).
// CONNECTS TO: tests/setup.ts (lifecycle hooks), tests/msw/handlers.ts.

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
