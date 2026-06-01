// FILE: Security.tsx
// PURPOSE: Section 7 (Full Audit Viewer) consumer surface — replaces
//          the Placeholder with the customer-facing Security & Audit
//          screen. Consumes Foundation Wave 1 self-scope reads only
//          at this slice:
//            GET /api/v1/audit/events       (SafeAuditEventView[])
//            GET /api/v1/audit/events/:id   (SafeAuditEventDetailView)
//          Renders an immutable, paginated audit log for the signed-
//          in caller's own actions plus a side panel surfacing the
//          single-event drilldown with previous / next chain refs.
//
//          Org / platform / regulator scopes + bounded NDJSON / CSV
//          export + verify-chain panel + filtering UI are forward-
//          substrate — each is its own bounded follow-on slice
//          consuming already-LIVE Foundation routes.
//
//          NO raw payload, NO raw prompt, NO chain-of-thought, NO
//          secret_ref, NO connector_payload, NO embeddings: the
//          Foundation `SafeAuditEventView` projection is safe-by-
//          construction per ADR-0071 §3 + the write-time no-leak
//          guard at Foundation; this page additionally guards
//          against rendering forbidden enum values or surveillance
//          copy at the test tier.
//
//          Self-scope only — never asks for `scope=org` /
//          `scope=platform` / `scope=regulator`. The Foundation
//          service tier defaults to self when the param is absent.
// CONNECTS TO: src/lib/api.ts (api.audit.list / api.audit.detail);
//              src/lib/types/foundation.ts (SafeAuditEventView /
//              SafeAuditEventDetailView / AuditEventChainRef);
//              src/lib/audit/event-types.ts (getAuditEventLabel);
//              src/lib/utils/relative-time.ts (formatRelativeTime);
//              src/components/PageHeader.tsx;
//              src/components/ui/card.tsx, badge.tsx, button.tsx,
//              skeleton.tsx, separator.tsx.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type {
  SafeAuditEventView,
  SafeAuditEventDetailView,
  AuditEventChainRef,
  AuditOutcome,
  AuditEventType,
  VerifyChainView,
  AuditExportFormat,
  ExportAuditEventsInput,
} from "@/lib/types/foundation";
import { getAuditEventLabel, AUDIT_EVENT_TYPE_LABELS } from "@/lib/audit/event-types";
import { formatRelativeTime } from "@/lib/utils/relative-time";

const PAGE_SIZE = 25;

// WHAT: Closed-vocab filter state for the audit-events list.
//        Mirrors the Foundation route query-string contract at
//        `apps/api/src/routes/audit.routes.ts` Section 7 Wave 1:
//        `event_type` + `outcome` + `target_entity_id` +
//        `target_capsule_id` + `start_time` + `end_time`. This
//        slice wires the two highest-value filters (event_type +
//        outcome); ID search + date range pickers are forward-
//        substrate behind separate follow-on slices.
interface AuditListFilters {
  event_type: AuditEventType | "all";
  outcome: AuditOutcome | "all";
}

const DEFAULT_FILTERS: AuditListFilters = {
  event_type: "all",
  outcome: "all",
};

// WHAT: Closed-vocab outcome options.
const OUTCOME_OPTIONS: readonly { value: AuditOutcome; label: string }[] = [
  { value: "SUCCESS", label: "Success" },
  { value: "DENIED", label: "Denied" },
  { value: "FAILURE", label: "Failure" },
];

// WHAT: Closed-vocab export format options.
const EXPORT_FORMAT_OPTIONS: readonly {
  value: AuditExportFormat;
  label: string;
  extension: string;
  mime: string;
}[] = [
  {
    value: "ndjson",
    label: "NDJSON",
    extension: "ndjson",
    mime: "application/x-ndjson",
  },
  {
    value: "csv",
    label: "CSV",
    extension: "csv",
    mime: "text/csv",
  },
];

// WHAT: Closed-vocab Badge variant for the audit outcome.
function outcomeBadge(outcome: AuditOutcome): {
  variant: "default" | "secondary" | "outline" | "destructive";
  label: string;
} {
  switch (outcome) {
    case "SUCCESS":
      return { variant: "secondary", label: "Success" };
    case "DENIED":
      return { variant: "destructive", label: "Denied" };
    default:
      return { variant: "outline", label: outcome };
  }
}

// WHAT: Compact, deterministic timestamp formatter for the table.
//        Reuses formatRelativeTime for the muted secondary line.
function fullTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  } catch {
    return iso;
  }
}

// WHAT: Closed-vocab detail-row helper. Renders a labelled scalar
//        as a one-line key/value pair.
function DetailRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string | null;
  testId?: string;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-x-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className="break-all font-mono text-foreground"
        {...(testId !== undefined ? { "data-testid": testId } : {})}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function ChainRefRow({
  label,
  chainRef,
}: {
  label: string;
  chainRef: AuditEventChainRef | null | undefined;
}) {
  // NOTE: prop intentionally named `chainRef` (NOT `ref`) — React
  // reserves the literal `ref` prop name for ref-forwarding, so a
  // function component receives `undefined` when callers pass
  // `ref={...}` directly instead of via React.forwardRef.
  if (chainRef === null || chainRef === undefined) {
    return (
      <div className="grid grid-cols-[160px_1fr] items-baseline gap-x-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">—</span>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-x-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="space-y-1">
        <span className="block break-all font-mono text-foreground">
          {chainRef.audit_id}
        </span>
        <span className="block text-[10px] text-muted-foreground">
          {formatRelativeTime(chainRef.timestamp)} · hash{" "}
          {chainRef.event_hash.slice(0, 12)}…
        </span>
      </div>
    </div>
  );
}

function EventListRow({
  event,
  selected,
  onSelect,
}: {
  event: SafeAuditEventView;
  selected: boolean;
  onSelect: (auditId: string) => void;
}) {
  const outcome = outcomeBadge(event.outcome);
  const actionLabel =
    typeof event.details["action"] === "string"
      ? (event.details["action"] as string)
      : null;
  return (
    <li
      className={`rounded-md border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40"
      }`}
      data-testid="audit-row"
      data-audit-id={event.audit_id}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onSelect(event.audit_id)}
        data-testid={`audit-row-button-${event.audit_id}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {getAuditEventLabel(event.event_type)}
              </span>
              <Badge variant={outcome.variant} className="text-[10px]">
                {outcome.label}
              </Badge>
              {actionLabel !== null && (
                <Badge variant="outline" className="text-[10px]">
                  {actionLabel}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatRelativeTime(event.timestamp)} ·{" "}
              <span className="font-mono">{event.event_hash.slice(0, 12)}…</span>
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {fullTimestamp(event.timestamp)}
          </span>
        </div>
      </button>
    </li>
  );
}

function EventDetailPanel({
  auditId,
}: {
  auditId: string | null;
}) {
  const detailQuery = useQuery({
    queryKey: ["audit", "detail", auditId],
    queryFn: () =>
      api.audit.detail(auditId as string).then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
    enabled: auditId !== null,
  });

  if (auditId === null) {
    return (
      <Card data-testid="audit-detail-empty">
        <CardHeader>
          <CardTitle className="text-base">Event detail</CardTitle>
          <CardDescription>
            Select an event from the list to see its safe metadata and
            chain references. No raw payloads are ever displayed.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (detailQuery.isLoading || detailQuery.isFetching) {
    return (
      <Card data-testid="audit-detail-loading">
        <CardHeader>
          <CardTitle className="text-base">Event detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (detailQuery.isError || detailQuery.data === undefined) {
    const code =
      detailQuery.error instanceof Error
        ? detailQuery.error.message
        : "UNKNOWN_ERROR";
    return (
      <Card data-testid="audit-detail-error">
        <CardHeader>
          <CardTitle className="text-base">Event detail unavailable</CardTitle>
          <CardDescription>
            The selected event could not be loaded. Code:{" "}
            <span className="font-mono">{code}</span>. This may indicate
            the event was not visible at your access scope.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const event: SafeAuditEventDetailView = detailQuery.data.event;
  const outcome = outcomeBadge(event.outcome);
  const actionLabel =
    typeof event.details["action"] === "string"
      ? (event.details["action"] as string)
      : null;

  return (
    <Card data-testid="audit-detail-panel">
      <CardHeader>
        <CardTitle className="text-base">Event detail</CardTitle>
        <CardDescription className="text-xs">
          Safe metadata only. No raw payload, no message body, no
          secret references.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {getAuditEventLabel(event.event_type)}
            </span>
            <Badge variant={outcome.variant} className="text-[10px]">
              {outcome.label}
            </Badge>
            {actionLabel !== null && (
              <Badge variant="outline" className="text-[10px]">
                {actionLabel}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {fullTimestamp(event.timestamp)}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <DetailRow
            label="Audit id"
            value={event.audit_id}
            testId="detail-audit-id"
          />
          <DetailRow label="Event type" value={event.event_type} />
          <DetailRow label="Outcome" value={event.outcome} />
          {event.denial_reason !== null && (
            <DetailRow
              label="Denial reason"
              value={event.denial_reason}
            />
          )}
          <DetailRow label="Actor" value={event.actor_entity_id} />
          <DetailRow label="Target entity" value={event.target_entity_id} />
          <DetailRow label="Target capsule" value={event.target_capsule_id} />
          <DetailRow label="Session" value={event.session_id} />
          <DetailRow label="Jurisdiction" value={event.jurisdiction} />
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Chain integrity
          </h4>
          <DetailRow
            label="Event hash"
            value={event.event_hash}
            testId="detail-event-hash"
          />
          <DetailRow
            label="Previous hash"
            value={event.previous_event_hash}
          />
          <ChainRefRow
            label="Previous event"
            chainRef={event.previous_event}
          />
          <ChainRefRow label="Next event" chainRef={event.next_event} />
        </div>

        {(event.lawful_basis_id !== null ||
          event.lawful_basis_chain_hash !== null) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Lawful basis
              </h4>
              <DetailRow
                label="Basis id"
                value={event.lawful_basis_id}
              />
              <DetailRow
                label="Basis chain hash"
                value={event.lawful_basis_chain_hash}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// Verify-chain panel (CT D2.2). Consumes
// `GET /api/v1/audit/verify-chain?scope=self` per ADR-0071 §3.
// Self-scope only at this CT slice. Renders the closed-vocab
// SAFE outcome (verified flag + checked_event_count +
// chain_algorithm + window + first/last event refs + optional
// broken_at + closed-vocab failure_reason + Foundation
// evidence_note + honest_note). NEVER renders raw event bodies
// or chain data. Manual click-to-run only — never auto-runs.
// ════════════════════════════════════════════════════════════════
function VerifyChainPanel() {
  const [hasRun, setHasRun] = useState(false);
  const verifyQuery = useQuery({
    queryKey: ["audit", "verify-chain", "self"],
    queryFn: () =>
      api.audit.verifyChain({ scope: "self" }).then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
    enabled: hasRun,
  });

  function renderBody() {
    if (!hasRun) {
      return (
        <p
          className="text-sm text-muted-foreground"
          data-testid="verify-chain-idle"
        >
          Click <strong>Verify chain</strong> to run a self-scope
          chain-integrity check against your own audit history.
          Self-scope only at this version.
        </p>
      );
    }
    if (verifyQuery.isLoading || verifyQuery.isFetching) {
      return (
        <div className="space-y-2" data-testid="verify-chain-loading">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
    }
    if (verifyQuery.isError || verifyQuery.data === undefined) {
      const code =
        verifyQuery.error instanceof Error
          ? verifyQuery.error.message
          : "UNKNOWN_ERROR";
      return (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
          data-testid="verify-chain-error"
        >
          Chain verification could not run. Code:{" "}
          <span className="font-mono">{code}</span>. This may
          indicate the chain was not visible at your access scope.
        </div>
      );
    }
    const view: VerifyChainView = verifyQuery.data;
    return (
      <div className="space-y-3" data-testid="verify-chain-result">
        <div className="flex flex-wrap items-center gap-2">
          {view.verified ? (
            <Badge variant="secondary" className="text-[10px]">
              Verified
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px]">
              Verification failed
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            Scope: {view.scope}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {view.checked_event_count} event
            {view.checked_event_count === 1 ? "" : "s"} checked
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Algorithm: {view.chain_algorithm}
          </Badge>
        </div>
        <Separator />
        <div className="space-y-2">
          <DetailRow label="Window start" value={view.window_start} />
          <DetailRow label="Window end" value={view.window_end} />
          <DetailRow label="First event id" value={view.first_event_id} />
          <DetailRow label="Last event id" value={view.last_event_id} />
          <DetailRow
            label="First event hash"
            value={view.first_event_hash}
          />
          <DetailRow
            label="Last event hash"
            value={view.last_event_hash}
          />
          {view.lawful_basis_id !== null && (
            <DetailRow
              label="Lawful basis id"
              value={view.lawful_basis_id}
            />
          )}
        </div>
        {!view.verified && (
          <>
            <Separator />
            <div className="space-y-2" data-testid="verify-chain-failure">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                Chain break
              </h4>
              <DetailRow
                label="Broken at event id"
                value={view.broken_at_event_id}
              />
              <DetailRow
                label="Failure reason"
                value={view.failure_reason}
              />
            </div>
          </>
        )}
        <Separator />
        <p className="text-[11px] text-muted-foreground">
          {view.evidence_note}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {view.honest_note}
        </p>
      </div>
    );
  }

  return (
    <Card data-testid="verify-chain-card">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Chain integrity</CardTitle>
          <CardDescription className="text-xs">
            Self-scope chain-integrity verification — confirms
            every checked row's hash recomputes to its stored
            event_hash and every previous-event-hash links to its
            predecessor. Closed-vocab failure surface only.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setHasRun(true);
            if (hasRun) {
              void verifyQuery.refetch();
            }
          }}
          disabled={verifyQuery.isFetching}
          data-testid="verify-chain-run"
        >
          {verifyQuery.isFetching
            ? "Verifying…"
            : hasRun
              ? "Re-verify chain"
              : "Verify chain"}
        </Button>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// ExportActionBar (CT D2.3 audit export). Consumes
// `GET /api/v1/audit/events/export?format=ndjson|csv&...` per
// Foundation Section 7 Hardening Wave A. Bounded by Foundation
// EXPORT_AUDIT_EVENTS_MAX_ROWS (10 000) hard cap; respects the
// active list filters so the download matches the on-screen
// view. Self-scope only at this CT slice. NEVER renders raw
// payload — body is the Foundation-emitted SafeAuditEventView
// stream, identical safety surface to the list endpoint.
// ════════════════════════════════════════════════════════════════
function ExportActionBar({
  filters,
}: {
  filters: AuditListFilters;
}) {
  const [format, setFormat] = useState<AuditExportFormat>("ndjson");
  const [isExporting, setIsExporting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<{
    rowCount: number;
    truncated: boolean;
    format: AuditExportFormat;
  } | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setLastError(null);
    try {
      const input: ExportAuditEventsInput = { format };
      if (filters.event_type !== "all") {
        input.event_type = filters.event_type;
      }
      if (filters.outcome !== "all") {
        input.outcome = filters.outcome;
      }
      const result = await api.audit.export(input);
      if (!result.ok) {
        setLastError(result.code);
        return;
      }
      const ext =
        EXPORT_FORMAT_OPTIONS.find((o) => o.value === result.data.format)
          ?.extension ?? "txt";
      const mime =
        EXPORT_FORMAT_OPTIONS.find((o) => o.value === result.data.format)
          ?.mime ?? "text/plain";
      const blob = new Blob([result.data.body], {
        type: `${mime}; charset=utf-8`,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `audit-events-${result.data.scope}-${ts}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastSummary({
        rowCount: result.data.row_count,
        truncated: result.data.truncated,
        format: result.data.format,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      className="rounded-md border border-border bg-muted/30 p-3"
      data-testid="audit-export-bar"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="audit-export-format" className="text-xs">
            Export format
          </Label>
          <Select
            value={format}
            onValueChange={(value) =>
              setFormat(value as AuditExportFormat)
            }
          >
            <SelectTrigger
              id="audit-export-format"
              data-testid="audit-export-format"
              className="h-9 w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPORT_FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
          data-testid="audit-export-download"
        >
          {isExporting ? "Exporting…" : "Download export"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Self-scope only. Hard-capped at 10 000 rows; active
          filters apply.
        </p>
      </div>
      {lastError !== null && (
        <p
          className="mt-2 text-xs text-destructive"
          data-testid="audit-export-error"
        >
          Export failed. Code:{" "}
          <span className="font-mono">{lastError}</span>.
        </p>
      )}
      {lastSummary !== null && lastError === null && (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-testid="audit-export-summary"
        >
          Last export: {lastSummary.rowCount} row
          {lastSummary.rowCount === 1 ? "" : "s"} ·{" "}
          {lastSummary.format.toUpperCase()}
          {lastSummary.truncated
            ? " · truncated at the 10 000-row cap"
            : ""}
          .
        </p>
      )}
    </div>
  );
}

export function SecurityPage() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditListFilters>(DEFAULT_FILTERS);
  const filtersAreDefault =
    filters.event_type === DEFAULT_FILTERS.event_type &&
    filters.outcome === DEFAULT_FILTERS.outcome;

  // Reset to page 1 whenever filters change so the pager is
  // always coherent with the active filter set.
  function applyFilters(next: AuditListFilters) {
    setFilters(next);
    setPage(1);
    setSelectedId(null);
  }
  function resetFilters() {
    applyFilters(DEFAULT_FILTERS);
  }

  const listQuery = useQuery({
    queryKey: [
      "audit",
      "list",
      page,
      filters.event_type,
      filters.outcome,
    ],
    queryFn: () => {
      const args: Parameters<typeof api.audit.list>[0] = {
        page,
        page_size: PAGE_SIZE,
      };
      if (filters.event_type !== "all") {
        args.event_type = filters.event_type;
      }
      if (filters.outcome !== "all") {
        args.outcome = filters.outcome;
      }
      return api.audit.list(args).then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      });
    },
  });

  const events = useMemo<readonly SafeAuditEventView[]>(
    () => listQuery.data?.events ?? [],
    [listQuery.data],
  );
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.page_size ?? PAGE_SIZE;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6" data-testid="security-audit-page">
      <PageHeader
        title="Security & Audit"
        description="Immutable record of every action that touched data, scoped to your own activity. Safe metadata only — no raw payloads."
      />
      <VerifyChainPanel />
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card data-testid="audit-list-card">
          <CardHeader>
            <CardTitle className="text-base">Audit events</CardTitle>
            <CardDescription>
              Self-scope only at this version. Org-wide review,
              regulator-tier evidence packages, NDJSON / CSV export, and
              chain-integrity verification are reserved for later
              versions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              data-testid="audit-filter-bar"
            >
              <div className="space-y-1">
                <Label
                  htmlFor="audit-filter-event-type"
                  className="text-xs"
                >
                  Event type
                </Label>
                <Select
                  value={filters.event_type}
                  onValueChange={(value) =>
                    applyFilters({
                      ...filters,
                      event_type: value as AuditListFilters["event_type"],
                    })
                  }
                >
                  <SelectTrigger
                    id="audit-filter-event-type"
                    data-testid="audit-filter-event-type"
                    className="h-9"
                  >
                    <SelectValue placeholder="All event types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All event types</SelectItem>
                    {(
                      Object.entries(AUDIT_EVENT_TYPE_LABELS) as readonly [
                        AuditEventType,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="audit-filter-outcome"
                  className="text-xs"
                >
                  Outcome
                </Label>
                <Select
                  value={filters.outcome}
                  onValueChange={(value) =>
                    applyFilters({
                      ...filters,
                      outcome: value as AuditListFilters["outcome"],
                    })
                  }
                >
                  <SelectTrigger
                    id="audit-filter-outcome"
                    data-testid="audit-filter-outcome"
                    className="h-9"
                  >
                    <SelectValue placeholder="All outcomes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outcomes</SelectItem>
                    {OUTCOME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={filtersAreDefault}
                  onClick={resetFilters}
                  data-testid="audit-filter-reset"
                >
                  Reset filters
                </Button>
              </div>
            </div>
            <ExportActionBar filters={filters} />
            {listQuery.isLoading && (
              <ul className="space-y-2" data-testid="audit-list-loading">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-16 w-full" />
                  </li>
                ))}
              </ul>
            )}
            {listQuery.isError && (
              <div
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
                data-testid="audit-list-error"
              >
                Failed to load audit events. Code:{" "}
                <span className="font-mono">
                  {listQuery.error instanceof Error
                    ? listQuery.error.message
                    : "UNKNOWN_ERROR"}
                </span>
                .
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => listQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            )}
            {!listQuery.isLoading &&
              !listQuery.isError &&
              events.length === 0 && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="audit-list-empty"
                >
                  No audit events recorded yet. Your audit log will
                  appear here as your governed actions occur.
                </p>
              )}
            {events.length > 0 && (
              <ul className="space-y-2" data-testid="audit-list">
                {events.map((event) => (
                  <EventListRow
                    key={event.audit_id}
                    event={event}
                    selected={selectedId === event.audit_id}
                    onSelect={setSelectedId}
                  />
                ))}
              </ul>
            )}
            {total > 0 && (
              <div
                className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground"
                data-testid="audit-pager"
              >
                <span>
                  Page {page} of {lastPage} · {total} event
                  {total === 1 ? "" : "s"}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1 || listQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= lastPage || listQuery.isFetching}
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <EventDetailPanel auditId={selectedId} />
      </div>
    </div>
  );
}
