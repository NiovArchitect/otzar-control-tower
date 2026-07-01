// FILE: tests/e2e/workos-smoke-reporter.ts
// PURPOSE: A compact, honest summary for the deep Work OS live smoke suite.
//          Prints one row per test: name · PASS/FAIL/SKIP · duration · the key
//          product evidence (masked IDs). SKIP shows its explicit reason — never
//          rendered as a pass. Pairs with the default "list" reporter.
// CONNECTS TO: playwright.live.config.ts (add to the reporter array),
//              workos-helpers.ts (ev() annotations).

import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

interface Row {
  title: string;
  status: "PASS" | "FAIL" | "SKIP";
  ms: number;
  evidence: string[];
  skipReason?: string;
}

export default class WorkOsSmokeReporter implements Reporter {
  private rows: Row[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    const evidence = result.annotations
      .filter((a) => a.type === "evidence")
      .map((a) => a.description ?? "")
      .filter(Boolean);
    // Playwright surfaces test.skip(reason) via annotations too.
    const skipAnn = test.annotations.find((a) => a.type === "skip");
    const status: Row["status"] =
      result.status === "passed"
        ? "PASS"
        : result.status === "skipped"
          ? "SKIP"
          : "FAIL";
    this.rows.push({
      title: test.title,
      status,
      ms: result.duration,
      evidence,
      ...(skipAnn?.description ? { skipReason: skipAnn.description } : {}),
    });
  }

  onEnd(): void {
    const line = "─".repeat(84);
    const out: string[] = ["", line, "  OTZAR WORK OS — deep live smoke summary", line];
    const icon = (s: Row["status"]): string => (s === "PASS" ? "✓" : s === "SKIP" ? "○" : "✗");
    for (const r of this.rows) {
      out.push(`  ${icon(r.status)} [${r.status}] ${r.title}  (${(r.ms / 1000).toFixed(1)}s)`);
      if (r.status === "SKIP" && r.skipReason) out.push(`      ${r.skipReason}`);
      for (const e of r.evidence) out.push(`      • ${e}`);
    }
    const pass = this.rows.filter((r) => r.status === "PASS").length;
    const fail = this.rows.filter((r) => r.status === "FAIL").length;
    const skip = this.rows.filter((r) => r.status === "SKIP").length;
    out.push(line);
    out.push(`  ${pass} passed · ${fail} failed · ${skip} skipped`);
    out.push(line, "");
    console.log(out.join("\n"));
  }
}
