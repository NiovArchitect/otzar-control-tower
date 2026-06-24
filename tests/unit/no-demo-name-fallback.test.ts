// FILE: tests/unit/no-demo-name-fallback.test.ts
// PURPOSE: [OTZAR-LIVE-6] Demo-name hygiene guard. Demo people (David / Samiksha
//          / Vishesh / Odie) may appear in TESTS and in the explicitly-labeled
//          Comms "Demo capture mode" script (coupled to the Foundation demo
//          fixture) — but they must NEVER become product/fallback language in the
//          people-resolution or outbound rails. If a resolver ever defaulted to a
//          demo person when nothing resolved, that's a tenant-safety leak. This
//          scans the runtime rails for demo names in STRING LITERALS (comments,
//          which use them as examples, are fine) so the leak can't sneak back in.
// CONNECTS TO: src/lib/work-os/{target-resolution,ambient-outbound,
//          pending-clarification,thread-query}.ts.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RAILS = [
  "src/lib/work-os/target-resolution.ts",
  "src/lib/work-os/ambient-outbound.ts",
  "src/lib/work-os/pending-clarification.ts",
  "src/lib/work-os/thread-query.ts",
];

const DEMO_NAMES = /\b(David|Samiksha|Vishesh|Odie)\b/;

// Strip line + block comments so example phrasings in comments don't count;
// only real code (and its string literals) is checked.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("no demo-name fallback in the resolution / outbound rails", () => {
  for (const rel of RAILS) {
    it(`${rel} contains no demo person name in code`, () => {
      const src = stripComments(
        readFileSync(resolve(process.cwd(), rel), "utf8"),
      );
      const offending = src
        .split("\n")
        .map((line, i) => [i + 1, line] as const)
        .filter(([, line]) => DEMO_NAMES.test(line));
      expect(
        offending,
        `demo name in code (not comment) at:\n${offending
          .map(([n, l]) => `  ${rel}:${n}: ${l.trim()}`)
          .join("\n")}`,
      ).toEqual([]);
    });
  }

  it("the demo capture script stays in its own clearly-labeled module", () => {
    // Comms.tsx is allowed to name demo participants (DEMO capture mode, coupled
    // to the Foundation demo fixture). Assert it is explicitly labeled as demo so
    // the names can never read as universal product copy.
    const comms = readFileSync(
      resolve(process.cwd(), "src/pages/app/Comms.tsx"),
      "utf8",
    );
    expect(comms).toMatch(/DEMO_SCRIPT/);
    expect(comms).toMatch(/Demo capture mode/i);
  });
});
