// FILE: Avp2GovernedAccessCard.tsx
// PURPOSE: OTZAR-E2E-1 — a READ-ONLY "AVP² governed access" status card. It displays a
//          validated AVP2_END_TO_END_RESULT (default: the safe local-live demo) as an
//          Otzar work artifact: status, proof level/provenance, the quote → accept →
//          access receipt → proof checklist, delivered=false (proof reference, not
//          content), the next action, and the Federation Cloud routes to review evidence.
//          It has NO send/execute/external-write controls — Otzar is the user/work
//          interface here, not the executor. Live proof is shown ONLY for a LIVE_LOCAL_RUN
//          PASS; everything else is labelled not-live.
// CONNECTS TO: src/lib/avp2/e2e-display.ts, src/lib/connectors/avp2-governed-access.ts,
//          tests/unit/avp2-governed-access-card.test.tsx, src/pages/MarketplaceDiscovery.tsx.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mapAvp2ResultToOtzarArtifact } from "@/lib/avp2/e2e-display";
import { DEMO_LOCAL_LIVE_RESULT } from "@/lib/connectors/avp2-governed-access";
import { AVP2_DRY_RUN_COMMAND } from "@/lib/avp2/e2e-runner-bridge";
import type { E2EResult, StepStatus } from "@/lib/avp2/e2e-contracts";

function statusVariant(s: "PASS" | "SKIP" | "FAIL"): "default" | "warning" | "destructive" {
  return s === "PASS" ? "default" : s === "FAIL" ? "destructive" : "warning";
}
function stepVariant(s: StepStatus): "secondary" | "outline" | "destructive" {
  return s === "PASS" ? "secondary" : s === "FAIL" ? "destructive" : "outline";
}

export function Avp2GovernedAccessCard({ result }: { result?: E2EResult }): JSX.Element {
  const artifact = mapAvp2ResultToOtzarArtifact(result ?? DEMO_LOCAL_LIVE_RESULT);
  const links = artifact.federation_cloud_links;
  const routes: Array<[string, string]> = [
    ["End-to-end", links.e2e_route ?? "/avp2/e2e"],
    ["Evidence", links.evidence_route],
    ["Timeline", links.timeline_route],
    ["Registry", links.registry_route],
  ];

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
          <div>Live-local execution requires an explicit operator bridge in the next phase.</div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Read-only. Otzar creates the governed-access intent and displays the result — it performs no
          external write and claims live proof only for a LIVE_LOCAL_RUN pass.
        </p>
      </CardContent>
    </Card>
  );
}
