// FILE: GrantPermissionDialog.tsx
// PURPOSE: Dialog wrapping an AuditAwareForm that posts a SHARE
//          request to POST /api/v1/cosmp/share. 6 fields collect the
//          shape Foundation actually expects: grantee_entity_id,
//          capsule_grants[], optional write_reason. The dialog UX
//          collapses the heterogeneity Foundation supports per
//          CapsuleGrant (different scope/share-forward/duration per
//          capsule) into one tuple shared across all chosen capsules
//          -- per-capsule editing (Advanced Grant Mode) is queued for
//          12E Policies.
// CONNECTS TO: AccessControl.tsx (Grant Permission button mounts
//              this), api.cosmp.share (Stage 4 audit chain via 12B.0
//              ShareResponse.audit_event_id),
//              api.org.entities.list (PERSON Combobox source),
//              api.org.aiTeammates.list (AI_AGENT Combobox source),
//              api.org.capsules.list (org-wallet capsules picker
//              source -- Drift 4 boundary).
//
// FOUNDATION CONTRACT (12B.4 Drift 1 + Drift 7):
// Foundation's POST /cosmp/share accepts heterogeneous CapsuleGrant
// per bridge (different scope/share-forward/duration per capsule --
// "one bridge, many shapes"). 12B.4 collapses to one
// (scope, can_share_forward, duration_type) tuple in the dialog UX,
// mapping `capsule_ids → capsule_grants[]` on submit:
//
//   capsule_ids.map(id => ({
//     capsule_id: id,
//     scope, can_share_forward, duration_type,
//     ...(expires_at ? { expires_at } : {}),
//   }))
//
// The matrix preserves per-capsule heterogeneity on the read side via
// MatrixCell aggregation logic + bridge_count badge -- the patent
// claim "one bridge, many shapes" is honest in the data, just
// collapsed in the dialog UX. Per-capsule grant editing (Advanced
// Grant Mode) is tracked for 12E Policies, where heterogeneous
// bridges become first-class.
//
// write_reason discipline (Drift 7): Foundation's TypeScript signature
// is `write_reason?: string`. When the operator leaves the field
// blank or whitespace-only, the body OMITS the property entirely --
// undefined is the proper "absent" state, NOT "". Audit reviewers
// expect the field's absence to mean "no reason given," not "reason
// is the empty string."
//
// FAILURE PATH (12B.4 Refinement 3):
// AuditAwareForm's existing fail mode renders `Action failed: ${result.error}`
// where result.error is the Foundation message verbatim. No custom
// error-code → friendly-copy mapping in 12B.4 -- Foundation owns the
// failure messages. If they're insufficient, that's a 12C.0 batch
// concern alongside the other deferred-forward items.

import { useFormContext } from "react-hook-form";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { AuditAwareForm } from "@/components/audit/AuditAwareForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  PERMISSION_SCOPE_LABELS,
  getPermissionScopeLabel,
} from "@/lib/labels/permission-scopes";
import {
  DURATION_TYPE_DROPDOWN_OPTIONS,
  DURATION_TYPES_WITH_EXPIRES_AT,
  getDurationTypeLabel,
} from "@/lib/labels/duration-types";
import { getCapsuleTypeLabel } from "@/lib/labels/capsule-types";
import { getEntityTypeLabel } from "@/lib/labels/entity-types";
import type {
  AccessScope,
  CapsuleType,
  DurationType,
  Entity,
  EntityType,
  OrgCapsuleListItem,
  ShareRequest,
} from "@/lib/types/foundation";

const grantSchema = z.object({
  grantee_entity_id: z
    .string()
    .uuid({ message: "Pick a grantee from the list." }),
  capsule_ids: z
    .array(z.string().uuid())
    .min(1, { message: "Pick at least one Knowledge Item." }),
  scope: z.enum(["METADATA_ONLY", "SUMMARY", "FULL"]),
  can_share_forward: z.boolean(),
  duration_type: z.enum([
    "TEMPORARY",
    "SHORT_TERM",
    "LONG_TERM",
    "PERMANENT",
    "SESSION_ONLY",
  ]),
  expires_at: z.string().optional(),
  write_reason: z.string().optional(),
});

type GrantValues = z.infer<typeof grantSchema>;

const DEFAULTS: GrantValues = {
  grantee_entity_id: "",
  capsule_ids: [],
  scope: "METADATA_ONLY",
  can_share_forward: false,
  duration_type: "TEMPORARY",
  expires_at: "",
  write_reason: "",
};

interface GranteeCandidate {
  entity_id: string;
  display_name: string;
  entity_type: EntityType;
  email: string | null;
}

function GranteeCombobox({
  candidates,
  isLoading,
}: {
  candidates: readonly GranteeCandidate[];
  isLoading: boolean;
}) {
  const form = useFormContext<GrantValues>();
  const [open, setOpen] = useState(false);
  return (
    <FormField
      control={form.control}
      name="grantee_entity_id"
      render={({ field }) => {
        const selected =
          candidates.find((e) => e.entity_id === field.value) ?? null;
        return (
          <FormItem className="flex flex-col">
            <FormLabel>Grantee</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      "justify-between",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {selected
                      ? `${selected.display_name} · ${getEntityTypeLabel(selected.entity_type)}`
                      : isLoading
                        ? "Loading recipients..."
                        : "Pick a recipient"}
                    <ChevronsUpDown
                      className="ml-2 h-4 w-4 shrink-0 opacity-50"
                      aria-hidden
                    />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search Members or AI Teammates..." />
                  <CommandList>
                    <CommandEmpty>
                      {isLoading
                        ? "Loading recipients..."
                        : "No eligible recipients."}
                    </CommandEmpty>
                    <CommandGroup heading="Recipients">
                      {candidates.map((c) => (
                        <CommandItem
                          key={c.entity_id}
                          value={`${c.display_name} ${c.email ?? ""} ${c.entity_type}`}
                          onSelect={() => {
                            field.onChange(c.entity_id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              c.entity_id === field.value
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                            aria-hidden
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {c.display_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getEntityTypeLabel(c.entity_type)}
                              {c.email ? ` · ${c.email}` : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>
              Members and AI Teammates eligible to receive a grant.
              Cross-wallet recipients are not shown -- this matrix
              governs your enterprise wallet only.
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function CapsuleMultiSelect({
  capsules,
  isLoading,
}: {
  capsules: readonly OrgCapsuleListItem[];
  isLoading: boolean;
}) {
  const form = useFormContext<GrantValues>();
  const [activeChip, setActiveChip] = useState<CapsuleType | null>(null);

  // Distinct capsule_types in the org-wallet slice -- the chips show
  // only types that actually exist in inventory.
  const types = Array.from(
    new Set(capsules.map((c) => c.capsule_type)),
  ).sort((a, b) => a.localeCompare(b));

  const filtered = capsules.filter(
    (c) => activeChip === null || c.capsule_type === activeChip,
  );

  return (
    <FormField
      control={form.control}
      name="capsule_ids"
      render={({ field }) => {
        const selected = new Set<string>(field.value);
        function toggle(id: string): void {
          const next = new Set(selected);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          field.onChange(Array.from(next));
        }
        return (
          <FormItem>
            <FormLabel>Knowledge Items</FormLabel>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveChip(null)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  activeChip === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                All types
              </button>
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setActiveChip(activeChip === t ? null : t)
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs",
                    activeChip === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {getCapsuleTypeLabel(t)}
                </button>
              ))}
            </div>
            <div className="max-h-60 overflow-y-auto rounded-md border border-border">
              {isLoading && (
                <p className="p-3 text-sm text-muted-foreground">
                  Loading Knowledge Items...
                </p>
              )}
              {!isLoading && filtered.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  No Knowledge Items in this filter.
                </p>
              )}
              {filtered.map((c) => {
                const checked = selected.has(c.capsule_id);
                return (
                  <label
                    key={c.capsule_id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 border-b border-border px-3 py-2 last:border-b-0",
                      "hover:bg-accent/40",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(c.capsule_id)}
                      aria-label={`Select ${getCapsuleTypeLabel(c.capsule_type)} capsule`}
                    />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {getCapsuleTypeLabel(c.capsule_type)}
                        </span>
                        {c.topic_tags.slice(0, 2).map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="font-normal"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {c.payload_summary}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <FormDescription>
              {selected.size} selected · drawn from your enterprise
              wallet only (the patent's three-wallet boundary).
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function ScopeField() {
  const form = useFormContext<GrantValues>();
  return (
    <FormField
      control={form.control}
      name="scope"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Access Scope</FormLabel>
          <Select
            value={field.value}
            onValueChange={(v) => field.onChange(v as AccessScope)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(
                Object.keys(PERMISSION_SCOPE_LABELS) as AccessScope[]
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {getPermissionScopeLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            How much of each capsule the grantee can read.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ShareForwardField() {
  const form = useFormContext<GrantValues>();
  return (
    <FormField
      control={form.control}
      name="can_share_forward"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-3">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Allow grantee to re-share</FormLabel>
            <FormDescription>
              When checked, the grantee can extend access to others.
              Off by default -- the matrix renders a chevron overlay
              on cells where this is on.
            </FormDescription>
          </div>
        </FormItem>
      )}
    />
  );
}

function DurationField() {
  const form = useFormContext<GrantValues>();
  const watchDuration = form.watch("duration_type");
  const showExpiresAt = DURATION_TYPES_WITH_EXPIRES_AT.has(watchDuration);
  return (
    <div className="space-y-3">
      <FormField
        control={form.control}
        name="duration_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Duration</FormLabel>
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v as DurationType)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DURATION_TYPE_DROPDOWN_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {getDurationTypeLabel(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {showExpiresAt && (
        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expires at (optional)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Leave blank to use the duration's default window.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

function ReasonField() {
  const form = useFormContext<GrantValues>();
  return (
    <FormField
      control={form.control}
      name="write_reason"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Reason for grant (optional)</FormLabel>
          <FormControl>
            <Textarea
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="Add context for the audit log -- e.g., 'Q4 revenue review project access for finance team'"
              rows={2}
            />
          </FormControl>
          <FormDescription>
            This appears in the audit trail and helps reviewers
            understand why this grant was made.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface GrantPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrantPermissionDialog({
  open,
  onOpenChange,
}: GrantPermissionDialogProps) {
  const queryClient = useQueryClient();

  const personsQuery = useQuery({
    queryKey: ["org", "entities", { type: "PERSON", take: 250 }],
    enabled: open,
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      if (!r.ok) throw new Error(r.message);
      return r.data.items;
    },
  });

  const aiTeammatesQuery = useQuery({
    queryKey: ["org", "ai-teammates", { take: 250 }],
    enabled: open,
    queryFn: async () => {
      const r = await api.org.aiTeammates.list({ take: 250 });
      if (!r.ok) throw new Error(r.message);
      return r.data.items;
    },
  });

  const capsulesQuery = useQuery({
    queryKey: ["org", "capsules", { take: 250 }],
    enabled: open,
    queryFn: async () => {
      const r = await api.org.capsules.list({ take: 250 });
      if (!r.ok) throw new Error(r.message);
      return r.data.items;
    },
  });

  const candidates: GranteeCandidate[] = [
    ...((personsQuery.data ?? []) as Entity[])
      .filter((p) => p.deleted_at === null && p.status === "ACTIVE")
      .map<GranteeCandidate>((p) => ({
        entity_id: p.entity_id,
        display_name: p.display_name,
        entity_type: p.entity_type,
        email: p.email,
      })),
    ...(aiTeammatesQuery.data ?? [])
      .filter((t) => t.status === "ACTIVE")
      .map<GranteeCandidate>((t) => ({
        entity_id: t.entity_id,
        display_name: t.display_name,
        entity_type: "AI_AGENT",
        email: null,
      })),
  ];

  const isLoadingCandidates =
    personsQuery.isLoading || aiTeammatesQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grant Permission</DialogTitle>
          <DialogDescription>
            One bridge, many shapes. Pick a recipient, the Knowledge
            Items, the access scope, and the duration -- the audit
            trail records the grant atomically.
          </DialogDescription>
        </DialogHeader>

        <AuditAwareForm
          variant="primary"
          auditEventType="PERMISSION_CREATED"
          formSchema={grantSchema}
          defaultValues={DEFAULTS}
          submitLabel="Grant permission"
          onSubmit={async (values) => {
            // Drift 1: capsule_ids → capsule_grants[] mapping. Each
            // selected capsule yields one CapsuleGrant carrying the
            // shared (scope, can_share_forward, duration_type) tuple.
            // Foundation supports per-capsule heterogeneity; the dialog
            // collapses for UX. expires_at flows through only when the
            // duration_type is in DURATION_TYPES_WITH_EXPIRES_AT AND
            // the operator filled the picker.
            const expiresAtIso =
              DURATION_TYPES_WITH_EXPIRES_AT.has(values.duration_type) &&
              values.expires_at
                ? new Date(values.expires_at).toISOString()
                : undefined;

            // Drift 7: write_reason is omitted when blank or
            // whitespace-only -- undefined is the proper "absent"
            // state, NOT "".
            const trimmedReason = values.write_reason?.trim() ?? "";
            const writeReason =
              trimmedReason.length > 0 ? trimmedReason : undefined;

            const body: ShareRequest = {
              grantee_entity_id: values.grantee_entity_id,
              capsule_grants: values.capsule_ids.map((id) => ({
                capsule_id: id,
                scope: values.scope,
                can_share_forward: values.can_share_forward,
                duration_type: values.duration_type,
                ...(expiresAtIso ? { expires_at: expiresAtIso } : {}),
              })),
              ...(writeReason !== undefined
                ? { write_reason: writeReason }
                : {}),
            };

            const r = await api.cosmp.share(body);
            if (!r.ok) {
              return { ok: false, error: r.message };
            }
            await queryClient.invalidateQueries({
              queryKey: ["org", "permissions"],
            });
            onOpenChange(false);
            return { ok: true, audit_event_id: r.data.audit_event_id };
          }}
        >
          <GranteeCombobox
            candidates={candidates}
            isLoading={isLoadingCandidates}
          />
          <CapsuleMultiSelect
            capsules={capsulesQuery.data ?? []}
            isLoading={capsulesQuery.isLoading}
          />
          <ScopeField />
          <ShareForwardField />
          <DurationField />
          <ReasonField />
        </AuditAwareForm>
      </DialogContent>
    </Dialog>
  );
}
