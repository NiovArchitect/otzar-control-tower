// FILE: CreateTwinDialog.tsx
// PURPOSE: Dialog wrapping an AuditAwareForm that creates a new AI
//          Teammate. Body shape per architectural anchor: { owner_
//          entity_id, role_title, is_admin_invite } -- no synthetic
//          name / skill_package_id / behavior_policy fields. Skill
//          assignment is a separate post-create step from the
//          TwinDetailDrawer Skills tab.
// CONNECTS TO: AITeammates.tsx (Create button), api.org.aiTeammates.
//              create (Stage 4 audit chain via 12B.0
//              AITeammateCreateResponse.audit_event_id),
//              api.org.entities.list (owner picker),
//              api.org.aiTeammates.list + api.org.hierarchy.get
//              (already-twinned filter).
//
// is_admin_invite GATING (Q4 resolution -- Foundation HEAD ee4dafb):
// Foundation's POST /api/v1/org/ai-teammates handler authorizes via
// requireAdminCapability("can_admin_org") only -- there is NO
// caller-side hierarchy_level guard on the is_admin_invite path
// (apps/api/src/routes/org.routes.ts ~1207). The Control Tower
// AuthGuard already gates this whole surface to admins, so the
// checkbox renders unconditionally -- no caller-hierarchy fetch.
//
// OWNER FILTER: PERSON entities that already own a twin are
// excluded so the operator can't double-assign. Derived client-side
// from (hierarchy.memberships ∩ aiTeammates.items) since Foundation's
// twin list endpoint (slim shape) doesn't surface owner_entity_id.
//
// 12B.0 contract: success arm surfaces audit_event_id. Failure arms
// (OWNER_NOT_IN_ORG, TWIN_ALREADY_EXISTS, DEFAULT_HIVE_MISSING,
// TWIN_CREATE_FAILED) intentionally omit it; AuditAwareForm renders
// the failure toast without an audit link.

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { AuditAwareForm } from "@/components/audit/AuditAwareForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Entity } from "@/lib/types/foundation";

const createTwinSchema = z.object({
  owner_entity_id: z
    .string()
    .uuid({ message: "Pick an owner from the list." }),
  role_title: z
    .string()
    .min(1, { message: "Role title is required." })
    .max(120, { message: "Role title is too long." }),
  is_admin_invite: z.boolean(),
});

type CreateTwinValues = z.infer<typeof createTwinSchema>;

const DEFAULTS: CreateTwinValues = {
  owner_entity_id: "",
  role_title: "Digital Twin",
  is_admin_invite: false,
};

interface OwnerComboboxProps {
  candidates: readonly Entity[];
  isLoading: boolean;
}

function OwnerCombobox({ candidates, isLoading }: OwnerComboboxProps) {
  const form = useFormContext<CreateTwinValues>();
  const [open, setOpen] = useState(false);
  return (
    <FormField
      control={form.control}
      name="owner_entity_id"
      render={({ field }) => {
        const selected =
          candidates.find((e) => e.entity_id === field.value) ?? null;
        return (
          <FormItem className="flex flex-col">
            <FormLabel>Owner</FormLabel>
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
                      ? selected.display_name
                      : isLoading
                        ? "Loading members..."
                        : "Pick a member"}
                    <ChevronsUpDown
                      className="ml-2 h-4 w-4 shrink-0 opacity-50"
                      aria-hidden
                    />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search members..." />
                  <CommandList>
                    <CommandEmpty>
                      {isLoading
                        ? "Loading members..."
                        : "No eligible members. Every member already has an AI Teammate."}
                    </CommandEmpty>
                    <CommandGroup heading="Eligible members">
                      {candidates.map((person) => (
                        <CommandItem
                          key={person.entity_id}
                          value={`${person.display_name} ${person.email ?? ""}`}
                          onSelect={() => {
                            field.onChange(person.entity_id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              person.entity_id === field.value
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                            aria-hidden
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {person.display_name}
                            </span>
                            {person.email && (
                              <span className="text-xs text-muted-foreground">
                                {person.email}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>
              The person whose AI Teammate this will be. Members with
              an existing AI Teammate are excluded.
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function RoleTitleField() {
  const form = useFormContext<CreateTwinValues>();
  return (
    <FormField
      control={form.control}
      name="role_title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Role title</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>
            How this AI Teammate is referred to operationally (e.g.,
            "Executive Assistant", "Schedule Coordinator").
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AdminInviteField() {
  const form = useFormContext<CreateTwinValues>();
  return (
    <FormField
      control={form.control}
      name="is_admin_invite"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-orange-200 bg-orange-50 p-3">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Mark as EXECUTIVE_OVERRIDE</FormLabel>
            <FormDescription>
              The AI Teammate will inherit the owner's executive
              clearance and can act with admin capabilities on the
              owner's behalf. Behavior Policy still gates day-to-day
              actions.
            </FormDescription>
          </div>
        </FormItem>
      )}
    />
  );
}

interface CreateTwinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTwinDialog({
  open,
  onOpenChange,
}: CreateTwinDialogProps) {
  const queryClient = useQueryClient();

  const personsQuery = useQuery({
    queryKey: ["org", "entities", { type: "PERSON" }],
    queryFn: async () => {
      const result = await api.org.entities.list({
        type: "PERSON",
        take: 250,
      });
      if (!result.ok) throw new Error(result.message);
      return result.data.items;
    },
    enabled: open,
  });

  const aiTeammatesQuery = useQuery({
    queryKey: ["org", "ai-teammates"],
    queryFn: async () => {
      const result = await api.org.aiTeammates.list({ take: 250 });
      if (!result.ok) throw new Error(result.message);
      return result.data.items;
    },
    enabled: open,
  });

  const hierarchyQuery = useQuery({
    queryKey: ["org", "hierarchy"],
    queryFn: async () => {
      const result = await api.org.hierarchy.get();
      if (!result.ok) throw new Error(result.message);
      return result.data.memberships;
    },
    enabled: open,
  });

  const ownersAlreadyTwinned = new Set<string>();
  if (aiTeammatesQuery.data && hierarchyQuery.data) {
    const twinIds = new Set(
      aiTeammatesQuery.data.map((t) => t.entity_id),
    );
    for (const m of hierarchyQuery.data) {
      if (m.is_active && twinIds.has(m.child_id)) {
        ownersAlreadyTwinned.add(m.parent_id);
      }
    }
  }

  const candidates = (personsQuery.data ?? []).filter(
    (p) =>
      p.deleted_at === null &&
      p.status === "ACTIVE" &&
      !ownersAlreadyTwinned.has(p.entity_id),
  );

  const isLoading =
    personsQuery.isLoading ||
    aiTeammatesQuery.isLoading ||
    hierarchyQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="default">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Create AI Teammate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create AI Teammate</DialogTitle>
          <DialogDescription>
            One AI Teammate per member. Skills are assigned after
            creation from the AI Teammate detail panel.
          </DialogDescription>
        </DialogHeader>
        <AuditAwareForm
          variant="primary"
          auditEventType="ADMIN_ACTION"
          auditActionLabel="TWIN_CREATED"
          formSchema={createTwinSchema}
          defaultValues={DEFAULTS}
          submitLabel="Create AI Teammate"
          onSubmit={async (values) => {
            const r = await api.org.aiTeammates.create({
              owner_entity_id: values.owner_entity_id,
              role_title: values.role_title,
              is_admin_invite: values.is_admin_invite,
            });
            if (!r.ok) {
              return { ok: false, error: r.message };
            }
            await queryClient.invalidateQueries({
              queryKey: ["org", "ai-teammates"],
            });
            onOpenChange(false);
            return { ok: true, audit_event_id: r.data.audit_event_id };
          }}
        >
          <OwnerCombobox candidates={candidates} isLoading={isLoading} />
          <RoleTitleField />
          <AdminInviteField />
        </AuditAwareForm>
      </DialogContent>
    </Dialog>
  );
}
