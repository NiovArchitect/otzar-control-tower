// FILE: TwinScopePanel.tsx
// PURPOSE: [OTZAR-V1-LIVE-2B] A calm "what your AI Twin can — and cannot — do"
//   scope surface for the employee. It makes the governed-Twin guarantee VISIBLE:
//   the Twin operates inside YOUR authority — it can only reach what you can
//   reach, and there are clear things it can never do. This is the
//   "accessible vs denied" half that My Twin was missing.
//
// GOVERNANCE BOUNDARY: every value comes from Foundation's self-scoped
//   GET /otzar/my-twin/context-health (authority capability flags + the safety
//   invariants + memory counts). Foundation OWNS and ENFORCES the scope; Otzar
//   only renders it. No Foundation data-model jargon (no wallet/capsule/TAR) —
//   employee vocabulary only.
// CONNECTS TO: api.otzar.contextHealth, /app/authority-grants (per-grant detail).

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function TwinScopePanel(): JSX.Element | null {
  const query = useQuery({
    queryKey: ["otzar", "context-health"],
    queryFn: () => api.otzar.contextHealth(),
  });

  // Calm: this is a supporting panel, not the page. If context-health is
  // unavailable, render nothing rather than a scary error state — the primary
  // My Twin identity still renders above.
  if (query.data === undefined || !query.data.ok) return null;

  const id = query.data.data.identity;
  const a = id.authority;
  const memoryItems = id.context_signals.memory_capsules_count;
  const externalApprovalRequired = a.external_write_policy === "APPROVAL_REQUIRED";

  // Can access & do — governed by YOUR authority. A capability that is off is
  // shown struck-through (honest: it tells the employee exactly where the line
  // is), not hidden.
  const canDo: Array<{ ok: boolean; label: string }> = [
    {
      ok: a.can_read_capsules,
      label: "Use your memory and the organization knowledge you're permitted to see",
    },
    {
      ok: a.can_write_capsules,
      label: "Save new memory and work entries on your behalf",
    },
    {
      ok: a.can_share_capsules,
      label: "Share scoped context with teammates you're allowed to share with",
    },
  ];

  // Cannot do — the governed boundaries. The safety invariants are always-true
  // guarantees; the external line reflects your org's posture. This is the proof
  // that the Twin is bounded, not omniscient.
  const cannotDo: string[] = [
    a.can_access_external_api
      ? externalApprovalRequired
        ? "Act on external systems only after you approve it"
        : "Act on external systems beyond your organization's set policy"
      : "Reach external systems on its own — that stays off unless you grant it",
    "See anything outside your authority — it can only access what you can access",
    "Share your private data with people who aren't authorized to see it",
  ];
  if (id.safety.no_raw_audio_storage) {
    cannotDo.push("Store your raw audio — only the transcript text is kept");
  }

  return (
    <Card data-testid="twin-scope-panel">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4" aria-hidden /> What your Twin can — and
          cannot — do
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-muted-foreground">
          Your AI Twin operates inside your authority
          {id.org.name ? ` at ${id.org.name}` : ""}. It can only reach what you
          can reach, and every action it takes is recorded.
        </p>

        <div className="space-y-1" data-testid="twin-scope-can">
          <p className="font-medium text-foreground/80">Can access &amp; do</p>
          <ul className="space-y-1">
            {canDo.map((r) => (
              <li key={r.label} className="flex items-start gap-2">
                <Check
                  className={`mt-0.5 h-3 w-3 shrink-0 ${
                    r.ok ? "text-emerald-600" : "text-muted-foreground/40"
                  }`}
                  aria-hidden
                />
                <span className={r.ok ? "" : "text-muted-foreground/60 line-through"}>
                  {r.label}
                </span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
              <span>
                Draw on {memoryItems} memory item{memoryItems === 1 ? "" : "s"}{" "}
                currently in your scope
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-1" data-testid="twin-scope-cannot">
          <p className="font-medium text-foreground/80">Cannot do</p>
          <ul className="space-y-1">
            {cannotDo.map((label) => (
              <li key={label} className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Foundation enforces this scope and proves every action in your audit
          trail.{" "}
          <Link
            to="/app/authority-grants"
            className="underline underline-offset-2"
            data-testid="twin-scope-grants-link"
          >
            Review or revoke what you've granted
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
