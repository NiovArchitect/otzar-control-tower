// FILE: BridgeDetailDrawer.tsx
// PURPOSE: Side drawer (Sheet, side="right") that opens when an
//          Access Control matrix cell is clicked. Surfaces every
//          bridge affecting the (grantee, capsule_type) pair, with
//          per-bridge details and a per-bridge revoke action that
//          surfaces the real audit_event_id from
//          DELETE /cosmp/share/:bridgeId.
// CONNECTS TO: AccessControl.tsx (mounts this), MatrixCell click
//              handler, api.org.permissions.list (data source via
//              client-side bridge_id filter), api.cosmp.revoke (the
//              privileged action), AuditAwareButton (4-stage
//              audit-aware UI universal).
//
// DRIFT 5 RESOLUTION (12B.4):
// Foundation has no per-bridge GET endpoint. Active permissions are
// fetched via api.org.permissions.list({ take: 250 }) and client-side
// filtered by bridge_id. This mirrors the 12B.2/12B.3 audit + permissions
// tab pattern (decision #23). Active permissions only -- historical
// revoked bridges are a 12D Security & Audit concern.
// 12C.0 Foundation extension candidate: GET /org/permissions?bridge_id=
// filter (alongside the queued ?actor_entity_id= extension for
// /org/audit).
//
// SINGLE-PURPOSE DRAWER PATTERN:
// Unlike MemberDetailDrawer (5 tabs) and TwinDetailDrawer (4 tabs),
// BridgeDetailDrawer has no tabs -- it surfaces a focused list of
// bridges for one matrix cell, each card revocable in place. Users
// clicking a cell want to act on the bridges that drive it; tabs would
// dilute that.

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Copy, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuditAwareButton } from "@/components/audit/AuditAwareButton";
import { api } from "@/lib/api";
import { getCapsuleTypeLabel } from "@/lib/labels/capsule-types";
import { getEntityTypeLabel } from "@/lib/labels/entity-types";
import { getPermissionScopeLabel } from "@/lib/labels/permission-scopes";
import { getDurationTypeLabel } from "@/lib/labels/duration-types";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  CapsuleType,
  Entity,
  OrgCapsuleListItem,
  Permission,
} from "@/lib/types/foundation";

interface BridgeDetailDrawerProps {
  /** The grantee whose cell was clicked. null when no cell is open. */
  grantee: Entity | null;
  /** The capsule_type column whose cell was clicked. null when no
   *  cell is open. */
  capsuleType: CapsuleType | null;
  /** Display name shown as the implicit grantor (the org name). The
   *  matrix is always grantor=org for the org-admin flows in 12B.4. */
  orgDisplayName: string;
  /** Foundation org capsules slice -- needed to render capsule chips
   *  per bridge and to scope the bridge filter to org-wallet capsule
   *  rows only. */
  capsules: readonly OrgCapsuleListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function truncateBridgeId(id: string): string {
  return id.slice(0, 8);
}

// WHAT: One card render block for a single bridge_id within the cell.
// WHY: Each bridge can be revoked independently. The card shows the
//      schema-honest 3-tuple (scope, can_share_forward, duration_type)
//      surfaced via existing label maps and an inline revoke button.
function BridgeCard({
  bridgeId,
  rows,
  capsulesByCapsuleId,
  granteeName,
  orgDisplayName,
  onRevoked,
}: {
  bridgeId: string;
  rows: readonly Permission[];
  capsulesByCapsuleId: Map<string, OrgCapsuleListItem>;
  granteeName: string;
  orgDisplayName: string;
  onRevoked: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // All rows in the same bridge share scope/can_share_forward/duration
  // from Foundation's createPermission per-grant call (one CapsuleGrant
  // per row, all with the same bridge_id minted upstream). 12B.4
  // collapsed the dialog UX to a single (scope, can_share_forward,
  // duration_type) tuple so this drawer's card-level summary is honest
  // for any grant created via this UI.
  const first = rows[0];
  if (!first) return null;

  async function copyBridgeId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(bridgeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API not available -- skip silently. Operator can
      // still expand the truncated id via inspect tools.
    }
  }

  const capsuleChips = rows
    .map((p) => capsulesByCapsuleId.get(p.capsule_id))
    .filter((c): c is OrgCapsuleListItem => c !== undefined);

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Bridge</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {truncateBridgeId(bridgeId)}…
            </code>
            <button
              type="button"
              onClick={copyBridgeId}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Copy full bridge ID"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {formatRelativeTime(first.created_at)}
            {first.expires_at
              ? ` · expires ${formatRelativeTime(first.expires_at)}`
              : ""}
          </p>
        </div>
        <AuditAwareButton
          variant="destructive"
          auditEventType="PERMISSION_REVOKED"
          requireConfirmation
          confirmationTitle="Revoke this bridge?"
          confirmationDescription={`All ${rows.length} permission${rows.length === 1 ? "" : "s"} under this bridge will be revoked atomically and the grantee's active sessions invalidated.`}
          targetDescription={`Bridge ${truncateBridgeId(bridgeId)}… for ${granteeName}`}
          onConfirm={async () => {
            const r = await api.cosmp.revoke(bridgeId);
            if (!r.ok) return { ok: false, error: r.message };
            onRevoked();
            return { ok: true, audit_event_id: r.data.audit_event_id };
          }}
        >
          Revoke this bridge
        </AuditAwareButton>
      </div>

      <Separator />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Access Scope</dt>
          <dd>{getPermissionScopeLabel(first.access_scope)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Re-share</dt>
          <dd>
            {first.can_share_forward ? (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                Allowed
              </span>
            ) : (
              <span className="text-muted-foreground">Not allowed</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd>{getDurationTypeLabel(first.duration_type)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Permissions</dt>
          <dd>{rows.length}</dd>
        </div>
      </dl>

      {capsuleChips.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Capsules in this bridge</p>
          <div className="flex flex-wrap gap-1.5">
            {capsuleChips.map((c) => (
              <Badge
                key={c.capsule_id}
                variant="secondary"
                className="font-normal"
              >
                {getCapsuleTypeLabel(c.capsule_type)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="sr-only">
        Permission Bridge: {granteeName} ← {orgDisplayName}
      </p>
    </div>
  );
}

export function BridgeDetailDrawer({
  grantee,
  capsuleType,
  orgDisplayName,
  capsules,
  open,
  onOpenChange,
}: BridgeDetailDrawerProps) {
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ["org", "permissions", "drawer"],
    enabled: open && grantee !== null && capsuleType !== null,
    queryFn: async () => {
      const r = await api.org.permissions.list({ take: 250 });
      if (!r.ok) {
        throw new Error(`Failed to load permissions (${r.code})`);
      }
      return r.data.items;
    },
  });

  const capsulesByCapsuleId = useMemo(() => {
    const m = new Map<string, OrgCapsuleListItem>();
    for (const c of capsules) m.set(c.capsule_id, c);
    return m;
  }, [capsules]);

  const bridges = useMemo(() => {
    if (!grantee || !capsuleType || !permissionsQuery.data) return [];
    // Filter to permissions whose capsule_id is in the org-wallet
    // slice AND whose grantee matches AND whose capsule_type matches.
    const matching = permissionsQuery.data.filter((p) => {
      const c = capsulesByCapsuleId.get(p.capsule_id);
      return (
        p.grantee_entity_id === grantee.entity_id &&
        c !== undefined &&
        c.capsule_type === capsuleType
      );
    });
    // Group by bridge_id, preserving insertion order.
    const byBridge = new Map<string, Permission[]>();
    for (const p of matching) {
      const arr = byBridge.get(p.bridge_id);
      if (arr) arr.push(p);
      else byBridge.set(p.bridge_id, [p]);
    }
    return Array.from(byBridge.entries()).map(([bridgeId, rows]) => ({
      bridgeId,
      rows,
    }));
  }, [grantee, capsuleType, permissionsQuery.data, capsulesByCapsuleId]);

  if (grantee === null || capsuleType === null) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl" />
      </Sheet>
    );
  }

  function handleRevoked(): void {
    void queryClient.invalidateQueries({ queryKey: ["org", "permissions"] });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-2 border-b border-border pb-4">
            <h2 className="text-lg font-semibold">
              Permission Bridge: {grantee.display_name} ← {orgDisplayName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
                {getEntityTypeLabel(grantee.entity_type)}
              </Badge>
              <span>·</span>
              <span>{getCapsuleTypeLabel(capsuleType)}</span>
              <span>·</span>
              <span>
                {bridges.length} bridge{bridges.length === 1 ? "" : "s"} active
              </span>
            </div>
          </div>

          {permissionsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading bridges...</p>
          )}
          {permissionsQuery.error && (
            <p className="text-sm text-destructive">
              Error: {(permissionsQuery.error as Error).message}
            </p>
          )}
          {!permissionsQuery.isLoading &&
            !permissionsQuery.error &&
            bridges.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active bridges for this combination.
              </p>
            )}

          <div className="space-y-3">
            {bridges.map(({ bridgeId, rows }) => (
              <BridgeCard
                key={bridgeId}
                bridgeId={bridgeId}
                rows={rows}
                capsulesByCapsuleId={capsulesByCapsuleId}
                granteeName={grantee.display_name}
                orgDisplayName={orgDisplayName}
                onRevoked={handleRevoked}
              />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
