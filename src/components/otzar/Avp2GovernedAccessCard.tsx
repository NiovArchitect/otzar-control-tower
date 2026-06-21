// FILE: Avp2GovernedAccessCard.tsx
// PURPOSE: OTZAR-E2E-1/E2E-4 — the "AVP² governed access" status card. It displays a
//          validated AVP2_END_TO_END_RESULT (default: the safe local-live demo) as an
//          Otzar work artifact: status, proof level/provenance, the quote → accept →
//          access receipt → proof checklist, delivered=false (proof reference, not
//          content), the next action, and the Federation Cloud routes. E2E-4 adds an
//          operator-gated "Run local live proof" section that appears ONLY in the Tauri
//          desktop shell when the native bridge is available; the browser never spawns a
//          process. On success it shows the validated artifact; on failure it shows safe
//          error codes only (never raw stderr / tokens). Live proof is shown ONLY for a
//          LIVE_LOCAL_RUN PASS.
// CONNECTS TO: src/lib/avp2/e2e-display.ts, src/lib/avp2/e2e-tauri-bridge.ts,
//          src/lib/connectors/avp2-governed-access.ts,
//          tests/unit/avp2-governed-access-card.test.tsx, src/pages/MarketplaceDiscovery.tsx.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapAvp2ResultToOtzarArtifact } from "@/lib/avp2/e2e-display";
import { DEMO_LOCAL_LIVE_RESULT } from "@/lib/connectors/avp2-governed-access";
import { AVP2_DRY_RUN_COMMAND, AVP2_LIVE_LOCAL_COMMAND, LIVE_LOCAL_OUTPUT_PATH, LIVE_LOCAL_EVIDENCE_PATH } from "@/lib/avp2/e2e-runner-bridge";
import { isAvp2TauriLiveBridgeAvailable, runAvp2LiveLocalViaTauri, type TauriBridgeDeps, type TauriRunOutcome } from "@/lib/avp2/e2e-tauri-bridge";
import { Avp2EvidenceHandoffPanel } from "@/components/otzar/Avp2EvidenceHandoffPanel";
import type { E2EResult, StepStatus } from "@/lib/avp2/e2e-contracts";

function statusVariant(s: "PASS" | "SKIP" | "FAIL"): "default" | "warning" | "destructive" {
  return s === "PASS" ? "default" : s === "FAIL" ? "destructive" : "warning";
}
function stepVariant(s: StepStatus): "secondary" | "outline" | "destructive" {
  return s === "PASS" ? "secondary" : s === "FAIL" ? "destructive" : "outline";
}

export interface Avp2GovernedAccessCardProps {
  result?: E2EResult;
  /** Operator's local niov-avp repo path (pre-fills the live-runner input). */
  avpRepoPath?: string;
  /** Injected Tauri bridge deps (tests pass a mock invoke / isTauri). */
  liveBridgeDeps?: TauriBridgeDeps;
}

export function Avp2GovernedAccessCard({ result, avpRepoPath = "", liveBridgeDeps = {} }: Avp2GovernedAccessCardProps): JSX.Element {
  const artifact = mapAvp2ResultToOtzarArtifact(result ?? DEMO_LOCAL_LIVE_RESULT);
  const links = artifact.federation_cloud_links;
  const routes: Array<[string, string]> = [
    ["End-to-end", links.e2e_route ?? "/avp2/e2e"],
    ["Evidence", links.evidence_route],
    ["Timeline", links.timeline_route],
    ["Registry", links.registry_route],
  ];

  const bridgeAvailable = isAvp2TauriLiveBridgeAvailable(liveBridgeDeps);
  const [repoPath, setRepoPath] = useState(avpRepoPath);
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<TauriRunOutcome | null>(null);

  const runLive = async (): Promise<void> => {
    setRunning(true);
    setOutcome(null);
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: repoPath, operatorConfirmed: confirmed }, liveBridgeDeps);
    setOutcome(out);
    setRunning(false);
  };

  return (
    <Card data-testid="avp2-governed-access-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">AVP² governed access</CardTitle>
          <Badge variant={statusVariant(artifact.status)} data-testid="avp2-status">
            {artifact.is_live ? "Local live proof" : artifact.status === "SKIP" ? "Not live" : artifact.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{artifact.summary}</p>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Proof level</span>
          <Badge variant="outline" data-testid="avp2-proof-level">{artifact.proof_level}</Badge>
          <span className="text-muted-foreground">Provenance</span>
          <Badge variant="outline" data-testid="avp2-provenance">{artifact.provenance}</Badge>
        </div>

        <ul className="space-y-1" data-testid="avp2-steps">
          {artifact.steps.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-2 text-sm">
              <span>{s.label}</span>
              <Badge variant={stepVariant(s.status)}>{s.status}</Badge>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground" data-testid="avp2-delivered">
          Delivered: {String(artifact.delivered)}
          {artifact.delivered_ok ? " — proof resolved; a proof reference, not the content body (correct)." : ""}
        </p>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
          <div className="mb-1 font-medium">Next: {artifact.next_action}</div>
          <div className="text-muted-foreground">Federation Cloud routes (control surface):</div>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {routes.map(([label, path]) => (
              <li key={path}><span className="text-muted-foreground">{label}:</span> <code>{path}</code></li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground" data-testid="avp2-bridge-note">
          <div>Runner bridge ready: dry-run command available — <code>{AVP2_DRY_RUN_COMMAND}</code></div>
          <div>Result-file mode ready: consume a local result file niov-avp wrote.</div>
        </div>

        <div className="rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground" data-testid="avp2-live-local-note">
          <div className="font-medium">Live-local: operator-gated (no browser execution)</div>
          <div className="mt-1">Available only through an explicit operator / Tauri-or-CLI bridge — the browser never spawns a process. Expected command:</div>
          <code className="mt-1 block break-all">{AVP2_LIVE_LOCAL_COMMAND}</code>
          <div className="mt-1">Result output: <code>{LIVE_LOCAL_OUTPUT_PATH}</code></div>
          <div>Evidence output: <code>{LIVE_LOCAL_EVIDENCE_PATH}</code></div>
        </div>

        {/* Operator-gated live runner (Tauri desktop only) */}
        <div className="rounded-md border border-border p-3 text-xs" data-testid="avp2-live-runner">
          <div className="mb-1 font-medium">Run local live proof</div>
          {!bridgeAvailable ? (
            <p className="text-muted-foreground" data-testid="avp2-live-runner-unavailable">
              Live runner requires the Otzar desktop / Tauri shell. Web preview cannot execute local commands.
              The native command is pending Founder authorization (RULE 20 / ADR-0052) and is not yet registered.
            </p>
          ) : (
            <div className="space-y-2">
              <label className="block text-muted-foreground">
                niov-avp repo path
                <input
                  className="mt-1 w-full rounded border border-border bg-background p-1 font-mono text-[11px]"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  placeholder="/absolute/path/to/niov-avp"
                  data-testid="avp2-repo-input"
                />
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="avp2-run-confirm" />
                <span className="text-muted-foreground">
                  I understand this runs a local-only niov-avp strict proof command and writes
                  <code> {LIVE_LOCAL_OUTPUT_PATH}</code> and <code>{LIVE_LOCAL_EVIDENCE_PATH}</code>.
                </span>
              </label>
              <Button
                size="sm"
                variant="outline"
                disabled={!confirmed || repoPath.trim().length === 0 || running}
                onClick={() => { void runLive(); }}
                data-testid="avp2-run-button"
              >
                {running ? "Running…" : "Run local live proof"}
              </Button>
              {outcome !== null && (
                <div className="mt-1" data-testid="avp2-run-outcome">
                  {outcome.ok && outcome.artifact ? (
                    <div className="space-y-1">
                      <div>{outcome.artifact.is_live ? "✓ Local live proof" : outcome.artifact.status} · proof level <code>{outcome.artifact.proof_level}</code></div>
                      <div className="text-muted-foreground">Load <code>{outcome.evidenceOutputPath}</code> into Federation Cloud <code>/avp2/load</code>.</div>
                    </div>
                  ) : (
                    <div className="text-destructive" data-testid="avp2-run-error">Could not produce proof: {outcome.errors.join(", ")}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <Avp2EvidenceHandoffPanel />

        <p className="text-[11px] text-muted-foreground">
          Otzar creates the governed-access intent and displays the result. The browser performs no external
          write; live proof is claimed only for a LIVE_LOCAL_RUN pass and only via the operator-gated bridge.
        </p>
      </CardContent>
    </Card>
  );
}
