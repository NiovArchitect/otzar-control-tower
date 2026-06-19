// FILE: CohortGovernance.tsx
// PURPOSE: Phase 1310-A — the Control Tower "Federation Cloud Cohorts" governance
//          surface over Foundation's shipped cohort substrate (1305-A registry +
//          1306-A contribution accounting + 1307-A access-request lifecycle +
//          1308-A proof/safe-signal delivery + 1309-A usage metering). It is a
//          provider/admin OVERSIGHT cockpit: list the cohorts you govern, view
//          their usage + MOCK-only economics, and approve/deny buyer access
//          requests (a HUMAN gate the backend re-checks server-side).
//
//          HONEST FRAMING. Cohorts are governed substrate, NOT a raw data sale.
//          Economics are MOCK-ONLY (is_mock / MOCK_ONLY / USDC_MOCK) — no funds
//          move, no settlement exists. Delivery returns a governed
//          proof-of-threshold, never raw data and never a numeric aggregate.
//
//          SAFE-LABELS-ONLY. Never displays raw capsule body, contributor
//          identities, exact eligible-contributor counts, or secrets. Entity ids
//          are never primary labels. Approve/deny call the backend and honor the
//          returned code; nothing is guessed client-side. The human-decider gate
//          + self-approval guard live in Foundation (1307-A) — the UI never
//          bypasses them.
//
// CONNECTS TO: src/lib/api.ts (api.cohorts.*), src/lib/types/foundation.ts
//              (SafeCohort etc.), src/lib/nav.ts + src/App.tsx (route).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  SafeCohort,
  SafeCohortAccessRequest,
} from "@/lib/types/foundation";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Safe closed-vocab label helpers (never raw tokens / UUIDs) ──────────────

function sentence(token: string): string {
  const w = token.toLowerCase().split("_").filter((x) => x.length > 0);
  if (w.length === 0) return token;
  const s = w.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function statusVariant(
  s: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "ACTIVE":
    case "APPROVED":
      return "default";
    case "DRAFT":
    case "PENDING":
      return "secondary";
    case "DENIED":
    case "REVOKED":
    case "EXPIRED":
      return "destructive";
    default:
      return "outline";
  }
}
function fmtDate(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}
function loadError(code: string): string {
  const m: Record<string, string> = {
    SESSION_INVALID: "Your session has expired. Sign in again.",
    SESSION_INVALIDATED: "Your session has expired. Sign in again.",
    COHORT_PRODUCT_NOT_FOUND: "That cohort is not available to you.",
  };
  return m[code] ?? "Could not load. Try again.";
}
function decideError(code: string): string {
  const m: Record<string, string> = {
    NOT_AUTHORIZED: "Only a human provider/admin may decide access requests.",
    SELF_APPROVAL_FORBIDDEN: "You cannot approve your own request.",
    REQUEST_NOT_PENDING: "That request was already decided.",
    SESSION_INVALID: "Your session has expired. Sign in again.",
  };
  return m[code] ?? "Could not record that decision. Try again.";
}
function actionError(code: string): string {
  const m: Record<string, string> = {
    ALREADY_JOINED: "You have already joined this cohort.",
    NOT_JOINED: "You have not joined this cohort.",
    INVALID_CONTRIBUTION_SCOPE: "That scope is not accepted by this cohort.",
    INVALID_REQUEST: "Please choose a use and access mode.",
    ACCESS_MODE_NOT_OFFERED: "That access mode is not offered.",
    USE_NOT_PERMITTED: "That use is not permitted by this cohort.",
    COHORT_NOT_ACTIVE: "This cohort is not active.",
    SESSION_INVALID: "Your session has expired. Sign in again.",
  };
  return m[code] ?? "That action could not be completed. Try again.";
}

// ── Participation + buyer-request actions (1313-B join/withdraw + 1314-A request)

function CohortActions({ cohort }: { cohort: SafeCohort }): JSX.Element {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [scope, setScope] = useState("PREFERENCE");
  const [use, setUse] = useState(cohort.allowed_uses[0] ?? "");
  const [mode, setMode] = useState(cohort.access_modes[0] ?? "");

  const refresh = (): void => {
    void qc.invalidateQueries({ queryKey: ["my-cohort-contributions"] });
    void qc.invalidateQueries({ queryKey: ["cohort-access-requests", cohort.cohort_product_id] });
  };
  const join = useMutation({
    mutationFn: () => api.cohorts.join(cohort.cohort_product_id, scope),
    onSuccess: (r) =>
      r.ok ? (setMsg("Joined — your participation is self-consented."), refresh()) : setMsg(actionError(r.code)),
  });
  const withdraw = useMutation({
    mutationFn: () => api.cohorts.withdraw(cohort.cohort_product_id),
    onSuccess: (r) =>
      r.ok ? (setMsg("Withdrawn — your participation was removed."), refresh()) : setMsg(actionError(r.code)),
  });
  const request = useMutation({
    mutationFn: () =>
      api.cohorts.requestAccess(cohort.cohort_product_id, {
        intended_use: use,
        requested_access_mode: mode,
      }),
    onSuccess: (r) =>
      r.ok ? (setMsg("Access requested — a human provider will decide."), refresh()) : setMsg(actionError(r.code)),
  });
  const busy = join.isPending || withdraw.isPending || request.isPending;

  return (
    <div className="space-y-3" data-testid="cohort-actions">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="h-8 w-40"
          aria-label="Contribution scope"
          data-testid="cohort-join-scope"
        />
        <Button size="sm" disabled={busy} onClick={() => join.mutate()} data-testid="cohort-join-button">
          Join
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => withdraw.mutate()} data-testid="cohort-withdraw-button">
          Withdraw
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={use}
          onChange={(e) => setUse(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Intended use"
          data-testid="cohort-request-use"
        >
          {cohort.allowed_uses.map((u) => (
            <option key={u} value={u}>{sentence(u)}</option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Access mode"
          data-testid="cohort-request-mode"
        >
          {cohort.access_modes.map((m) => (
            <option key={m} value={m}>{sentence(m)}</option>
          ))}
        </select>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || use === "" || mode === ""}
          onClick={() => request.mutate()}
          data-testid="cohort-request-button"
        >
          Request access
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Joining contributes your scope under self-consent (revocable any time).
        Requesting access never grants it — a human provider decides.
      </p>
      {msg !== null ? (
        <p className="text-xs text-foreground" data-testid="cohort-action-msg">{msg}</p>
      ) : null}
    </div>
  );
}

// ── Register cohort dialog (1313-B create) ──────────────────────────────────

const REGISTER_COHORT_TYPES = ["CONSUMER_BEHAVIOR", "PERSONAL_AI", "WEARABLE_AMBIENT", "ENTERPRISE_WORKFLOW", "CUSTOM"];

function RegisterCohortDialog(): JSX.Element {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cohortType, setCohortType] = useState(REGISTER_COHORT_TYPES[0]);
  const [msg, setMsg] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      api.cohorts.register({
        title,
        description,
        cohort_type: cohortType,
        access_modes: ["AGGREGATED_SIGNAL"],
        allowed_uses: ["ANALYTICS"],
        status: "ACTIVE",
      }),
    onSuccess: (r) => {
      if (r.ok) {
        setMsg(null);
        setOpen(false);
        setTitle("");
        setDescription("");
        void qc.invalidateQueries({ queryKey: ["cohorts"] });
      } else {
        setMsg(actionError(r.code));
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="register-cohort-open">Register cohort</Button>
      </DialogTrigger>
      <DialogContent data-testid="register-cohort-dialog">
        <DialogHeader>
          <DialogTitle>Register a data cohort</DialogTitle>
          <DialogDescription>
            A governed, privacy-preserving cohort. Consent, proof, and revocation
            are enforced by Foundation; economics are mock-only. Sensible safe
            defaults are applied (aggregated signal, analytics use, min size 50).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ct-title">Title</Label>
            <Input id="ct-title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="register-cohort-title" />
          </div>
          <div>
            <Label htmlFor="ct-desc">Description</Label>
            <Input id="ct-desc" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="register-cohort-desc" />
          </div>
          <div>
            <Label htmlFor="ct-type">Cohort type</Label>
            <select
              id="ct-type"
              value={cohortType}
              onChange={(e) => setCohortType(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              data-testid="register-cohort-type"
            >
              {REGISTER_COHORT_TYPES.map((t) => (
                <option key={t} value={t}>{sentence(t)}</option>
              ))}
            </select>
          </div>
          {msg !== null ? <p className="text-xs text-destructive">{msg}</p> : null}
        </div>
        <DialogFooter>
          <Button
            disabled={register.isPending || title.trim().length === 0}
            onClick={() => register.mutate()}
            data-testid="register-cohort-submit"
          >
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── My participation summary (1313-B) ───────────────────────────────────────

function MyParticipation(): JSX.Element {
  const query = useQuery({
    queryKey: ["my-cohort-contributions"],
    queryFn: () => api.cohorts.myContributions(),
  });
  const active =
    query.data?.ok === true
      ? query.data.data.contributions.filter((c) => c.status === "ELIGIBLE").length
      : 0;
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground" data-testid="my-participation">
      You are actively participating in <span className="font-medium text-foreground">{active}</span>{" "}
      cohort{active === 1 ? "" : "s"} (self-consented; revocable any time).
    </div>
  );
}

// ── Usage + mock-economics section ──────────────────────────────────────────

function UsageSection({ cohortId }: { cohortId: string }): JSX.Element {
  const query = useQuery({
    queryKey: ["cohort-usage", cohortId],
    queryFn: () => api.cohorts.usage(cohortId),
  });

  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Loading usage…</p>;
  }
  if (!query.data || !query.data.ok) {
    return (
      <p className="text-sm text-destructive" data-testid="cohort-usage-error">
        {loadError(query.data?.ok === false ? query.data.code : "UNKNOWN")}
      </p>
    );
  }
  const u = query.data.data.usage;
  const e = u.mock_economics;
  const amount =
    e.estimated_amount_usd === null
      ? "No unit price set"
      : `~$${e.estimated_amount_usd} ${e.asset}`;
  return (
    <div className="space-y-3" data-testid="cohort-usage">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-border p-2">
          <div className="text-lg font-semibold" data-testid="usage-delivered">
            {u.delivered_count}
          </div>
          <div className="text-xs text-muted-foreground">Delivered</div>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="text-lg font-semibold">{u.suppressed_count}</div>
          <div className="text-xs text-muted-foreground">Suppressed</div>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="text-lg font-semibold">{u.denied_count}</div>
          <div className="text-xs text-muted-foreground">Denied</div>
        </div>
      </div>
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Estimated (mock)</span>
          <span className="flex items-center gap-2">
            <span data-testid="usage-mock-amount">{amount}</span>
            <Badge variant="outline">Mock</Badge>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Mock economics — no funds move, no settlement exists. Billed per
          delivered proof from the cohort's advisory price; never a real charge.
        </p>
      </div>
    </div>
  );
}

// ── Access-requests section (approve / deny) ────────────────────────────────

function AccessRequestRow({
  cohortId,
  request,
  onChanged,
}: {
  cohortId: string;
  request: SafeCohortAccessRequest;
  onChanged: () => void;
}): JSX.Element {
  const [blocked, setBlocked] = useState<string | null>(null);
  const decide = useMutation({
    mutationFn: (decision: "APPROVED" | "DENIED") =>
      api.cohorts.decide(cohortId, request.request_id, { decision }),
    onSuccess: (r) =>
      r.ok ? (setBlocked(null), onChanged()) : setBlocked(decideError(r.code)),
  });
  const isPending = request.status === "PENDING";
  const busy = decide.isPending;
  return (
    <div
      className="rounded-md border border-border p-3 text-sm"
      data-testid="cohort-access-request-row"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">
            {sentence(request.intended_use)} ·{" "}
            {sentence(request.requested_access_mode)}
          </div>
          <div className="text-xs text-muted-foreground">
            Requested {fmtDate(request.requested_at)}
            {request.requires_review ? " · review required" : ""}
          </div>
        </div>
        <Badge variant={statusVariant(request.status)}>
          {sentence(request.status)}
        </Badge>
      </div>
      {isPending ? (
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => decide.mutate("APPROVED")}
            data-testid="cohort-approve-button"
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => decide.mutate("DENIED")}
            data-testid="cohort-deny-button"
          >
            Deny
          </Button>
        </div>
      ) : null}
      {blocked !== null ? (
        <p className="mt-2 text-xs text-destructive" data-testid="cohort-decide-error">
          {blocked}
        </p>
      ) : null}
    </div>
  );
}

function AccessRequestsSection({ cohortId }: { cohortId: string }): JSX.Element {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["cohort-access-requests", cohortId],
    queryFn: () => api.cohorts.accessRequests(cohortId),
  });
  const onChanged = (): void => {
    void qc.invalidateQueries({ queryKey: ["cohort-access-requests", cohortId] });
    void qc.invalidateQueries({ queryKey: ["cohort-usage", cohortId] });
  };

  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Loading access requests…</p>;
  }
  if (!query.data || !query.data.ok) {
    return (
      <p className="text-sm text-destructive" data-testid="cohort-requests-error">
        {loadError(query.data?.ok === false ? query.data.code : "UNKNOWN")}
      </p>
    );
  }
  const requests = query.data.data.access_requests;
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="cohort-requests-empty">
        No access requests yet.
      </p>
    );
  }
  return (
    <div className="space-y-2" data-testid="cohort-access-requests">
      {requests.map((r) => (
        <AccessRequestRow
          key={r.request_id}
          cohortId={cohortId}
          request={r}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

// ── Cohort detail drawer ────────────────────────────────────────────────────

function CohortDrawer({
  cohort,
  open,
  onOpenChange,
}: {
  cohort: SafeCohort | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="cohort-drawer"
      >
        <SheetTitle>{cohort?.title ?? "Cohort"}</SheetTitle>
        <SheetDescription className="mb-4">
          Governed cohort oversight. Mock-only economics — no funds move. Delivery
          returns a governed proof, never raw data.
        </SheetDescription>
        {cohort === null ? null : (
          <div className="space-y-6 text-sm">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant={statusVariant(cohort.status)}>
                  {sentence(cohort.status)}
                </Badge>
                <Badge variant="outline">{sentence(cohort.cohort_type)}</Badge>
                <Badge variant="outline">{sentence(cohort.sensitivity_class)}</Badge>
              </div>
              <p className="text-muted-foreground">{cohort.description}</p>
            </div>

            <div>
              <div className="mb-1 font-medium">Governance</div>
              <div className="flex flex-wrap gap-1">
                {cohort.consent_required ? <Badge variant="outline">Consent required</Badge> : null}
                {cohort.opt_in_required ? <Badge variant="outline">Opt-in required</Badge> : null}
                {cohort.proof_required ? <Badge variant="outline">Proof required</Badge> : null}
                {cohort.raw_body_excluded ? <Badge variant="outline">Raw body excluded</Badge> : null}
                <Badge variant="outline">Min size {cohort.minimum_cohort_size}</Badge>
              </div>
            </div>

            <div>
              <div className="mb-1 font-medium">Usage + economics</div>
              <UsageSection cohortId={cohort.cohort_product_id} />
            </div>

            <div>
              <div className="mb-1 font-medium">Participate or request access</div>
              <CohortActions cohort={cohort} />
            </div>

            <div>
              <div className="mb-1 font-medium">Access requests</div>
              <AccessRequestsSection cohortId={cohort.cohort_product_id} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Cohort card ──────────────────────────────────────────────────────────────

function CohortCard({
  cohort,
  onOpen,
}: {
  cohort: SafeCohort;
  onOpen: (c: SafeCohort) => void;
}): JSX.Element {
  return (
    <Card data-testid="cohort-card" data-cohort-id={cohort.cohort_product_id}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium" title={cohort.title}>
              {cohort.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {sentence(cohort.cohort_type)}
            </div>
          </div>
          <Badge variant={statusVariant(cohort.status)}>
            {sentence(cohort.status)}
          </Badge>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {cohort.description}
        </p>

        {cohort.access_modes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {cohort.access_modes.slice(0, 3).map((m) => (
              <Badge key={m} variant="outline">{sentence(m)}</Badge>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Min size {cohort.minimum_cohort_size}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpen(cohort)}
            data-testid="cohort-govern-button"
            aria-label={`Govern ${cohort.title}`}
          >
            Govern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function CohortGovernancePage(): JSX.Element {
  const [selected, setSelected] = useState<SafeCohort | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => api.cohorts.list(),
  });

  function openCohort(c: SafeCohort): void {
    setSelected(c);
    setDrawerOpen(true);
  }

  const cohorts: SafeCohort[] =
    query.data?.ok === true ? query.data.data.cohorts : [];

  return (
    <div className="space-y-6" data-testid="cohort-governance-page">
      <div className="flex items-start justify-between gap-2">
        <PageHeader
          title="Federation Cloud Cohorts"
          description="Discover, join, and govern data cohorts — usage, mock-only economics, participation, and buyer access requests. Cohorts deliver governed proofs, never raw data."
        />
        <RegisterCohortDialog />
      </div>

      <MyParticipation />

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Cohorts are governed substrate, not a raw data sale. Economics shown here
        are mock-only — no funds move and no settlement exists. Joining is
        self-consented and revocable; requesting access never grants it — a human
        decides, and the decision is re-checked and recorded by the backend.
      </div>

      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.data && !query.data.ok ? (
        <p className="text-sm text-destructive" data-testid="cohorts-error">
          {loadError(query.data.code)}
        </p>
      ) : cohorts.length === 0 ? (
        <Card data-testid="cohorts-empty">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No cohorts yet. Register a cohort data product through the Federation
            Cloud cohort API to govern it here.
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="cohort-grid"
        >
          {cohorts.map((c) => (
            <CohortCard key={c.cohort_product_id} cohort={c} onOpen={openCohort} />
          ))}
        </div>
      )}

      <CohortDrawer
        cohort={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
