// FILE: ConnectorInvokeDialog.tsx
// PURPOSE: INVOKE_CONNECTOR CT surface — operator-visible
//          per-binding test-invoke modal per
//          [FOUNDER-AUTH — INVOKE_CONNECTOR CT SURFACE].
//          Operator picks a read-first operation from the
//          closed-vocab CT_INVOKE_OPERATIONS catalog for the
//          binding's type, optionally picks a fixture key to
//          force a specific error_class, and submits. The page
//          POSTs to Foundation's /api/v1/actions with
//          action_type=INVOKE_CONNECTOR and then polls the
//          Action's lifecycle until terminal, rendering only
//          the SafeActionDetailView projection (last_result_
//          summary + status + attempt_count). NEVER renders
//          secret_ref VALUE / Bearer / xoxb / ya29 / Atlassian
//          PAT / Linear OAuth / GitHub token / @outlook.com PII
//          / @onmicrosoft.com PII / JWT prefix / raw payload /
//          raw operation result body.
//
//          Read-first only. Writes are forward-substrate to
//          ≥C6 per ADR-0084.
//
// CONNECTS TO:
//   - src/lib/api.ts (api.actions.createInvokeConnector + getAction)
//   - src/lib/connectors/invoke-operations.ts (CT closed-vocab)
//   - src/lib/connectors/types.ts (CtConnectorType)
//   - src/pages/ConnectorsAdmin.tsx (the page that opens this modal)

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import {
  CT_INVOKE_FIXTURE_KEYS,
  CT_INVOKE_OPERATIONS,
} from "@/lib/connectors/invoke-operations";
import type {
  ConnectorBindingView,
  CtConnectorType,
} from "@/lib/connectors/types";
import type { ActionStatus } from "@/lib/types/foundation";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15; // ~30s max wait per test invocation

// Radix Select disallows empty-string item values. The "(no fixture
// key — happy path)" option is represented internally by this sentinel
// and translated to `undefined` at submit time so Foundation receives
// no `fixture_key` field.
const FIXTURE_NONE_SENTINEL = "__none__";

const TERMINAL_STATUSES: ReadonlySet<ActionStatus> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
  "EXPIRED",
  "REJECTED",
]);

interface ConnectorInvokeDialogProps {
  binding: ConnectorBindingView;
  open: boolean;
  onClose: () => void;
}

interface PollState {
  status: ActionStatus;
  attempt_count: number;
  last_result_summary: string | null;
}

export function ConnectorInvokeDialog({
  binding,
  open,
  onClose,
}: ConnectorInvokeDialogProps) {
  const operations = useMemo(
    () => CT_INVOKE_OPERATIONS[binding.type as CtConnectorType] ?? [],
    [binding.type],
  );
  const [operation, setOperation] = useState<string>(operations[0] ?? "");
  const [fixtureKey, setFixtureKey] = useState<string>(FIXTURE_NONE_SENTINEL);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pollState, setPollState] = useState<PollState | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  void queryClient;

  // Reset state when the dialog re-opens for a different binding
  useEffect(() => {
    if (!open) {
      setActionId(null);
      setPollState(null);
      setPollAttempts(0);
      setSubmitError(null);
      setOperation(operations[0] ?? "");
      setFixtureKey(FIXTURE_NONE_SENTINEL);
    }
  }, [open, binding.binding_id, operations]);

  const submit = useMutation({
    mutationFn: async () => {
      // Per ADR-0057 §9 idempotency_key MUST be non-empty + ≤200
      // chars. We construct a stable per-invocation key combining
      // binding_id + operation + Date.now() to keep test invocations
      // distinct without leaking secret material.
      const idempotency_key = `ct-test-invoke-${binding.binding_id}-${operation}-${Date.now()}`;
      const effectiveFixture =
        fixtureKey === FIXTURE_NONE_SENTINEL ? "" : fixtureKey;
      const payload_summary = `CT test invoke: ${binding.display_name} / ${operation}${effectiveFixture.length > 0 ? ` / ${effectiveFixture}` : ""}`;
      return api.actions.createInvokeConnector({
        binding_id: binding.binding_id,
        operation,
        ...(effectiveFixture.length > 0 ? { fixture_key: effectiveFixture } : {}),
        idempotency_key,
        payload_summary,
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setSubmitError(
          `Action create rejected (${result.code}). Try a different operation or fixture key.`,
        );
        return;
      }
      if (!result.data.ok) {
        setSubmitError("Action create failed at Foundation tier.");
        return;
      }
      setSubmitError(null);
      setActionId(result.data.action.action_id);
      setPollAttempts(0);
      setPollState({
        status: result.data.action.status,
        attempt_count: 0,
        last_result_summary: null,
      });
    },
    onError: () => {
      setSubmitError("Network error reaching Foundation. Try again in a moment.");
    },
  });

  // Polling loop: every POLL_INTERVAL_MS until terminal status OR
  // POLL_MAX_ATTEMPTS exceeded. Uses setTimeout chaining inside an
  // effect rather than setInterval so the timer cleans up when the
  // dialog closes or the actionId changes.
  useEffect(() => {
    if (actionId === null) return;
    if (pollState !== null && TERMINAL_STATUSES.has(pollState.status)) return;
    if (pollAttempts >= POLL_MAX_ATTEMPTS) return;

    const timer = setTimeout(async () => {
      const next = await api.actions.getAction(actionId);
      if (!next.ok) {
        // Treat transport / non-200 as a fall-through; stop polling
        // so the operator can see the last known state.
        return;
      }
      const action = next.data.action;
      setPollState({
        status: action.status,
        attempt_count: action.attempt_count,
        last_result_summary: action.last_result_summary,
      });
      setPollAttempts((n) => n + 1);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [actionId, pollState, pollAttempts]);

  const isTerminal =
    pollState !== null && TERMINAL_STATUSES.has(pollState.status);
  const isInFlight =
    actionId !== null &&
    pollState !== null &&
    !isTerminal &&
    pollAttempts < POLL_MAX_ATTEMPTS;
  const isPollTimedOut =
    actionId !== null && !isTerminal && pollAttempts >= POLL_MAX_ATTEMPTS;

  const submitDisabled =
    submit.isPending ||
    operation.length === 0 ||
    actionId !== null;

  function handleClose() {
    if (submit.isPending) return;
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent data-testid="invoke-dialog">
        <DialogHeader>
          <DialogTitle>Test-invoke binding: {binding.display_name}</DialogTitle>
          <DialogDescription>
            Read-first invocation only. The Foundation runtime governs every
            call (secret_ref env-var NAME, governance pipeline, audit). The
            response carries safe metadata only (status + counts) — never raw
            connector payload, secret VALUE, or vendor token. Writes are not
            available at this surface.
          </DialogDescription>
        </DialogHeader>

        {operations.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="invoke-no-operations"
          >
            This connector type does not expose read-first operations at the CT
            test-invoke surface.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label htmlFor="invoke-operation">Operation</Label>
              <Select value={operation} onValueChange={setOperation}>
                <SelectTrigger
                  id="invoke-operation"
                  data-testid="invoke-operation-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operations.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Read-first only. Foundation rejects unknown operations at
                validation tier; this list mirrors the LIVE provider's
                closed-vocab.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="invoke-fixture">Fixture key (optional)</Label>
              <Select value={fixtureKey} onValueChange={setFixtureKey}>
                <SelectTrigger
                  id="invoke-fixture"
                  data-testid="invoke-fixture-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CT_INVOKE_FIXTURE_KEYS.map(({ key, label }) => {
                    const v = key === "" ? FIXTURE_NONE_SENTINEL : key;
                    return (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Fixture keys force a specific error_class without reaching the
                real vendor API. CI + dev environments leave the per-vendor
                USE_REAL flag unset; production deployments flip it
                Founder-authorized only.
              </p>
            </div>

            {submitError ? (
              <p
                className="text-xs text-destructive"
                data-testid="invoke-submit-error"
              >
                {submitError}
              </p>
            ) : null}

            {pollState !== null ? (
              <>
                <Separator />
                <div
                  className="space-y-2"
                  data-testid="invoke-result-panel"
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{pollState.status}</Badge>
                    <Badge variant="outline">
                      Attempts: {pollState.attempt_count}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium">Last result summary</div>
                    <div
                      className="text-xs text-muted-foreground"
                      data-testid="invoke-last-result-summary"
                    >
                      {pollState.last_result_summary ?? "(no summary yet)"}
                    </div>
                  </div>
                  <p className="text-xs italic text-muted-foreground">
                    Foundation's SAFE Action projection. Raw operation result
                    body, secret_ref VALUE, vendor token, attendee email, file
                    name, mail subject, issue title, repo name, branch name,
                    and PII are never rendered here.
                  </p>
                  {isInFlight ? (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid="invoke-polling"
                    >
                      Polling Foundation Action lifecycle…
                    </p>
                  ) : null}
                  {isPollTimedOut ? (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid="invoke-poll-timeout"
                    >
                      Polling stopped after {POLL_MAX_ATTEMPTS} attempts. The
                      Action may still be running; check the audit chain for
                      the terminal status.
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submit.isPending}
            data-testid="invoke-cancel"
          >
            Close
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submitDisabled || operations.length === 0}
            data-testid="invoke-submit"
          >
            {submit.isPending
              ? "Submitting…"
              : isInFlight
                ? "Polling…"
                : actionId !== null
                  ? "Done"
                  : "Test invoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
