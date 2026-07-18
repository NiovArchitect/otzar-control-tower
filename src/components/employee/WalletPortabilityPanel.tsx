// FILE: WalletPortabilityPanel.tsx
// PURPOSE: Ambient My Twin surface for memory-wallet portability doctrine.
//          Personal skills/preferences travel with the employee across orgs;
//          org data and secrets stay. Calm, non-blocking; builds trust.
// CONNECTS TO: MyTwin.tsx, WalletPortabilityPosture types.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WalletPortabilityPosture } from "@/lib/types/foundation";

interface WalletPortabilityPanelProps {
  posture?: WalletPortabilityPosture | null;
}

export function WalletPortabilityPanel({ posture }: WalletPortabilityPanelProps) {
  if (!posture) return null;

  return (
    <Card data-testid="wallet-portability-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your AI Teammate wallet</CardTitle>
        <p className="text-sm text-muted-foreground">{posture.portable_summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3" data-testid="wallet-portability-buckets">
          {posture.buckets.map((b) => (
            <li
              key={b.class}
              className="rounded-md border border-border bg-muted/20 px-3 py-2"
            >
              <p className="text-sm font-medium">{b.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.description}</p>
              {b.examples.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {b.examples.slice(0, 3).map((ex) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground" data-testid="wallet-org-retained">
          {posture.org_retained_summary}
        </p>
        <p className="text-xs text-muted-foreground" data-testid="wallet-never-export">
          {posture.never_export_summary}
        </p>
      </CardContent>
    </Card>
  );
}
