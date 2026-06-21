// FILE: Avp2EvidenceHandoffPanel.tsx
// PURPOSE: OTZAR-E2E-6 — a READ-ONLY operator panel for the result/evidence handoff. After
//          the sidecar writes /tmp/avp2-e2e-result.json + /tmp/avp-positive-evidence.json,
//          the operator pastes the result JSON (the browser cannot read /tmp); Otzar
//          validates it and shows proof status/level, the quote→accept→access-receipt→proof
//          checklist, the "delivered=false is acceptable when proof resolved" note, the
//          evidence file path, and the Federation Cloud /avp2/load handoff. No upload, no
//          network, no execute control. Unsafe/production results are refused.
// CONNECTS TO: src/lib/avp2/e2e-handoff.ts, tests/unit/avp2-evidence-handoff.test.tsx,
//          src/components/otzar/Avp2GovernedAccessCard.tsx.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  validateAvp2ResultFileText, buildFederationCloudEvidenceHandoff,
  HANDOFF_RESULT_PATH, HANDOFF_EVIDENCE_PATH, type Avp2HandoffSummary,
} from "@/lib/avp2/e2e-handoff";

const CHECKLIST: Array<[keyof Avp2HandoffSummary["result_summary"], string]> = [
  ["discovered", "Discovered"],
  ["quoted", "Quote"],
  ["accepted", "Accept"],
  ["accessed", "Access receipt"],
  ["proof_resolved", "Proof"],
];

export function Avp2EvidenceHandoffPanel(): JSX.Element {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<Avp2HandoffSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const validate = (): void => {
    setSummary(null);
    setErrors([]);
    const v = validateAvp2ResultFileText(text);
    if (!v.ok || v.result === undefined) { setErrors(v.errors); return; }
    setSummary(buildFederationCloudEvidenceHandoff(v.result));
  };

  return (
    <div className="rounded-md border border-border p-3 text-xs" data-testid="avp2-handoff-panel">
      <div className="mb-1 font-medium">Result / evidence handoff</div>
      <p className="text-muted-foreground">
        After running the sidecar, import or reference the result/evidence files. Result file:
        <code> {HANDOFF_RESULT_PATH}</code> · Evidence file: <code>{HANDOFF_EVIDENCE_PATH}</code>.
      </p>

      <label className="mt-2 block text-muted-foreground">
        Paste AVP2_END_TO_END_RESULT JSON
        <textarea
          className="mt-1 w-full rounded border border-border bg-background p-1 font-mono text-[11px]"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"result_schema":"AVP2_END_TO_END_RESULT", ...}'
          data-testid="avp2-handoff-input"
        />
      </label>
      <Button size="sm" variant="outline" className="mt-1" disabled={text.trim().length === 0} onClick={validate} data-testid="avp2-handoff-validate">
        Validate result
      </Button>

      {errors.length > 0 && (
        <div className="mt-2 text-destructive" data-testid="avp2-handoff-error">Could not use result: {errors.join(", ")}</div>
      )}

      {summary !== null && (
        <div className="mt-2 space-y-2" data-testid="avp2-handoff-summary">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={summary.is_live ? "default" : summary.status === "FAIL" ? "destructive" : "warning"} data-testid="avp2-handoff-status">
              {summary.is_live ? "Local live proof" : summary.status === "SKIP" ? "Not live" : summary.status}
            </Badge>
            <span className="text-muted-foreground">Proof level</span>
            <Badge variant="outline" data-testid="avp2-handoff-proof-level">{summary.proof_level ?? "—"}</Badge>
          </div>

          <ul className="space-y-1" data-testid="avp2-handoff-checklist">
            {CHECKLIST.map(([key, label]) => {
              const ok = summary.result_summary[key] === true;
              return (
                <li key={String(key)} className="flex items-center justify-between gap-2">
                  <span>{label}</span>
                  <Badge variant={ok ? "secondary" : "outline"}>{ok ? "PASS" : "—"}</Badge>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-2">
              <span>Delivered</span>
              <Badge variant="outline">{String(summary.result_summary.delivered)}</Badge>
            </li>
          </ul>

          <p className="text-muted-foreground" data-testid="avp2-handoff-delivered-note">
            {summary.result_summary.delivered_ok
              ? "Delivered false is acceptable when proof resolved. Raw content was not delivered; the governed proof reference was."
              : "Proof not yet resolved — delivery state is not applicable."}
          </p>

          <div className="rounded-md border border-dashed border-border p-2">
            <div className="font-medium" data-testid="avp2-handoff-next">Next: {summary.operator_next_action}</div>
            <div className="mt-1 text-muted-foreground">Federation Cloud routes:</div>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1" data-testid="avp2-handoff-routes">
              <li><span className="text-muted-foreground">Load:</span> <code>{summary.federation_cloud.load_route}</code></li>
              <li><span className="text-muted-foreground">Evidence:</span> <code>{summary.federation_cloud.evidence_route}</code></li>
              <li><span className="text-muted-foreground">Timeline:</span> <code>{summary.federation_cloud.timeline_route}</code></li>
              <li><span className="text-muted-foreground">End-to-end:</span> <code>{summary.federation_cloud.e2e_route}</code></li>
            </ul>
          </div>

          {summary.warnings.length > 0 && (
            <div className="text-muted-foreground" data-testid="avp2-handoff-warnings">Notes: {summary.warnings.join(", ")}</div>
          )}
        </div>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        Read-only and local. Otzar does not upload the result/evidence files or call the network; load the
        evidence into Federation Cloud yourself via <code>/avp2/load</code>.
      </p>
    </div>
  );
}
