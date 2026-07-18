// FILE: AccuracyPackPanel.tsx
// PURPOSE: Phase D.1 — ambient My Twin surface for industry accuracy packs.
//          Shows which form packs (care plan, KYC, insurance) apply from org
//          industry + role template. Calm, non-blocking; never invents facts;
//          never shows raw template body or surveillance framing.
// CONNECTS TO: src/pages/app/MyTwin.tsx, AccuracyPackPosture types.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { twinAccuracyLabel } from "@/lib/work-os/twin-work";
import type { AccuracyPackPosture } from "@/lib/types/foundation";

interface AccuracyPackPanelProps {
  posture?: AccuracyPackPosture | null;
}

export function AccuracyPackPanel({ posture }: AccuracyPackPanelProps) {
  if (!posture) return null;

  const primary = posture.packs.filter((p) => p.relevance === "primary");
  const secondary = posture.packs.filter((p) => p.relevance === "secondary");
  const shown = [...primary, ...secondary, ...posture.packs.filter((p) => p.relevance === "available")].slice(
    0,
    4,
  );

  const accuracyLabel =
    twinAccuracyLabel(posture.default_accuracy_class) ??
    (posture.default_accuracy_class === "STANDARD"
      ? "Standard"
      : posture.default_accuracy_class);

  return (
    <Card data-testid="accuracy-pack-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Accuracy packs for your work</CardTitle>
        <p className="text-sm text-muted-foreground">{posture.posture_summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Industry" value={posture.industry_label} />
          {posture.role_template_label && (
            <Field label="Role template" value={posture.role_template_label} />
          )}
          <Field label="Default accuracy" value={accuracyLabel} />
          <Field
            label="Human verification"
            value={
              posture.dual_control_default
                ? "Required for high-sensitivity work"
                : "When a regulated pack is selected"
            }
          />
        </dl>

        {shown.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested form packs
            </h3>
            <ul className="space-y-2" data-testid="accuracy-pack-list">
              {shown.map((pack) => (
                <li
                  key={pack.pack_id}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2"
                  data-testid={`accuracy-pack-${pack.pack_id}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{pack.label}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {pack.relevance}
                    </span>
                    {pack.dual_control_required && (
                      <span className="text-[10px] text-muted-foreground">
                        Dual-control
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pack.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground" data-testid="never-invent-facts">
          Your AI Teammate prepares structure from communication. It never invents
          clinical or financial facts — humans verify accuracy-critical work.
        </p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
