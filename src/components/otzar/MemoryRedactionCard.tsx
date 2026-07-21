// FILE: MemoryRedactionCard.tsx
// PURPOSE: H-02 residual — redaction stress corpus + live portable scan.
// CONNECTS TO: MyMemory, memory-redaction.ts, portable-core preferences API.

import { useCallback, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  classifyPreferences,
  type ClassifiedPreference,
} from "@/lib/work-os/portable-core";
import {
  H02_REDACTION_DOCTRINE,
  H02_REDACTION_RESIDUAL,
  REDACTION_STRESS_CORPUS,
  SAFE_PREFERENCE_SAMPLES,
  scanPreferencesForUnsafePlain,
  stressCorpusAllRejected,
  safeSamplesAllAccepted,
} from "@/lib/work-os/memory-redaction";

export function MemoryRedactionCard(): JSX.Element {
  const [rows, setRows] = useState<ClassifiedPreference[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");

  const reload = useCallback(async (): Promise<void> => {
    const r = await api.otzar.workStyle.preferences();
    if (!r.ok) {
      setLoad("error");
      return;
    }
    setRows(classifyPreferences(r.data.preferences ?? []));
    setLoad("ok");
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const corpus = stressCorpusAllRejected();
  const safeOk = safeSamplesAllAccepted();
  const scan = scanPreferencesForUnsafePlain(rows);

  return (
    <Card
      data-testid="memory-redaction-card"
      data-h02-redaction="true"
      data-corpus-size={String(REDACTION_STRESS_CORPUS.length)}
      data-corpus-ok={corpus.ok ? "true" : "false"}
      data-safe-samples-ok={safeOk.ok ? "true" : "false"}
      data-live-scan-clean={scan.clean ? "true" : "false"}
      data-live-unsafe={String(scan.unsafe)}
      data-pref-total={String(scan.total)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" aria-hidden />
          Memory redaction stress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="h02-redaction-doctrine">{H02_REDACTION_DOCTRINE}</p>

        <div
          className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
          data-testid="h02-corpus-status"
        >
          <p className="font-medium text-foreground">
            Stress corpus: {REDACTION_STRESS_CORPUS.length} leak classes
          </p>
          <p data-testid="h02-corpus-result">
            {corpus.ok
              ? "All confidential samples rejected from portable core"
              : `LEAK: ${corpus.leaked.length} samples incorrectly allowed`}
          </p>
          <p data-testid="h02-safe-samples">
            Safe method samples: {safeOk.ok ? "accepted" : "blocked incorrectly"} ·{" "}
            {SAFE_PREFERENCE_SAMPLES.length} checks
          </p>
        </div>

        <div
          className="rounded-md border border-border/60 px-2 py-1.5"
          data-testid="h02-live-scan"
          data-load={load}
        >
          <p className="font-medium text-foreground">Live portable preference scan</p>
          {load === "loading" ? (
            <p data-testid="h02-scan-loading">Scanning…</p>
          ) : load === "error" ? (
            <p data-testid="h02-scan-error">
              Could not load preferences — corpus checks still apply offline.
            </p>
          ) : (
            <p data-testid="h02-scan-summary">
              {scan.total} preferences · {scan.unsafe} unsafe portable ·{" "}
              {scan.clean ? "clean" : "needs review"}
            </p>
          )}
        </div>

        <ul
          className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2"
          data-testid="h02-corpus-list"
        >
          {REDACTION_STRESS_CORPUS.map((c) => (
            <li
              key={c.id}
              className="rounded border border-border/40 px-1.5 py-1 text-[10px]"
              data-testid="h02-corpus-row"
              data-corpus-id={c.id}
              data-class={c.class}
            >
              <span className="font-medium text-foreground">{c.class}</span>
              {" · "}
              must reject
            </li>
          ))}
        </ul>

        <p data-testid="h02-redaction-residual">{H02_REDACTION_RESIDUAL}</p>
      </CardContent>
    </Card>
  );
}
