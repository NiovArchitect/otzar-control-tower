// FILE: ContextHealthBadge.tsx
// PURPOSE: Render the Phase 1205 "AI Twin context" badge on the
//          Voice page (and anywhere else the operator needs at-a-
//          glance confirmation that Otzar will recognize them).
//          Consumes GET /api/v1/otzar/my-twin/context-health.
// CONNECTS TO:
//   - apps/api/src/routes/otzar.routes.ts (GET /context-health)
//   - apps/api/src/services/otzar/identity-context.ts (the source of
//     truth for what gets surfaced)
//
// PRIVACY INVARIANT:
//   - Renders only the closed-vocab IdentityContext projection
//     Foundation already exposes. NEVER renders raw memory / raw
//     transcripts / vectors / TAR hash / session tokens / secrets.
//   - Counts only (memory summaries / transcript summaries /
//     inbound + outbound collaborations).
//   - The component does not request, store, or echo private text
//     anywhere.

import { useEffect, useState } from "react";
import type {
  ContextHealthResponse,
  ContextHealthStatus,
} from "@/lib/types/foundation";
import { api } from "@/lib/api";

interface Props {
  /** Optional className for the outer card. */
  className?: string;
}

const STATUS_LABEL: Record<ContextHealthStatus, string> = {
  READY: "Twin context ready",
  PARTIAL: "Partial context",
  UNCONFIGURED: "Context not wired",
};

const STATUS_DOT: Record<ContextHealthStatus, string> = {
  READY: "bg-emerald-500",
  PARTIAL: "bg-amber-500",
  UNCONFIGURED: "bg-rose-500",
};

export function ContextHealthBadge({ className }: Props): JSX.Element {
  const [resp, setResp] = useState<ContextHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.otzar
      .contextHealth()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setResp(result.data);
          setError(null);
        } else {
          setError(result.code);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("NETWORK_ERROR");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        className={`rounded-md border p-3 text-sm text-muted-foreground ${className ?? ""}`}
        data-testid="context-health-loading"
      >
        Loading AI Twin context…
      </div>
    );
  }

  if (error !== null || resp === null) {
    return (
      <div
        className={`rounded-md border border-rose-400/40 p-3 text-sm ${className ?? ""}`}
        role="alert"
        data-testid="context-health-error"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden />
          <span className="font-medium">AI Twin context unavailable</span>
        </div>
        <div className="mt-1 text-muted-foreground">
          {error ?? "Unknown error"}.
        </div>
      </div>
    );
  }

  const { status, identity } = resp;
  const { viewer, org, twin, projects, context_signals } = identity;

  return (
    <div
      className={`rounded-md border p-3 text-sm ${className ?? ""}`}
      data-testid="context-health-badge"
      data-status={status}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`}
          aria-hidden
        />
        <span className="font-medium">{STATUS_LABEL[status]}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Signed in as</dt>
        <dd data-testid="ctx-viewer">{viewer.display_name}</dd>

        {viewer.email !== null ? (
          <>
            <dt className="text-muted-foreground">Email</dt>
            <dd data-testid="ctx-email">{viewer.email}</dd>
          </>
        ) : null}

        <dt className="text-muted-foreground">Role</dt>
        <dd data-testid="ctx-role">{viewer.title}</dd>

        {org.name !== null ? (
          <>
            <dt className="text-muted-foreground">Org</dt>
            <dd data-testid="ctx-org">{org.name}</dd>
          </>
        ) : null}

        <dt className="text-muted-foreground">Twin</dt>
        <dd data-testid="ctx-twin">
          {twin.active && twin.display_name !== null
            ? twin.display_name
            : "Not assigned"}
        </dd>

        <dt className="text-muted-foreground">Projects</dt>
        <dd data-testid="ctx-projects">{projects.length}</dd>

        <dt className="text-muted-foreground">Memory summaries</dt>
        <dd data-testid="ctx-memory">
          {context_signals.memory_capsules_count}
        </dd>

        <dt className="text-muted-foreground">Transcript summaries</dt>
        <dd data-testid="ctx-transcripts">
          {context_signals.transcript_summaries_count}
        </dd>

        <dt className="text-muted-foreground">Inbound collaborations</dt>
        <dd data-testid="ctx-inbound">
          {context_signals.collaboration_inbound_count}
        </dd>

        <dt className="text-muted-foreground">Outbound collaborations</dt>
        <dd data-testid="ctx-outbound">
          {context_signals.collaboration_outbound_count}
        </dd>
      </dl>
    </div>
  );
}
