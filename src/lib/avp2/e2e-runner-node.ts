// FILE: src/lib/avp2/e2e-runner-node.ts
// PURPOSE: OTZAR-E2E-2 — the NODE-ONLY implementations of the runner bridge's injected
//          dependencies (a real process runner via execFile + a real file reader). This
//          file imports node built-ins and must NEVER be imported by browser/React code —
//          only a Node/Tauri sidecar, a CLI, or a test that wants real execution imports
//          it (the React graph injects fakes / does not call it). Keeping it separate is
//          what lets e2e-runner-bridge.ts stay browser-safe.
//
//          SAFETY: execFile (no shell), fixed cwd, hard timeout, bounded buffer; the
//          caller (the bridge) marker-scans + validates the output and never echoes raw
//          stderr. No hosted network, no production, no real payment.
// CONNECTS TO: src/lib/avp2/e2e-runner-bridge.ts (ProcessRunner / FileReader types).

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import type { BuiltCommand, ProcessOutput, ProcessRunner, FileReader } from "./e2e-runner-bridge";

const MAX_BUFFER = 4 * 1024 * 1024; // 4 MB — generous for a JSON result, bounded.

// WHAT: run the fixed command with execFile (no shell), in the runner's cwd, with a hard
//       timeout and a bounded buffer. Resolves with code/stdout/stderr/timedOut — never
//       throws; the bridge decides safety.
export const nodeProcessRunner: ProcessRunner = (cmd: BuiltCommand, opts: { timeoutMs: number }): Promise<ProcessOutput> =>
  new Promise((resolve) => {
    execFile(
      cmd.command,
      cmd.args,
      { cwd: cmd.cwd, timeout: opts.timeoutMs, maxBuffer: MAX_BUFFER, windowsHide: true },
      (err, stdout, stderr) => {
        const e = err as (NodeJS.ErrnoException & { code?: number | string; killed?: boolean; signal?: string }) | null;
        const timedOut = e?.killed === true || e?.signal === "SIGTERM";
        const code = typeof e?.code === "number" ? e.code : err === null ? 0 : 1;
        resolve({ code, stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), timedOut });
      },
    );
  });

// WHAT: read a local file as UTF-8. The bridge validates the path + scans/validates content.
export const nodeFileReader: FileReader = (path: string): string => readFileSync(path, "utf8");
