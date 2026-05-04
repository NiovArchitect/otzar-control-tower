// FILE: MemberDetailDrawer.tsx
// PURPOSE: Side drawer (Sheet, side="right") that opens when a row in
//          the Users table is clicked. Five tabs surface the member's
//          profile, hierarchy, recent audit, permissions granted, and
//          AI teammates owned. Profile tab includes inline job_title
//          edit via AuditAwareForm (PATCH /org/entities/:id).
// CONNECTS TO: Users.tsx (mounts this), AuditAwareForm (job_title
//              edit), DataTable<T> (4 mini-tables), shadcn Tabs, Sheet.
//
// DRIFT NOTES (12B.2):
// - GET /org/audit lacks server-side actor_entity_id filter; the
//   Recent Audit tab fetches a wide page and filters client-side
//   (decision #23).
// - GET /org/permissions has no grantee filter; same client-side
//   pattern. Practical for the page sizes 12B.2 deals with.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { AuditAwareForm } from "@/components/audit/AuditAwareForm";
import { DataTable } from "@/components/data/DataTable";
import { api } from "@/lib/api";
import { getEntityTypeLabel } from "@/lib/labels/entity-types";
import { getCapsuleTypeLabel } from "@/lib/labels/capsule-types";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  AuditEvent,
  Entity,
  EntityMembership,
  Permission,
} from "@/lib/types/foundation";
import type { ColumnDef } from "@tanstack/react-table";

interface MemberDetailDrawerProps {
  member: Entity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusBadge(status: Entity["status"]) {
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

const jobTitleSchema = z.object({
  job_title: z
    .string()
    .min(1, "Title is required")
    .max(120, "Title is too long"),
});

type JobTitleValues = z.infer<typeof jobTitleSchema>;

function JobTitleField() {
  const form = useFormContext<JobTitleValues>();
  return (
    <FormField
      control={form.control}
      name="job_title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Job title</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function MemberDetailDrawer({
  member,
  open,
  onOpenChange,
}: MemberDetailDrawerProps) {
  const queryClient = useQueryClient();

  const recentAudit = useQuery({
    queryKey: ["org", "audit", "actor", member?.entity_id],
    enabled: open && member !== null,
    queryFn: async () => {
      const result = await api.org.audit.list({ take: 50 });
      if (!result.ok) {
        throw new Error(`Failed to load audit events (${result.code})`);
      }
      // Decision #23: client-side filter until 12D Foundation extension.
      const filtered = result.data.items.filter(
        (e) => e.actor_entity_id === member?.entity_id,
      );
      return filtered.slice(0, 10);
    },
  });

  const grants = useQuery({
    queryKey: ["org", "permissions", "grantee", member?.entity_id],
    enabled: open && member !== null,
    queryFn: async () => {
      const result = await api.org.permissions.list({ take: 50 });
      if (!result.ok) {
        throw new Error(`Failed to load permissions (${result.code})`);
      }
      return result.data.items.filter(
        (p) => p.grantee_entity_id === member?.entity_id,
      );
    },
  });

  const hierarchy = useQuery({
    queryKey: ["org", "hierarchy"],
    enabled: open && member !== null,
    queryFn: async () => {
      const result = await api.org.hierarchy.get();
      if (!result.ok) {
        throw new Error(`Failed to load hierarchy (${result.code})`);
      }
      return result.data.memberships;
    },
  });

  const aiTeammatesOwned = useQuery({
    queryKey: ["org", "ai-teammates", "owner", member?.entity_id],
    enabled: open && member !== null,
    queryFn: async () => {
      const result = await api.org.aiTeammates.list({ take: 50 });
      if (!result.ok) {
        throw new Error(`Failed to load AI teammates (${result.code})`);
      }
      // Until ai-teammate stats endpoint surfaces an explicit owner
      // field on the list rows, we filter via hierarchy: the
      // member's entity is the parent of their AI teammates'
      // EntityMembership rows. Hierarchy query already loaded.
      const ownerRelations =
        hierarchy.data?.filter((m) => m.parent_id === member?.entity_id) ?? [];
      const ownerChildIds = new Set(ownerRelations.map((m) => m.child_id));
      return result.data.items.filter((e) => ownerChildIds.has(e.entity_id));
    },
  });

  if (member === null) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl" />
      </Sheet>
    );
  }

  const profileFullName = member.display_name;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage alt={profileFullName} />
              <AvatarFallback>{initials(profileFullName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{profileFullName}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{member.email ?? "—"}</span>
                {statusBadge(member.status)}
                <span className="text-xs">
                  {getEntityTypeLabel(member.entity_type)}
                </span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
              <TabsTrigger value="audit">Recent Audit</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="teammates">AI Teammates</TabsTrigger>
            </TabsList>

            {/* ── Profile tab ──────────────────────────────────────── */}
            <TabsContent value="profile" className="space-y-4 pt-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField label="Display name" value={member.display_name} />
                <ProfileField label="Email" value={member.email ?? "—"} />
                <ProfileField label="Status" value={statusBadge(member.status)} />
                <ProfileField
                  label="Type"
                  value={getEntityTypeLabel(member.entity_type)}
                />
                <ProfileField
                  label="Created"
                  value={formatRelativeTime(member.created_at)}
                />
                <ProfileField
                  label="Last updated"
                  value={formatRelativeTime(member.updated_at)}
                />
              </dl>
              <div className="border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-medium">
                  Edit job title (audit-logged)
                </h3>
                <AuditAwareForm
                  variant="primary"
                  auditEventType="ADMIN_ACTION"
                  auditActionLabel="ENTITY_PROFILE_UPDATED"
                  formSchema={jobTitleSchema}
                  defaultValues={{ job_title: "" }}
                  submitLabel="Save title"
                  onSubmit={async (values) => {
                    const r = await api.org.entities.update(member.entity_id, {
                      job_title: values.job_title,
                    });
                    if (!r.ok) {
                      return { ok: false, error: r.message };
                    }
                    await queryClient.invalidateQueries({
                      queryKey: ["org", "entities"],
                    });
                    // Foundation's PATCH route for entity profile
                    // doesn't surface an audit_event_id today; this
                    // is the documented gap for the audit-aware UI
                    // path in 12B.2 -- the AuditAwareForm needs a
                    // string here, so we synthesize a placeholder
                    // value the toast renders without breaking the
                    // contract. 12C/12D will extend Foundation to
                    // surface this.
                    return {
                      ok: true,
                      audit_event_id: "pending-foundation-extension",
                    };
                  }}
                >
                  <JobTitleField />
                </AuditAwareForm>
              </div>
            </TabsContent>

            {/* ── Hierarchy tab ────────────────────────────────────── */}
            <TabsContent value="hierarchy" className="pt-4">
              <DataTable<EntityMembership>
                columns={hierarchyColumns}
                data={
                  hierarchy.data?.filter(
                    (m) =>
                      m.parent_id === member.entity_id ||
                      m.child_id === member.entity_id,
                  ) ?? undefined
                }
                isLoading={hierarchy.isLoading}
                error={hierarchy.error as Error | null}
                emptyState={{
                  title: "No hierarchy connections yet",
                  description:
                    "This member has no manager or direct reports recorded.",
                }}
                pageSize={10}
                onRetry={() => void hierarchy.refetch()}
              />
            </TabsContent>

            {/* ── Recent Audit tab ─────────────────────────────────── */}
            <TabsContent value="audit" className="pt-4">
              <DataTable<AuditEvent>
                columns={auditColumns}
                data={recentAudit.data ?? undefined}
                isLoading={recentAudit.isLoading}
                error={recentAudit.error as Error | null}
                emptyState={{
                  title: "No recent audit events",
                  description:
                    "This member hasn't performed any audited actions in the recent window.",
                }}
                pageSize={10}
                onRetry={() => void recentAudit.refetch()}
              />
            </TabsContent>

            {/* ── Permissions Granted tab ──────────────────────────── */}
            <TabsContent value="permissions" className="pt-4">
              <DataTable<Permission>
                columns={permissionColumns}
                data={grants.data ?? undefined}
                isLoading={grants.isLoading}
                error={grants.error as Error | null}
                emptyState={{
                  title: "No permissions granted yet",
                  description:
                    "This member hasn't received access to any knowledge items yet. Grant access from the Access Control screen.",
                }}
                pageSize={10}
                onRetry={() => void grants.refetch()}
              />
            </TabsContent>

            {/* ── AI Teammates Owned tab ───────────────────────────── */}
            <TabsContent value="teammates" className="pt-4">
              <DataTable<Entity>
                columns={teammateColumns}
                data={aiTeammatesOwned.data ?? undefined}
                isLoading={aiTeammatesOwned.isLoading}
                error={aiTeammatesOwned.error as Error | null}
                emptyState={{
                  title: "No AI Teammates yet",
                  description:
                    "This member doesn't own any AI Teammates. Create one from the AI Teammates screen.",
                }}
                pageSize={10}
                onRetry={() => void aiTeammatesOwned.refetch()}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Hide the SheetTrigger export-only no-op so the component file is
// self-contained without prop-drilling Trigger from the parent.
void SheetTrigger;

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

const hierarchyColumns: ColumnDef<EntityMembership>[] = [
  {
    id: "role_title",
    header: "Role",
    accessorFn: (row) => row.role_title ?? "—",
  },
  {
    id: "department",
    header: "Department",
    accessorFn: (row) => row.department ?? "—",
  },
  {
    id: "hierarchy_level",
    header: "Level",
    accessorKey: "hierarchy_level",
  },
  {
    id: "is_admin",
    header: "Admin",
    accessorFn: (row) => (row.is_admin ? "Yes" : "No"),
  },
];

const auditColumns: ColumnDef<AuditEvent>[] = [
  {
    id: "event_type",
    header: "Event",
    accessorFn: (row) => getAuditEventLabel(row.event_type),
  },
  {
    id: "outcome",
    header: "Outcome",
    accessorKey: "outcome",
  },
  {
    id: "timestamp",
    header: "When",
    accessorFn: (row) => formatRelativeTime(row.timestamp),
  },
];

const permissionColumns: ColumnDef<Permission>[] = [
  {
    id: "capsule_id",
    header: "Knowledge item",
    accessorFn: (row) => row.capsule_id.slice(0, 8) + "…",
  },
  {
    id: "access_scope",
    header: "Access scope",
    accessorKey: "access_scope",
  },
  {
    id: "duration_type",
    header: "Duration",
    accessorKey: "duration_type",
  },
  {
    id: "valid_from",
    header: "Granted",
    accessorFn: (row) => formatRelativeTime(row.valid_from),
  },
];

const teammateColumns: ColumnDef<Entity>[] = [
  {
    id: "display_name",
    header: "Name",
    accessorKey: "display_name",
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
  },
  {
    id: "type",
    header: "Type",
    accessorFn: (row) => getEntityTypeLabel(row.entity_type),
  },
  {
    id: "updated",
    header: "Last updated",
    accessorFn: (row) => formatRelativeTime(row.updated_at),
  },
];

// getCapsuleTypeLabel referenced for forward use when permission
// rows surface their target capsule's type in 12C.
void getCapsuleTypeLabel;
