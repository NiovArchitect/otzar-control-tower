// FILE: BulkActionsBar.tsx
// PURPOSE: Reusable bulk-action toolbar that appears above a table
//          when one or more rows are selected. Per decision #22:
//          fan-out via Promise.allSettled, per-item progress text,
//          "Retry failed only" CTA after partial failure.
// CONNECTS TO: Users (12B.2 — Suspend/Reactivate selected),
//              AI Teammates (12B.3 — Suspend selected twins),
//              Access Control (12B.4 — Revoke selected bridges).
//
// JUSTIFICATION (per CLAUDE.md "reused 3+ times" rule):
// Bulk actions on tabular data appear on at least three screens
// in 12B-12F (Users, AI Teammates, Access Control). The Promise.
// allSettled fan-out + per-item progress + retry-failed-only logic
// is non-trivial and drift-prone if reimplemented per screen.
// Centralizing here keeps the contract uniform and makes the
// "audit-aware bulk" pattern legible.

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuditEventTooltip } from "@/components/audit/AuditEventTooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import { cn } from "@/lib/utils";
import type { AuditEventType } from "@/lib/types/foundation";

export interface BulkActionItemResult {
  ok: boolean;
  audit_event_id?: string;
  error?: string;
}

export interface BulkAction<TId> {
  /** Stable key for diffing actions in the toolbar render. */
  key: string;
  label: string;
  /** AuditEventType literal that will be written for each item. */
  audit_event_type: AuditEventType;
  /** Optional sub-action label (e.g., "ENTITY_SUSPENDED"). */
  audit_action_label?: string;
  /** When true, opens a confirmation dialog before fan-out. */
  requireConfirmation?: boolean;
  variant?: "default" | "destructive";
  /** Per-item handler. Resolves with { ok, audit_event_id? | error? }
   *  per item; the bar handles aggregation, progress, and retries. */
  perItem: (id: TId) => Promise<BulkActionItemResult>;
  /** Plain-English description of what the action does (used in
   *  confirmation dialog body). */
  confirmationDescription?: string;
}

interface BulkActionsBarProps<TId> {
  selectedIds: TId[];
  onClearSelection: () => void;
  actions: BulkAction<TId>[];
  /** Optional rendering for displayed item label in progress text.
   *  Defaults to id.toString(). */
  renderItemLabel?: (id: TId) => string;
}

interface ProgressState<TId> {
  running: boolean;
  total: number;
  completed: number;
  failures: Array<{ id: TId; error: string }>;
  action: BulkAction<TId> | null;
}

export function BulkActionsBar<TId>({
  selectedIds,
  onClearSelection,
  actions,
  renderItemLabel,
}: BulkActionsBarProps<TId>) {
  const [pendingAction, setPendingAction] = useState<BulkAction<TId> | null>(
    null,
  );
  const [progress, setProgress] = useState<ProgressState<TId>>({
    running: false,
    total: 0,
    completed: 0,
    failures: [],
    action: null,
  });

  if (selectedIds.length === 0) {
    return null;
  }

  async function fanOut(action: BulkAction<TId>, ids: TId[]): Promise<void> {
    setProgress({
      running: true,
      total: ids.length,
      completed: 0,
      failures: [],
      action,
    });
    const failures: Array<{ id: TId; error: string }> = [];
    let completed = 0;

    const results = await Promise.allSettled(
      ids.map((id) => action.perItem(id)),
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const id = ids[i] as TId;
      completed += 1;
      if (r === undefined) continue;
      if (r.status === "rejected") {
        failures.push({
          id,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      } else if (!r.value.ok) {
        failures.push({ id, error: r.value.error ?? "unknown error" });
      }
      setProgress((prev) => ({ ...prev, completed }));
    }

    const successCount = ids.length - failures.length;
    if (failures.length === 0) {
      toast.success(
        `${action.label} complete (${successCount} of ${ids.length}).`,
      );
      // Surface one representative audit_event_id from the first
      // successful row when available -- informational proof only. No
      // clickable link: a Security & Audit detail viewer does not exist
      // yet, so there is no dead-end navigation to a placeholder.
      const firstSuccess = (results.find(
        (r) => r.status === "fulfilled" && r.value.ok,
      ) as PromiseFulfilledResult<BulkActionItemResult> | undefined)?.value;
      if (firstSuccess?.audit_event_id) {
        toast.success("Audit recorded", {
          description: `AUDIT_ID_${firstSuccess.audit_event_id.slice(0, 8)}…`,
        });
      }
      onClearSelection();
    } else {
      toast.error(
        `${action.label} partial: ${successCount} succeeded, ${failures.length} failed.`,
      );
    }

    setProgress({
      running: false,
      total: ids.length,
      completed: ids.length,
      failures,
      action,
    });
  }

  function handleActionClick(action: BulkAction<TId>): void {
    if (action.requireConfirmation) {
      setPendingAction(action);
    } else {
      void fanOut(action, selectedIds);
    }
  }

  function retryFailedOnly(): void {
    if (progress.action === null || progress.failures.length === 0) return;
    void fanOut(
      progress.action,
      progress.failures.map((f) => f.id),
    );
  }

  const inFlight = progress.running;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {selectedIds.length} selected
        </span>
        {inFlight && progress.action && (
          <span className="ml-2">
            · {progress.action.label}: {progress.completed} of {progress.total}
            ...
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!inFlight && progress.failures.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retryFailedOnly}
          >
            Retry failed only ({progress.failures.length})
          </Button>
        )}
        {actions.map((action) => (
          <div key={action.key} className="flex flex-col items-end gap-0.5">
            <Button
              type="button"
              variant={action.variant === "destructive" ? "destructive" : "default"}
              size="sm"
              onClick={() => handleActionClick(action)}
              disabled={inFlight}
            >
              {inFlight && progress.action?.key === action.key ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Logging audit event...
                </>
              ) : (
                action.label
              )}
            </Button>
            <AuditEventTooltip
              eventType={action.audit_event_type}
              actionLabel={action.audit_action_label}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={inFlight}
        >
          Clear
        </Button>
      </div>

      {/* Confirmation dialog for actions that require it */}
      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction
                ? `${pendingAction.label} ${selectedIds.length} member${selectedIds.length === 1 ? "" : "s"}?`
                : ""}
            </DialogTitle>
            {pendingAction?.confirmationDescription && (
              <DialogDescription>
                {pendingAction.confirmationDescription}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Action target:</span>{" "}
              {selectedIds.length} member{selectedIds.length === 1 ? "" : "s"}
              {renderItemLabel && selectedIds.length <= 3
                ? ` (${selectedIds.map(renderItemLabel).join(", ")})`
                : ""}
            </p>
            {pendingAction && (
              <p>
                <span className="font-medium">Audit event:</span>{" "}
                {getAuditEventLabel(pendingAction.audit_event_type)}
                {pendingAction.audit_action_label
                  ? ` (${pendingAction.audit_action_label})`
                  : ""}{" "}
                · written per item
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingAction(null)}
              disabled={inFlight}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                pendingAction?.variant === "destructive"
                  ? "destructive"
                  : "default"
              }
              onClick={() => {
                if (pendingAction !== null) {
                  void fanOut(pendingAction, selectedIds);
                  setPendingAction(null);
                }
              }}
              disabled={inFlight || pendingAction === null}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
