// FILE: Users.tsx
// PURPOSE: Customer-facing "Users" admin screen -- humans (PERSON
//          entities) registered in the org. Wraps Foundation's
//          /org/entities surface in customer-admin vocabulary.
// CONNECTS TO: api.org.entities + members + onboarding,
//              MemberDetailDrawer, InviteWizard, BulkActionsBar,
//              DataTable, DataSovereigntyInline.
//
// DECISIONS APPLIED (per docs/SECTION_12_DISCIPLINE.md):
// - #11 DataSovereigntyInline at the top.
// - #13 DataTable defaults: 25 rows, URL state, 4 states baked in.
// - #20 Invite via 3-step Dandelion wizard.
// - #22 BulkActionsBar with Promise.allSettled fan-out.
// - #26 "Last Updated" column from Entity.updated_at.
// - C1 Filter to type="PERSON" only -- AI Teammates have their own
//        screen (12B.3).

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data/DataTable";
import { DataSovereigntyInline } from "@/components/sovereignty/DataSovereigntyInline";
import { MemberDetailDrawer } from "@/components/users/MemberDetailDrawer";
import { InviteWizard } from "@/components/users/InviteWizard";
import {
  BulkActionsBar,
  type BulkAction,
} from "@/components/users/BulkActionsBar";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatPersonName } from "@/lib/identity/person-name";
import { getEntityTypeLabel } from "@/lib/labels/entity-types";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { Entity, EntityMembership, EntityStatus } from "@/lib/types/foundation";
import { buildOrgMap, type OrgMapPerson } from "@/lib/org/org-map";
import { HierarchyEditor } from "@/components/otzar/HierarchyEditor";
import { RelationshipEdgesCard } from "@/components/otzar/RelationshipEdgesCard";
import { inventoryRelationships } from "@/lib/org/relationship-edges";

const PAGE_SIZE = 25;

// [P0-ONBOARD] Onboarding access state + the one-time link mint. Clicking
// mints a FRESH link (invalidating any prior open one) and copies it —
// links are never re-displayed. Copy is honest: shared by the admin, never
// "email sent".
function ActivationCell({ row }: { row: Entity }): JSX.Element {
  const status = row.activation_status;
  const [busy, setBusy] = useState(false);
  if (row.entity_type !== "PERSON" || status === undefined) return <span>—</span>;
  const label =
    status === "active" ? "Active"
    : status === "activation_pending" ? "Activation pending"
    : status === "expired" ? "Link expired"
    : "Invited";
  async function mint(): Promise<void> {
    setBusy(true);
    const r =
      status === "active"
        ? await api.org.members.passwordResetLink(row.entity_id)
        : await api.org.members.activationLink(row.entity_id);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.message || "Couldn't create the link.");
      return;
    }
    const url = `${window.location.origin}/activate?token=${r.data.token}`;
    await navigator.clipboard.writeText(url);
    toast.success(
      status === "active"
        ? "Password reset link copied. Share it securely — it expires in 1 hour and can only be used once."
        : "Activation link copied. Share it securely — it expires and can only be used once.",
    );
  }
  // [PASSWORD-LIFECYCLE] admin-triggered reset email — the admin never
  // sees or sets the password; "sent" = provider accepted.
  async function sendResetEmail(): Promise<void> {
    setBusy(true);
    const r = await api.org.members.passwordResetEmail(row.entity_id);
    setBusy(false);
    if (r.ok && r.data.ok) {
      toast.success(
        "Password reset email sent — “sent” means our email provider accepted it. You never see or set their password.",
      );
    } else if (!r.ok && r.code === "EMAIL_NOT_CONFIGURED") {
      toast.info("Email delivery isn't configured yet — copy the reset link instead.");
    } else {
      toast.error(
        (!r.ok && r.message) || "The reset email couldn't be sent. Nothing was delivered — copy the reset link instead.",
      );
    }
  }

  // [ACT-EMAIL] explicit send — "sent" means the provider accepted the
  // message; the honest not-configured result keeps the copy-link rail
  // as the fallback. Never shown for active members.
  async function sendEmail(): Promise<void> {
    setBusy(true);
    const r = await api.org.members.activationEmail(row.entity_id);
    setBusy(false);
    if (r.ok && r.data.ok) {
      toast.success(
        "Activation email sent — “sent” means our email provider accepted it. The copy-link fallback still works.",
      );
    } else if (!r.ok && r.code === "EMAIL_NOT_CONFIGURED") {
      toast.info("Email delivery isn't configured yet — copy the activation link instead.");
    } else {
      toast.error(
        (!r.ok && r.message) || "The email couldn't be sent. Nothing was delivered — copy the link instead.",
      );
    }
  }
  return (
    <div className="flex items-center gap-2" data-testid="users-activation-cell">
      <span>{label}</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs"
        disabled={busy}
        data-testid={status === "active" ? "users-copy-reset-link" : "users-copy-activation-link"}
        onClick={(e) => {
          e.stopPropagation();
          void mint();
        }}
      >
        {status === "active" ? "Copy reset link" : "Copy activation link"}
      </Button>
      {status !== "active" ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          disabled={busy}
          data-testid="users-send-activation-email"
          onClick={(e) => {
            e.stopPropagation();
            void sendEmail();
          }}
        >
          Send activation email
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          disabled={busy}
          data-testid="users-send-reset-email"
          onClick={(e) => {
            e.stopPropagation();
            void sendResetEmail();
          }}
        >
          Send password reset
        </Button>
      )}
    </div>
  );
}

function statusBadge(status: EntityStatus) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Active
      </Badge>
    );
  }
  if (status === "SUSPENDED") {
    return (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
        Suspended
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200">
      Deleted
    </Badge>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerMember, setDrawerMember] = useState<Entity | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const list = useQuery({
    queryKey: ["org", "entities", { type: "PERSON", skip, take: PAGE_SIZE }],
    queryFn: async () => {
      const r = await api.org.entities.list({
        type: "PERSON",
        skip,
        take: PAGE_SIZE,
      });
      if (!r.ok) {
        throw new Error(`Failed to load members (${r.code})`);
      }
      return r.data;
    },
  });

  // PROD-UX-P1 — People & Roles renders the REAL org hierarchy (role,
  // department, manager) from /org/hierarchy, the same source AI
  // Teammates already uses. Loaded alongside the page; when the feed
  // is empty or unavailable the columns show "—", never invented data.
  const hierarchy = useQuery({
    queryKey: ["org", "hierarchy"],
    queryFn: async () => {
      const r = await api.org.hierarchy.get();
      if (!r.ok) throw new Error(r.message);
      return r.data;
    },
  });
  const allPeople = useQuery({
    queryKey: ["org", "entities", { type: "PERSON", take: 250 }],
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      if (!r.ok) throw new Error(r.message);
      return r.data.items;
    },
  });
  const membershipByPerson = useMemo(() => {
    const map = new Map<
      string,
      { parent_id: string; role_title: string | null; department: string | null; is_manager_edge: boolean }
    >();
    if (hierarchy.data) {
      const orgId = hierarchy.data.org_entity_id;
      for (const m of hierarchy.data.memberships) {
        if (!m.is_active) continue;
        // PROD-UX-HIER — a person→person MANAGER edge is the reporting
        // truth; it overrides the org→person enrollment edge (which the
        // feed lists first) so "Reports to" shows the manager, not "—".
        const existing = map.get(m.child_id);
        const isManagerEdge = m.parent_id !== orgId;
        if (existing === undefined || (isManagerEdge && !existing.is_manager_edge)) {
          map.set(m.child_id, {
            parent_id: m.parent_id,
            role_title: m.role_title ?? existing?.role_title ?? null,
            department: m.department ?? existing?.department ?? null,
            is_manager_edge: isManagerEdge,
          });
        }
      }
    }
    return map;
  }, [hierarchy.data]);
  const personNameById = useMemo(() => {
    const map = new Map<string, string>();
    if (allPeople.data) {
      for (const p of allPeople.data) map.set(p.entity_id, p.display_name);
    }
    return map;
  }, [allPeople.data]);

  const rows = list.data?.items ?? undefined;
  const total = list.data?.total ?? undefined;

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection(): void {
    setSelectedIds(new Set());
  }

  const columns = useMemo<ColumnDef<Entity>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.display_name}`}
            checked={selectedIds.has(row.original.entity_id)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelected(row.original.entity_id)}
          />
        ),
        enableSorting: false,
      },
      {
        id: "display_name",
        header: "Name",
        accessorFn: (row) => formatPersonName(row.display_name) || row.display_name,
      },
      {
        id: "email",
        header: "Email",
        accessorFn: (row) => row.email ?? "—",
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => getEntityTypeLabel(row.entity_type),
      },
      // PROD-UX-P1 — the real reporting structure, from /org/hierarchy.
      {
        id: "role",
        header: "Role",
        accessorFn: (row) =>
          membershipByPerson.get(row.entity_id)?.role_title ?? "—",
      },
      {
        id: "department",
        header: "Department",
        accessorFn: (row) =>
          membershipByPerson.get(row.entity_id)?.department ?? "—",
      },
      {
        id: "reports_to",
        header: "Reports to",
        accessorFn: (row) => {
          const parentId = membershipByPerson.get(row.entity_id)?.parent_id;
          if (parentId === undefined) return "—";
          const name = personNameById.get(parentId);
          // A parent that isn't a person (the org root, a hive) renders
          // "—" rather than a raw id.
          return name !== undefined ? formatPersonName(name) || name : "—";
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "activation",
        header: "Access",
        cell: ({ row }) => <ActivationCell row={row.original} />,
      },
      {
        id: "last_updated",
        header: () => (
          <span title="Last time this member's profile or status was modified. Session activity tracking ships in Section 14.">
            Last Updated
          </span>
        ),
        accessorFn: (row) => formatRelativeTime(row.updated_at),
      },
    ],
    [selectedIds, membershipByPerson, personNameById],
  );

  // ── Bulk actions ──────────────────────────────────────────────
  const bulkActions: BulkAction<string>[] = [
    {
      key: "suspend",
      label: "Suspend selected",
      audit_event_type: "ADMIN_ACTION",
      audit_action_label: "ENTITY_SUSPENDED",
      requireConfirmation: true,
      variant: "destructive",
      confirmationDescription:
        "Suspended members can't log in until reactivated. Their AI Teammate stays minted.",
      perItem: async (id) => {
        const r = await api.org.entities.update(id, { status: "SUSPENDED" });
        if (!r.ok) {
          return { ok: false, error: r.message };
        }
        await queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
        // Foundation now returns the real audit_event_id for this PATCH.
        return { ok: true, audit_event_id: r.data.audit_event_id };
      },
    },
    {
      key: "reactivate",
      label: "Reactivate selected",
      audit_event_type: "ADMIN_ACTION",
      audit_action_label: "ENTITY_REACTIVATED",
      requireConfirmation: true,
      confirmationDescription:
        "Reactivated members regain login access immediately.",
      perItem: async (id) => {
        const r = await api.org.entities.update(id, { status: "ACTIVE" });
        if (!r.ok) {
          return { ok: false, error: r.message };
        }
        await queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
        // Foundation now returns the real audit_event_id for this PATCH.
        return { ok: true, audit_event_id: r.data.audit_event_id };
      },
    },
  ];

  const idsArray = Array.from(selectedIds);
  const idToName = new Map(rows?.map((r) => [r.entity_id, r.display_name]) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="People in your organization -- their roles, status, and access summary. Each member has an AI Teammate once their invite is accepted."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Invite member
          </Button>
        }
      />

      <DataSovereigntyInline />

      {/* PROD-UX-VIS-A — the org at a glance: departments → managers →
          direct reports, with honest attention buckets. Built from the
          same hierarchy read the table uses. */}
      <OrgMapCard
        orgEntityId={hierarchy.data?.org_entity_id ?? null}
        memberships={hierarchy.data?.memberships ?? []}
        people={allPeople.data ?? []}
      />

      {/* F-03 — relationship edge kinds (solid / sponsor / executive top / matrix). */}
      <RelationshipEdgesCard
        inventory={(() => {
          if (!hierarchy.data) return null;
          const orgId = hierarchy.data.org_entity_id;
          const byPerson = new Map<
            string,
            { manager: string | null; role: string | null; dept: string | null }
          >();
          for (const m of hierarchy.data.memberships) {
            if (!m.is_active) continue;
            const isManagerEdge = m.parent_id !== orgId;
            const cur = byPerson.get(m.child_id);
            const manager = isManagerEdge
              ? m.parent_id
              : (cur?.manager ?? null);
            byPerson.set(m.child_id, {
              manager:
                cur === undefined || (isManagerEdge && cur.manager === null)
                  ? manager
                  : cur.manager,
              role: m.role_title ?? cur?.role ?? null,
              dept: m.department ?? cur?.dept ?? null,
            });
          }
          const people = (allPeople.data ?? []).map((p) => {
            const h = byPerson.get(p.entity_id);
            return {
              entity_id: p.entity_id,
              display_name: p.display_name,
              manager_entity_id: h?.manager ?? null,
              role_title: h?.role ?? null,
              department: h?.dept ?? null,
            };
          });
          return inventoryRelationships(people);
        })()}
      />

      {/* F-02 — hierarchy editor: stage, bulk confirm, undo, keyboard + drag.
          F-04 — copy states hierarchy ≠ access/TAR. Server assign still audited.
          F-03 — edge-kind badges on rows. */}
      <HierarchyEditor
        people={(allPeople.data ?? []).map((p) => {
          const mem = membershipByPerson.get(p.entity_id);
          return {
            entity_id: p.entity_id,
            display_name: p.display_name,
            email: p.email,
            role_title: mem?.role_title ?? null,
            department: mem?.department ?? null,
          };
        })}
        edges={
          hierarchy.data
            ? (() => {
                const orgId = hierarchy.data.org_entity_id;
                const byPerson = new Map<string, string | null>();
                for (const m of hierarchy.data.memberships) {
                  if (!m.is_active) continue;
                  const isManagerEdge = m.parent_id !== orgId;
                  const existing = byPerson.get(m.child_id);
                  if (
                    existing === undefined ||
                    (isManagerEdge && existing === null)
                  ) {
                    byPerson.set(
                      m.child_id,
                      isManagerEdge ? m.parent_id : null,
                    );
                  }
                }
                return Array.from(byPerson.entries()).map(
                  ([person_entity_id, manager_entity_id]) => ({
                    person_entity_id,
                    manager_entity_id,
                  }),
                );
              })()
            : []
        }
        onApplied={() => {
          void queryClient.invalidateQueries({ queryKey: ["org", "hierarchy"] });
          void queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
        }}
      />

      {/* PROD-UX-HIER — quick single assign (still available). */}
      <ReportingCard
        people={allPeople.data ?? []}
        onAssigned={() => {
          void queryClient.invalidateQueries({ queryKey: ["org", "hierarchy"] });
          void queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
        }}
      />

      <BulkActionsBar
        selectedIds={idsArray}
        onClearSelection={clearSelection}
        actions={bulkActions}
        renderItemLabel={(id) => idToName.get(id) ?? id}
      />

      <DataTable<Entity>
        columns={columns}
        data={rows}
        isLoading={list.isLoading}
        error={list.error as Error | null}
        emptyState={{
          title: "No members yet",
          description:
            "Invite your first team member to start building your organization's intelligence.",
          cta: (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              Invite member
            </Button>
          ),
        }}
        pageSize={PAGE_SIZE}
        totalCount={total}
        searchPlaceholder="Search by name or email..."
        onRowClick={(row) => setDrawerMember(row)}
        onRetry={() => void list.refetch()}
      />

      <MemberDetailDrawer
        member={drawerMember}
        open={drawerMember !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerMember(null);
        }}
      />

      <InviteWizard open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

// PROD-UX-HIER — the admin's reporting-structure editor. One calm card:
// pick a person, pick their manager (or "No manager"), optionally set role
// and department, assign. Every label is a name + email (stable ids under
// the hood); outcomes are sentences, never codes.
function ReportingCard({
  people,
  onAssigned,
}: {
  people: Entity[];
  onAssigned: () => void;
}): JSX.Element {
  const [personId, setPersonId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const optionLabel = (p: Entity): string =>
    `${formatPersonName(p.display_name) || p.display_name}${p.email ? ` (${p.email})` : ""}`;

  async function assign(): Promise<void> {
    setBusy(true);
    setNotice(null);
    const r = await api.org.hierarchy.assign({
      person_entity_id: personId,
      manager_entity_id: managerId.length > 0 ? managerId : null,
      ...(roleTitle.trim().length > 0 ? { role_title: roleTitle.trim() } : {}),
      ...(department.trim().length > 0 ? { department: department.trim() } : {}),
    });
    setBusy(false);
    if (r.ok && r.data.ok) {
      const person = people.find((p) => p.entity_id === personId);
      const manager = people.find((p) => p.entity_id === managerId);
      setNotice({
        tone: "ok",
        text:
          manager !== undefined
            ? `${person?.display_name ?? "This member"} now reports to ${manager.display_name}. Recorded in the audit trail.`
            : `${person?.display_name ?? "This member"}'s details were updated. Recorded in the audit trail.`,
      });
      setPersonId("");
      setManagerId("");
      setRoleTitle("");
      setDepartment("");
      onAssigned();
    } else {
      const code = r.ok ? null : r.code;
      setNotice({
        tone: "error",
        text:
          code === "CYCLE"
            ? "That would make someone report to their own report — pick a different manager."
            : code === "PERSON_NOT_FOUND" || code === "MANAGER_NOT_FOUND"
              ? "That person isn't in your organization."
              : "Couldn't save the reporting change right now. Try again in a moment.",
      });
    }
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      data-testid="reporting-card"
    >
      <p className="text-sm font-medium">Reporting structure</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Set who reports to whom, with role and department. Otzar uses this to
        route work and reviews to the right people. Every change is recorded.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
        <select
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          aria-label="Member"
          data-testid="reporting-person-select"
        >
          <option value="">Choose a member…</option>
          {people.map((p) => (
            <option key={p.entity_id} value={p.entity_id}>
              {optionLabel(p)}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          aria-label="Manager"
          data-testid="reporting-manager-select"
        >
          <option value="">No manager (top level)</option>
          {people
            .filter((p) => p.entity_id !== personId)
            .map((p) => (
              <option key={p.entity_id} value={p.entity_id}>
                {optionLabel(p)}
              </option>
            ))}
        </select>
        <input
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          placeholder="Role (e.g. Engineer)"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          aria-label="Role"
          data-testid="reporting-role-input"
        />
        <input
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          placeholder="Department (e.g. Product)"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          aria-label="Department"
          data-testid="reporting-department-input"
        />
        <Button
          size="sm"
          disabled={busy || personId.length === 0}
          onClick={() => void assign()}
          data-testid="reporting-assign"
        >
          {busy ? "Saving…" : "Save reporting"}
        </Button>
      </div>
      {notice !== null ? (
        <p
          className={`mt-2 text-xs ${notice.tone === "ok" ? "text-emerald-600" : "text-destructive"}`}
          data-testid="reporting-notice"
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}

// PROD-UX-VIS-A — the smallest clear org map: departments (largest first),
// each showing manager → direct reports as calm indented lines; people who
// need hierarchy setup surface in their own honest bucket. Read-only view —
// the ReportingCard right below is where changes happen.
function OrgTreePerson({ person, depth }: { person: OrgMapPerson; depth: number }): JSX.Element {
  return (
    <div data-testid="org-map-person" data-depth={depth}>
      <div
        className="flex items-baseline gap-2 py-0.5 text-sm"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span className="font-medium text-foreground">
          {formatPersonName(person.name) || person.name}
        </span>
        {person.role_title !== null ? (
          <span className="text-xs text-muted-foreground">{person.role_title}</span>
        ) : null}
        {person.reports.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">
            · manages {person.reports.length}
          </span>
        ) : null}
      </div>
      {person.reports.map((r) => (
        <OrgTreePerson key={r.entity_id} person={r} depth={depth + 1} />
      ))}
    </div>
  );
}

function OrgMapCard({
  orgEntityId,
  memberships,
  people,
}: {
  orgEntityId: string | null;
  memberships: EntityMembership[];
  people: Entity[];
}): JSX.Element | null {
  if (orgEntityId === null || people.length === 0) return null;
  const map = buildOrgMap(orgEntityId, memberships, people);
  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="org-map-card">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Your organization</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {map.totalPeople} people · {map.departments.length}{" "}
            {map.departments.length === 1 ? "department" : "departments"}. Otzar
            uses this structure to route work, reviews, and notifications to
            the right person.
          </p>
        </div>
        {map.needsSetup ? (
          <span
            className="shrink-0 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-medium text-amber-800"
            data-testid="org-map-needs-setup"
          >
            Needs hierarchy setup
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {map.departments.map((d) => (
          <section key={d.department} data-testid="org-map-department" data-department={d.department}>
            <h3 className="text-xs font-semibold text-muted-foreground">
              {d.department} ({d.memberCount})
            </h3>
            <div className="mt-1">
              {d.roots.map((p) => (
                <OrgTreePerson key={p.entity_id} person={p} depth={0} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {map.unassigned.length > 0 ? (
        <div className="mt-3 border-t border-border/60 pt-2" data-testid="org-map-unassigned">
          <h3 className="text-xs font-semibold text-amber-700">
            No manager or department yet ({map.unassigned.length})
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Use “Reporting structure” below to place them — until then Otzar
            can’t route their reviews through a manager.
          </p>
          <div className="mt-1">
            {map.unassigned.map((p) => (
              <OrgTreePerson key={p.entity_id} person={p} depth={0} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
