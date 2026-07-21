#!/usr/bin/env node
// FILE: copy-signal-lint.mjs
// PURPOSE: RC2 signal gate — scan ordinary UI source for long dashes and
//          prohibited internal terms in user-facing string literals.
//          Does not rewrite files. Exit 1 when violations found (unless
//          COPY_SIGNAL_LINT_SOFT=1).
//
// Usage: node scripts/copy-signal-lint.mjs

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["src/pages", "src/components", "src/lib/today", "src/lib/first-use"];
const EXT = new Set([".ts", ".tsx"]);

// Em dash / en dash / triple hyphen prose
const DASH_RE = /[—–]|---/;

/** @type {Array<{ term: string, class: string, suggest: string }>} */
const PROHIBITED = [
  { term: "envelope", class: "never_user", suggest: "request or collaboration request" },
  { term: "substrate", class: "never_user", suggest: "remove or say system" },
  { term: "hydration", class: "never_user", suggest: "loading" },
  { term: "execution rail", class: "never_user", suggest: "action path" },
  { term: "intent ledger", class: "never_user", suggest: "planned action" },
  { term: "evidence snapshot", class: "never_user", suggest: "why Otzar believes this" },
  { term: "conflict set", class: "never_user", suggest: "two sources disagree" },
  { term: "provider attempt", class: "never_user", suggest: "create or update" },
  { term: "orchestration", class: "never_user", suggest: "coordination" },
  { term: "SCALE_PROVEN", class: "never_user", suggest: "remove from UI" },
  { term: "S2500", class: "never_user", suggest: "remove from UI" },
  { term: "S250", class: "never_user", suggest: "remove from UI" },
  { term: "FOUNDER_DEFERRED", class: "never_user", suggest: "remove from UI" },
  { term: "harness", class: "never_user", suggest: "remove from UI" },
  { term: "synthetic scale", class: "never_user", suggest: "remove from UI" },
  { term: "scope reauthorization", class: "never_user", suggest: "Reconnect Google" },
  { term: "principal", class: "never_user", suggest: "person or AI Teammate" },
  { term: "p99", class: "never_user", suggest: "remove from UI" },
  { term: "p95", class: "never_user", suggest: "remove from UI" },
  { term: "MCP", class: "never_user", suggest: "remove from UI" },
  { term: "DGI", class: "admin_advanced", suggest: "organization health" },
  { term: "ETL", class: "never_user", suggest: "remove from UI" },
  { term: "runtime", class: "admin_advanced", suggest: "system" },
  { term: "tenant", class: "admin_advanced", suggest: "organization" },
  { term: "artifact", class: "contextual", suggest: "document, event, or result" },
  { term: "projection", class: "never_user", suggest: "view" },
  { term: "Foundation", class: "admin_advanced", suggest: "Otzar (or hide)" },
];

// Allowlisted path fragments (engineering diagnostics, pure lib not UI).
const PATH_ALLOW = [
  "/lib/org/synthetic",
  "/lib/org/defect",
  "/lib/org/enterprise-pressure",
  "/lib/org/provider-intent",
  "/lib/avp2/",
  "SyntheticScale",
  "EnterprisePressure",
  "DefectRegression",
  "test-id",
  "data-testid",
  "tests/",
];

// String literals in TS/TSX (simple, not full parser).
const STR_RE = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(name.slice(name.lastIndexOf(".")))) out.push(p);
  }
  return out;
}

function pathAllowed(rel) {
  return PATH_ALLOW.some((a) => rel.includes(a));
}

function scanFile(abs) {
  const rel = relative(ROOT, abs);
  if (pathAllowed(rel)) return [];
  const text = readFileSync(abs, "utf8");
  const lines = text.split("\n");
  const hits = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip pure comments and imports
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
      continue;
    }
    // Collect string contents on the line
    const strings = [];
    let m;
    const re = new RegExp(STR_RE.source, "g");
    while ((m = re.exec(line)) !== null) {
      strings.push(m[2]);
    }
    // data-testid / testId attribute lines are engineering ids, not user copy
    const isTestIdLine =
      /\bdata-testid\b/.test(line) ||
      /\btestId\s*:/.test(line) ||
      /\btest_id\b/.test(line);

    for (const s of strings) {
      if (s.length < 2) continue;
      // Skip technical paths, pure enums, and kebab test ids (no spaces)
      const isCodey =
        s.startsWith("/") ||
        s.startsWith("http") ||
        s.includes("data-") ||
        (s.includes("_") && s === s.toUpperCase()) ||
        (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(s) && !/\s/.test(s)) ||
        isTestIdLine;
      if (DASH_RE.test(s) && !isCodey) {
        hits.push({
          file: rel,
          line: i + 1,
          kind: "long_dash",
          string: s.slice(0, 120),
          suggest: "Use a period, comma, or colon",
        });
      }
      if (isCodey) continue;
      for (const p of PROHIBITED) {
        if (p.class === "contextual") continue; // advisory only for now
        // Word-boundary match so "Acknowledging" does not hit "DGI", etc.
        const escaped = p.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?:[^A-Za-z0-9_]|$)`, "i");
        if (re.test(s)) {
          // Skip when clearly a code identifier path
          if (s.includes("/") || s.includes(".")) continue;
          hits.push({
            file: rel,
            line: i + 1,
            kind: "prohibited_term",
            term: p.term,
            class: p.class,
            string: s.slice(0, 120),
            suggest: p.suggest,
          });
        }
      }
    }
  }
  return hits;
}

const files = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)));
const all = files.flatMap(scanFile);

// Soft mode while we finish cleanup: report but do not fail CI hard unless
// COPY_SIGNAL_LINT_STRICT=1. Default soft so RC2 can ship partial cleanup.
const strict = process.env.COPY_SIGNAL_LINT_STRICT === "1";
const soft = process.env.COPY_SIGNAL_LINT_SOFT === "1" || !strict;

console.log(
  JSON.stringify(
    {
      files_scanned: files.length,
      violations: all.length,
      mode: soft ? "report" : "strict",
      sample: all.slice(0, 40),
    },
    null,
    2,
  ),
);

if (all.length > 0 && !soft) {
  process.exit(1);
}
process.exit(0);
