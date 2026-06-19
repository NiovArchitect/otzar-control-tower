// FILE: AccessGrants.tsx
// PURPOSE: Phase 1311-C (Buyer Access Console) + 1312-B (Contributor Sovereignty)
//          — the Control Tower "Access & Grants" surface over Foundation's
//          governed data-access grants. Two tabs:
//          • My purchases — what the caller has access to (buyer console): per
//            grant the access policy, audit-derived usage, and mock-only
//            settlement intent.
//          • Grants on my data — grants others hold on the caller's data
//            (contributor sovereignty): who has access, the policy, usage, and a
//            VISIBLE revoke control. Revocation is enforced at read time by
//            Foundation; the UI never bypasses it.
//
//          HONEST FRAMING. Data is not sold — governed access is leased under
//          consent + proof. Economics are mock-only (no funds move). A grant
//          never delivers raw content (raw_body_excluded).
//
//          SAFE-LABELS-ONLY. Never displays raw capsule body, storage internals,
//          embeddings, or secrets. Entity ids are never primary labels. Revoke
//          calls the backend and honors the returned code.
//
// CONNECTS TO: src/lib/api.ts (api.grants.*), src/lib/types/foundation.ts,
//              src/lib/nav.ts + src/App.tsx (route).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SafeDataGrant } from "@/lib/types/foundation";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

// ── Safe label helpers ──────────────────────────────────────────────────────

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
      return "default";
    case "PENDING_CONSENT":
      return "secondary";
    case "REVOKED":
    case "EXPIRED":
    case "DENIED":
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
function shortRef(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}
function loadError(code: string): string {
  const m: Record<string, string> = {
    SESSION_INVALID: "Your session has expired. Sign in again.",
    SESSION_INVALIDATED: "Your session has expired. Sign in again.",
    GRANT_NOT_FOUND: "That grant is not available to you.",
  };
  return m[code] ?? "Could not load. Try again.";
}

// ── shared policy + usage blocks ────────────────────────────────────────────

function PolicyBlock({
  policy,
}: {
  policy: {
    allowed_uses: string[];
    training_allowed: boolean;
    sensitivity_class: string | null;
    aggregate_only: boolean;
    depersonalized_only: boolean;
    raw_body_excluded: boolean;
  };
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {policy.allowed_uses.map((u) => (
        <Badge key={u} variant="outline">{sentence(u)}</Badge>
      ))}
      {policy.sensitivity_class !== null ? (
        <Badge variant="outline">{sentence(policy.sensitivity_class)}</Badge>
      ) : null}
      <Badge variant={policy.training_allowed ? "secondary" : "outline"}>
        {policy.training_allowed ? "Training allowed" : "No training"}
      </Badge>
      {policy.aggregate_only ? <Badge variant="outline">Aggregate only</Badge> : null}
      {policy.depersonalized_only ? <Badge variant="outline">Depersonalized</Badge> : null}
      {policy.raw_body_excluded ? <Badge variant="outline">Raw body excluded</Badge> : null}
    </div>
  );
}

function UsageBlock({
  usage,
}: {
  usage: { read_count: number; denied_count: number; last_accessed_at: string | null };
}): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-md border border-border p-2">
        <div className="text-lg font-semibold" data-testid="grant-read-count">
          {usage.read_count}
        </div>
        <div className="text-xs text-muted-foreground">Reads</div>
      </div>
      <div className="rounded-md border border-border p-2">
        <div className="text-lg font-semibold">{usage.denied_count}</div>
        <div className="text-xs text-muted-foreground">Denied</div>
      </div>
      <div className="rounded-md border border-border p-2">
        <div className="text-xs font-medium">
          {fmtDate(usage.last_accessed_at) ?? "—"}
        </div>
        <div className="text-xs text-muted-foreground">Last access</div>
      </div>
    </div>
  );
}

// ── Buyer console drawer ─────────────────────────────────────────────────────

function BuyerConsoleDrawer({
  grantId,
  open,
  onOpenChange,
}: {
  grantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const query = useQuery({
    queryKey: ["grant-buyer-console", grantId],
    enabled: open && grantId !== null,
    queryFn: () => {
      if (grantId === null) return Promise.reject(new Error("no grant"));
      return api.grants.buyerConsole(grantId);
    },
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg" data-testid="buyer-console-drawer">
        <SheetTitle>Access details</SheetTitle>
        <SheetDescription className="mb-4">
          What you have access to, how you've used it, and the governing policy.
          Mock-only economics — no funds move. No raw content.
        </SheetDescription>
        {query.isPending && open ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !query.data ? null : !query.data.ok ? (
          <p className="text-sm text-destructive">{loadError(query.data.code)}</p>
        ) : (
          <div className="space-y-5 text-sm">
            <div>
              <div className="font-medium">{query.data.data.console.resource.listing_title ?? "Resource"}</div>
              <div className="text-xs text-muted-foreground">
                {sentence(query.data.data.console.grant.access_mode)} ·{" "}
                {sentence(query.data.data.console.grant.intended_use)}
              </div>
            </div>
            <div>
              <div className="mb-1 font-medium">Policy</div>
              <PolicyBlock policy={query.data.data.console.policy} />
            </div>
            <div>
              <div className="mb-1 font-medium">Usage</div>
              <UsageBlock usage={query.data.data.console.usage} />
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Mock settlement intent: {query.data.data.console.settlement.economic_decision ?? "—"}.{" "}
              {query.data.data.console.settlement.note}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Provider sovereignty drawer (with revoke) ───────────────────────────────

function SovereigntyDrawer({
  grantId,
  open,
  onOpenChange,
}: {
  grantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const qc = useQueryClient();
  const [blocked, setBlocked] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["grant-sovereignty", grantId],
    enabled: open && grantId !== null,
    queryFn: () => {
      if (grantId === null) return Promise.reject(new Error("no grant"));
      return api.grants.providerSovereignty(grantId);
    },
  });
  const revoke = useMutation({
    mutationFn: () => {
      if (grantId === null) return Promise.reject(new Error("no grant"));
      return api.grants.revoke(grantId, "Revoked from Control Tower");
    },
    onSuccess: (r) => {
      if (r.ok) {
        setBlocked(null);
        void qc.invalidateQueries({ queryKey: ["grant-sovereignty", grantId] });
        void qc.invalidateQueries({ queryKey: ["my-data-grants", "provider"] });
      } else {
        setBlocked(loadError(r.code));
      }
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg" data-testid="sovereignty-drawer">
        <SheetTitle>Grant on your data</SheetTitle>
        <SheetDescription className="mb-4">
          Who has access to your data, how it's been used, and your revocation
          control. Revocation is enforced immediately at read time.
        </SheetDescription>
        {query.isPending && open ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !query.data ? null : !query.data.ok ? (
          <p className="text-sm text-destructive">{loadError(query.data.code)}</p>
        ) : (
          <div className="space-y-5 text-sm">
            <div>
              <div className="font-medium">{query.data.data.sovereignty.resource.listing_title ?? "Resource"}</div>
              <div className="text-xs text-muted-foreground">
                Buyer {shortRef(query.data.data.sovereignty.grant.buyer_entity_id)} ·{" "}
                {sentence(query.data.data.sovereignty.grant.access_mode)}
              </div>
            </div>
            <div>
              <div className="mb-1 font-medium">Policy</div>
              <PolicyBlock policy={query.data.data.sovereignty.policy} />
            </div>
            <div>
              <div className="mb-1 font-medium">Usage</div>
              <UsageBlock usage={query.data.data.sovereignty.usage} />
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Status</span>
                <Badge variant={statusVariant(query.data.data.sovereignty.sovereignty.status)}>
                  {sentence(query.data.data.sovereignty.sovereignty.status)}
                </Badge>
              </div>
              {query.data.data.sovereignty.sovereignty.revocable ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate()}
                  data-testid="grant-revoke-button"
                >
                  Revoke access
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This grant is no longer in force; nothing to revoke.
                </p>
              )}
              {blocked !== null ? (
                <p className="mt-2 text-xs text-destructive" data-testid="revoke-error">{blocked}</p>
              ) : null}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Grant card ───────────────────────────────────────────────────────────────

function GrantCard({
  grant,
  ctaLabel,
  onOpen,
}: {
  grant: SafeDataGrant;
  ctaLabel: string;
  onOpen: (id: string) => void;
}): JSX.Element {
  return (
    <Card data-testid="grant-card" data-grant-id={grant.grant_id}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{sentence(grant.intended_use)}</div>
            <div className="text-xs text-muted-foreground">
              {sentence(grant.access_mode)} · grant {shortRef(grant.grant_id)}
            </div>
          </div>
          <Badge variant={statusVariant(grant.status)}>{sentence(grant.status)}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {grant.expires_at !== null ? `Expires ${fmtDate(grant.expires_at)}` : "No expiry set"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpen(grant.grant_id)}
            data-testid="grant-open-button"
          >
            {ctaLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab body ─────────────────────────────────────────────────────────────────

function GrantsTab({
  role,
  ctaLabel,
  onOpen,
}: {
  role: "buyer" | "provider";
  ctaLabel: string;
  onOpen: (id: string) => void;
}): JSX.Element {
  const query = useQuery({
    queryKey: ["my-data-grants", role],
    queryFn: () => api.grants.listByRole(role),
  });
  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (query.data && !query.data.ok) {
    return <p className="text-sm text-destructive">{loadError(query.data.code)}</p>;
  }
  const grants = query.data?.ok === true ? query.data.data.grants : [];
  if (grants.length === 0) {
    return (
      <Card data-testid="grants-empty">
        <CardContent className="p-6 text-sm text-muted-foreground">
          {role === "buyer"
            ? "You have no access grants yet. Request access from a data product to see it here."
            : "No one holds a grant on your data yet."}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="grants-grid">
      {grants.map((g) => (
        <GrantCard key={g.grant_id} grant={g} ctaLabel={ctaLabel} onOpen={onOpen} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function AccessGrantsPage(): JSX.Element {
  const [buyerGrant, setBuyerGrant] = useState<string | null>(null);
  const [buyerOpen, setBuyerOpen] = useState(false);
  const [provGrant, setProvGrant] = useState<string | null>(null);
  const [provOpen, setProvOpen] = useState(false);

  return (
    <div className="space-y-6" data-testid="access-grants-page">
      <PageHeader
        title="Access & Grants"
        description="Governed data access — what you can use, and who can use yours. Data is not sold; access is leased under consent and proof. Revocation is visible and enforced. Economics are mock-only."
      />

      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases" data-testid="tab-purchases">My purchases</TabsTrigger>
          <TabsTrigger value="sovereignty" data-testid="tab-sovereignty">Grants on my data</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases" className="mt-4">
          <GrantsTab
            role="buyer"
            ctaLabel="View access"
            onOpen={(id) => {
              setBuyerGrant(id);
              setBuyerOpen(true);
            }}
          />
        </TabsContent>
        <TabsContent value="sovereignty" className="mt-4">
          <GrantsTab
            role="provider"
            ctaLabel="Manage"
            onOpen={(id) => {
              setProvGrant(id);
              setProvOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <BuyerConsoleDrawer grantId={buyerGrant} open={buyerOpen} onOpenChange={setBuyerOpen} />
      <SovereigntyDrawer grantId={provGrant} open={provOpen} onOpenChange={setProvOpen} />
    </div>
  );
}
