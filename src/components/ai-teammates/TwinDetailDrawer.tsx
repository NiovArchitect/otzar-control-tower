// FILE: TwinDetailDrawer.tsx
// PURPOSE: Side drawer (Sheet, side="right") that opens when a row in
//          the AI Teammates table is clicked. Four tabs surface the
//          twin's overview, activity, assigned skills, and behavior-
//          policy settings. Powered by GET /org/ai-teammates/:id
//          (Foundation HEAD ee4dafb), which returns Entity +
//          TwinConfig + owner_entity_id + skills hydrated with
//          SkillPackage in a single fetch.
// CONNECTS TO: AITeammates.tsx (mounts this), api.org.aiTeammates.get
//              (single source for Overview + Skills tabs),
//              api.org.aiTeammates.update (Settings tab Stage 4 audit
//              chain), api.org.audit.list (Activity tab),
//              AssignSkillButton, ExecutiveOverrideBadge,
//              WalletProvenanceBadge, AuditAwareForm.
//
// FETCH STRATEGY:
//   - Overview + Skills tabs share ONE TanStack query keyed
//     ["org", "ai-teammate", twinId]. No N+1 against
//     /org/skill-packages because Foundation hydrates each TwinSkill
//     row with its full SkillPackage.
//   - Activity tab adds one /org/audit fetch (decision #23: client-
//     side filter until 12D extends Foundation with an
//     actor_entity_id query param).
//   - Settings tab posts via api.org.aiTeammates.update; the
//     12B.0-contract audit_event_id flows back through Stage 4.
//
// DRIFT NOTES:
//   - Activity tab uses client-side actor_entity_id filtering.
//     Migration to server-side filtering is a 12D Foundation
//     extension (decision #23).
//   - Skills tab has no remove UI (Q5 12B.3 resolution): the
//     skill-removal endpoint ships in a future Foundation extension
//     (candidate for the 12C.0 batch alongside PATCH /org/entities/:id
//     audit surfacing). Until then, Skills tab is read + assign only.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditAwareForm } from "@/components/audit/AuditAwareForm";
import { DataTable } from "@/components/data/DataTable";
import { ExecutiveOverrideBadge } from "@/components/ai-teammates/ExecutiveOverrideBadge";
import { AssignSkillButton } from "@/components/ai-teammates/AssignSkillButton";
import { ApplyRoleTemplateSkillsButton } from "@/components/ai-teammates/ApplyRoleTemplateSkillsButton";
import { WalletProvenanceBadge } from "@/components/sovereignty/WalletProvenanceBadge";
import { roleTemplateLabel } from "@/lib/labels/role-template";
import { api } from "@/lib/api";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import {
  AUTONOMY_LEVEL_LABELS,
  getAutonomyLevelLabel,
} from "@/lib/labels/autonomy-levels";
import {
  authorityStatusLabel,
  recommendedAutonomyLabel,
} from "@/lib/labels/twin-authority";
import { AUTHORITY_FROM_FOUNDATION } from "@/lib/work-os/twin-authority-binding";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  AITeammateListItem,
  AuditEvent,
  TwinAutonomyLevel,
  TwinSkillWithPackage,
} from "@/lib/types/foundation";
import type { ColumnDef } from "@tanstack/react-table";

interface TwinDetailDrawerProps {
  twin: AITeammateListItem | null;
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

function statusBadge(status: AITeammateListItem["status"]) {
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

const settingsSchema = z.object({
  autonomy_level: z.enum([
    "APPROVAL_REQUIRED",
    "EXECUTIVE_OVERRIDE",
    "OBSERVE_ONLY",
  ]),
  approver_entity_id: z.string().uuid().or(z.literal("")),
});

type SettingsValues = z.infer<typeof settingsSchema>;

function AutonomyLevelField() {
  const form = useFormContext<SettingsValues>();
  return (
    <FormField
      control={form.control}
      name="autonomy_level"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Behavior Policy</FormLabel>
          <Select
            value={field.value}
            onValueChange={(v) => field.onChange(v as TwinAutonomyLevel)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Pick a behavior policy" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(
                Object.keys(AUTONOMY_LEVEL_LABELS) as TwinAutonomyLevel[]
              ).map((level) => (
                <SelectItem key={level} value={level}>
                  {getAutonomyLevelLabel(level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            Governs whether actions need explicit approval, run with
            inherited admin authority, or are observation-only.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ApproverField() {
  const form = useFormContext<SettingsValues>();
  return (
    <FormField
      control={form.control}
      name="approver_entity_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Approver</FormLabel>
          <FormControl>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Approver ID, or leave empty"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormDescription>
            Member who reviews actions when Behavior Policy is
            "Approval required". Leave empty to inherit the owner.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TwinDetailDrawer({
  twin,
  open,
  onOpenChange,
}: TwinDetailDrawerProps) {
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["org", "ai-teammate", twin?.entity_id],
    enabled: open && twin !== null,
    queryFn: async () => {
      if (twin === null) throw new Error("No twin selected");
      const result = await api.org.aiTeammates.get(twin.entity_id);
      if (!result.ok) {
        throw new Error(`Failed to load AI Teammate (${result.code})`);
      }
      return result.data;
    },
  });

  const recentAudit = useQuery({
    queryKey: ["org", "audit", "actor", twin?.entity_id],
    enabled: open && twin !== null,
    queryFn: async () => {
      const result = await api.org.audit.list({ take: 50 });
      if (!result.ok) {
        throw new Error(`Failed to load audit events (${result.code})`);
      }
      // Decision #23: client-side actor_entity_id filter until 12D
      // extends Foundation's GET /org/audit with a server-side
      // ?actor_entity_id query param.
      const filtered = result.data.items.filter(
        (e) => e.actor_entity_id === twin?.entity_id,
      );
      return filtered.slice(0, 10);
    },
  });

  if (twin === null) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl" />
      </Sheet>
    );
  }

  const config = detail.data?.twin_config ?? twin.config;
  const isAdminTwin = config?.is_admin_twin === true;
  const ownerEntityId = detail.data?.owner_entity_id ?? null;
  const skills: TwinSkillWithPackage[] = detail.data?.skills ?? [];
  const assignedPackageIds = skills.map((s) => s.package_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Avatar className="h-12 w-12">
              {/* No avatar URL in Foundation; initials fallback only
                   per Q3 (12B.3). */}
              <AvatarImage alt={twin.display_name} />
              <AvatarFallback>{initials(twin.display_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {twin.display_name}
                </h2>
                {isAdminTwin && <ExecutiveOverrideBadge />}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {statusBadge(twin.status)}
                {config && (
                  <span className="text-xs">
                    {getAutonomyLevelLabel(config.autonomy_level)}
                  </span>
                )}
                <WalletProvenanceBadge
                  walletType="PERSONAL"
                  entityType="AI_AGENT"
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* ── Overview tab ─────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              {detail.isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              )}
              {detail.error && (
                <p className="text-sm text-destructive">
                  {(detail.error as Error).message}
                </p>
              )}
              {detail.data && (
                <>
                  <p
                    className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
                    data-testid="g02-drawer-authority-note"
                    data-g02="true"
                    data-template-grants-authority="false"
                  >
                    {AUTHORITY_FROM_FOUNDATION}
                  </p>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ProfileField
                      label="Display name"
                      value={detail.data.entity.display_name}
                    />
                    <ProfileField
                      label="Behavior Policy"
                      value={getAutonomyLevelLabel(
                        detail.data.twin_config.autonomy_level,
                      )}
                    />
                    <ProfileField
                      label="Authority status"
                      value={authorityStatusLabel(detail.data.twin_config)}
                    />
                    <ProfileField
                      label="Template recommendation"
                      value={recommendedAutonomyLabel(detail.data.twin_config)}
                    />
                    <ProfileField
                      label="Owner"
                      value={
                        ownerEntityId ? (
                          <code className="text-xs">{ownerEntityId}</code>
                        ) : (
                          ". "
                        )
                      }
                    />
                    <ProfileField
                      label="Role template"
                      value={
                        detail.data.twin_config.role_template
                          ? roleTemplateLabel(
                              detail.data.twin_config.role_template,
                            )
                          : "Not set yet"
                      }
                    />
                    <ProfileField
                      label="Skills (from template)"
                      value={
                        skills.length > 0
                          ? `${skills.length} assigned. Acts with role capabilities under policy`
                          : "None yet. Apply role template skills on the Skills tab"
                      }
                    />
                    <ProfileField
                      label="Created"
                      value={formatRelativeTime(detail.data.entity.created_at)}
                    />
                    <ProfileField
                      label="Last updated"
                      value={formatRelativeTime(
                        detail.data.twin_config.updated_at,
                      )}
                    />
                  </dl>
                </>
              )}
            </TabsContent>

            {/* ── Activity tab ─────────────────────────────────────── */}
            {/* Decision #23: client-side filter -- 12D Foundation
                 extension will add ?actor_entity_id to /org/audit. */}
            <TabsContent value="activity" className="pt-4">
              <DataTable<AuditEvent>
                columns={auditColumns}
                data={recentAudit.data ?? undefined}
                isLoading={recentAudit.isLoading}
                error={recentAudit.error as Error | null}
                emptyState={{
                  title: "No recent activity",
                  description:
                    "This AI Teammate hasn't performed any audited actions in the recent window.",
                }}
                pageSize={10}
                onRetry={() => void recentAudit.refetch()}
              />
            </TabsContent>

            {/* ── Skills tab ───────────────────────────────────────── */}
            {/* Q5 (12B.3): no remove UI. Skill removal endpoint ships
                 in a future Foundation extension (candidate for the
                 12C.0 batch alongside PATCH /org/entities/:id audit
                 surfacing). Until then, Skills tab is read + assign
                 only. */}
            <TabsContent value="skills" className="space-y-4 pt-4">
              {/* G-01 — skills come from the role template so the twin can act */}
              {detail.data ? (
                <ApplyRoleTemplateSkillsButton
                  twinId={twin.entity_id}
                  roleTemplate={detail.data.twin_config.role_template}
                  assignedPackageIds={assignedPackageIds}
                  autoApply={skills.length === 0}
                />
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Extra packages (beyond the template defaults):
                </p>
                <AssignSkillButton
                  twinId={twin.entity_id}
                  assignedPackageIds={assignedPackageIds}
                />
              </div>
              <DataTable<TwinSkillWithPackage>
                columns={skillColumns}
                data={detail.data ? skills : undefined}
                isLoading={detail.isLoading}
                error={detail.error as Error | null}
                emptyState={{
                  title: "No skills assigned yet",
                  description:
                    "Apply role template skills above so this AI Teammate can act on the member's behalf. Or pick an extra SkillPackage.",
                }}
                pageSize={10}
                onRetry={() => void detail.refetch()}
              />
            </TabsContent>

            {/* ── Settings tab ─────────────────────────────────────── */}
            <TabsContent value="settings" className="space-y-4 pt-4">
              {detail.data && (
                <AuditAwareForm
                  variant="primary"
                  auditEventType="ADMIN_ACTION"
                  auditActionLabel="AI_TEAMMATE_UPDATE"
                  formSchema={settingsSchema}
                  defaultValues={{
                    autonomy_level: detail.data.twin_config.autonomy_level,
                    approver_entity_id:
                      detail.data.twin_config.approver_entity_id ?? "",
                  }}
                  submitLabel="Save behavior policy"
                  onSubmit={async (values) => {
                    const r = await api.org.aiTeammates.update(
                      twin.entity_id,
                      {
                        autonomy_level: values.autonomy_level,
                        ...(values.approver_entity_id !== ""
                          ? {
                              approver_entity_id: values.approver_entity_id,
                            }
                          : {}),
                      },
                    );
                    if (!r.ok) {
                      return { ok: false, error: r.message };
                    }
                    await queryClient.invalidateQueries({
                      queryKey: ["org", "ai-teammate", twin.entity_id],
                    });
                    await queryClient.invalidateQueries({
                      queryKey: ["org", "ai-teammates"],
                    });
                    return {
                      ok: true,
                      audit_event_id: r.data.audit_event_id,
                    };
                  }}
                >
                  <AutonomyLevelField />
                  <ApproverField />
                </AuditAwareForm>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

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

const skillColumns: ColumnDef<TwinSkillWithPackage>[] = [
  {
    id: "package_name",
    header: "Skill Package",
    accessorFn: (row) => row.package.name,
  },
  {
    id: "category",
    header: "Category",
    accessorFn: (row) => row.package.category,
  },
  {
    id: "assigned_at",
    header: "Assigned",
    accessorFn: (row) => formatRelativeTime(row.assigned_at),
  },
];
