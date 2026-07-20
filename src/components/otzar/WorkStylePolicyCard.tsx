// FILE: WorkStylePolicyCard.tsx
// PURPOSE: H-01 — Admin enables/disables professional work-style learning
//          for the org so employees can Teach Otzar how they work.
// CONNECTS TO: CompanyProfile, api.otzar.workStyle.setPolicy/status.

import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function WorkStylePolicyCard(): JSX.Element {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.otzar.workStyle.status();
    if (r.ok) {
      setEnabled(r.data.org_policy_enabled);
      setError(null);
    } else {
      setError(r.code);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setPolicy(next: boolean): Promise<void> {
    setBusy(true);
    setNotice(null);
    const r = await api.otzar.workStyle.setPolicy(next);
    setBusy(false);
    if (!r.ok) {
      setError(r.code);
      return;
    }
    setEnabled(r.data.enabled);
    setNotice(
      r.data.enabled
        ? "Professional learning is on. Employees can start visible Teach Otzar sessions in Memory."
        : "Professional learning is off. Employees cannot start new learning sessions.",
    );
  }

  return (
    <Card
      data-testid="work-style-policy-card"
      data-h01-admin="true"
      data-policy-enabled={enabled === null ? "" : enabled ? "true" : "false"}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" aria-hidden />
          Professional learning (Teach Otzar)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="work-style-policy-copy">
          When enabled, employees can run a visible learning session in Memory:
          consent → signals → review candidates → approve or reject method
          preferences. Company secrets never become portable personal memory.
          Learning never grants new permissions.
        </p>
        {error ? (
          <p className="text-amber-700" data-testid="work-style-policy-error">
            Couldn&apos;t load policy ({error}).
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground" data-testid="work-style-policy-status">
            {enabled === null
              ? "Loading…"
              : enabled
                ? "Enabled for this organization"
                : "Not enabled"}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={busy || enabled === true}
            onClick={() => void setPolicy(true)}
            data-testid="work-style-policy-enable"
          >
            {busy ? "Saving…" : "Enable for org"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || enabled === false || enabled === null}
            onClick={() => void setPolicy(false)}
            data-testid="work-style-policy-disable"
          >
            Disable
          </Button>
        </div>
        {notice ? (
          <p className="text-foreground" data-testid="work-style-policy-notice" role="status">
            {notice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
