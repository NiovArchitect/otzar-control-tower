// FILE: PortableCoreCard.tsx
// PURPOSE: I-01 / H-02 — surface the portable personal core on Memory:
//          what is yours (methods), what never travels (company work),
//          honest export-not-shipped. Classifies approved work-style prefs.
// CONNECTS TO: MyMemory, portable-core.ts, workStyle.preferences API.

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Building2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  EXPORT_HONESTY,
  NEVER_PORTABLE,
  PORTABLE_CORE_DOCTRINE,
  classifyPreferences,
  ownershipLabel,
  type ClassifiedPreference,
} from "@/lib/work-os/portable-core";

export function PortableCoreCard(): JSX.Element {
  const [rows, setRows] = useState<ClassifiedPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.otzar.workStyle.preferences();
    if (r.ok) {
      setRows(classifyPreferences(r.data.preferences ?? []));
      setError(null);
    } else {
      setError(r.code);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const portable = rows.filter((r) => r.ownership === "portable");
  const orgBound = rows.filter((r) => r.ownership === "org_bound");

  return (
    <Card
      data-testid="portable-core-card"
      data-i01="true"
      data-h02="true"
      data-portable-count={String(portable.length)}
      data-org-bound-count={String(orgBound.length)}
      data-export-available="false"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4" aria-hidden /> Your portable personal core
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="portable-core-doctrine" data-i01-doctrine="true">
          {PORTABLE_CORE_DOCTRINE}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <div
            className="rounded-md border border-border/60 p-2"
            data-testid="portable-core-travels"
          >
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
              Yours (methods &amp; preferences)
            </p>
            <p className="mt-1">
              Work-style preferences you approve in Teach Otzar stay personal.
              They are designed to travel with you in a future, consented export —
              never company substance.
            </p>
          </div>
          <div
            className="rounded-md border border-border/60 p-2"
            data-testid="portable-core-stays"
          >
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              Stays with the organization
            </p>
            <ul className="mt-1 list-inside list-disc">
              {NEVER_PORTABLE.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </div>

        {error ? (
          <p className="text-amber-700" data-testid="portable-core-error">
            Couldn&apos;t load preferences ({error}).
          </p>
        ) : null}

        {loading ? (
          <p data-testid="portable-core-loading">Loading your personal core…</p>
        ) : portable.length === 0 && orgBound.length === 0 ? (
          <p data-testid="portable-core-empty">
            No approved work-style preferences yet. Start a Teach Otzar session
            above — only what you approve becomes part of your personal core.
          </p>
        ) : (
          <div className="space-y-2" data-testid="portable-core-list">
            {portable.length > 0 ? (
              <div data-testid="portable-core-portable-list">
                <p className="font-medium text-foreground">
                  Portable preferences ({portable.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {portable.slice(0, 8).map((p) => (
                    <li
                      key={p.correction_id}
                      className="flex items-start gap-2 rounded border border-border/50 bg-card px-2 py-1"
                      data-testid="portable-core-item"
                      data-ownership="portable"
                      data-correction-id={p.correction_id}
                    >
                      <span className="mt-0.5 shrink-0 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800">
                        {ownershipLabel("portable")}
                      </span>
                      <span className="text-foreground">{p.plain}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {orgBound.length > 0 ? (
              <div data-testid="portable-core-org-list">
                <p className="font-medium text-foreground">
                  Org-bound (never portable) ({orgBound.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {orgBound.slice(0, 4).map((p) => (
                    <li
                      key={p.correction_id}
                      className="flex items-start gap-2 rounded border border-border/50 bg-card px-2 py-1"
                      data-testid="portable-core-item"
                      data-ownership="org_bound"
                      data-correction-id={p.correction_id}
                    >
                      <span className="mt-0.5 shrink-0 rounded bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        {ownershipLabel("org_bound")}
                      </span>
                      <span className="text-foreground">{p.plain}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        <p
          className="flex items-start gap-1.5 border-t border-border pt-3 text-[11px]"
          data-testid="portable-core-export-honesty"
          data-export-shipped="false"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{EXPORT_HONESTY}</span>
        </p>
      </CardContent>
    </Card>
  );
}
