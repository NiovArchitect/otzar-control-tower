// FILE: AssignSkillButton.tsx
// PURPOSE: Popover-backed AuditAwareButton for assigning a single
//          SkillPackage to an AI Teammate. Lives in the
//          TwinDetailDrawer Skills tab header.
// CONNECTS TO: api.org.skillPackages.list (popover content),
//              api.org.aiTeammates.addSkill (Stage 4 audit chain via
//              AssignSkillResponse), TwinDetailDrawer skills query
//              (invalidated on success).
//
// FLOW:
//   1. Operator clicks "Assign skill". Popover opens with a
//      searchable Command list of available SkillPackages (filtered
//      to exclude packages already assigned to this twin).
//   2. Operator picks a package; the popover closes and surfaces an
//      AuditAwareButton (Stage 1 affordance) labeled
//      "Assign {package.name}".
//   3. AuditAwareButton click → POST /org/ai-teammates/:id/skills →
//      AssignSkillResponse with real audit_event_id (Foundation HEAD
//      ca6e982 contract). Stage 4 toast surfaces clickable audit
//      link.
//   4. On success, the parent TwinDetailDrawer's TwinDetailResponse
//      query is invalidated so the Skills tab re-fetches.
//
// 12B.0 contract: failure arms (TWIN_NOT_FOUND,
// SKILL_PACKAGE_NOT_FOUND, INVALID_REQUEST) return 4xx WITHOUT
// audit_event_id. AuditAwareButton's failure path correctly omits
// the audit link in that case.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import {
  AuditAwareButton,
  type AuditAwareButtonResult,
} from "@/components/audit/AuditAwareButton";
import { Button } from "@/components/ui/button";
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
import type { SkillPackage } from "@/lib/types/foundation";

interface AssignSkillButtonProps {
  twinId: string;
  /** package_ids already assigned to this twin -- excluded from the
   *  popover list. Source: TwinDetailResponse.skills mapped to
   *  package_id. */
  assignedPackageIds: readonly string[];
}

export function AssignSkillButton({
  twinId,
  assignedPackageIds,
}: AssignSkillButtonProps) {
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selected, setSelected] = useState<SkillPackage | null>(null);

  const skillPackagesQuery = useQuery({
    queryKey: ["org", "skill-packages"],
    queryFn: async () => {
      const result = await api.org.skillPackages.list();
      if (!result.ok) throw new Error(result.message);
      return result.data.items;
    },
    // Lazy-fetch: don't hit /org/skill-packages until the operator
    // actually opens the popover. Eliminates the eager fetch on
    // every drawer mount and keeps the "no N+1 from
    // TwinDetailDrawer" architectural anchor honest.
    enabled: popoverOpen,
  });

  const assignedSet = new Set(assignedPackageIds);
  const available = (skillPackagesQuery.data ?? []).filter(
    (pkg) => !assignedSet.has(pkg.package_id),
  );

  async function onConfirm(): Promise<AuditAwareButtonResult> {
    if (selected === null) {
      return { ok: false, error: "No skill package selected." };
    }
    const result = await api.org.aiTeammates.addSkill(
      twinId,
      selected.package_id,
    );
    if (!result.ok) {
      return { ok: false, error: result.message };
    }
    await queryClient.invalidateQueries({
      queryKey: ["org", "ai-teammate", twinId],
    });
    setSelected(null);
    return { ok: true, audit_event_id: result.data.audit_event_id };
  }

  return (
    <div className="flex items-center gap-3">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {selected ? `Selected: ${selected.name}` : "Pick skill"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search skill packages..." />
            <CommandList>
              <CommandEmpty>
                {skillPackagesQuery.isLoading
                  ? "Loading skill packages..."
                  : "No unassigned skill packages."}
              </CommandEmpty>
              <CommandGroup heading="Available">
                {available.map((pkg) => (
                  <CommandItem
                    key={pkg.package_id}
                    value={`${pkg.name} ${pkg.category}`}
                    onSelect={() => {
                      setSelected(pkg);
                      setPopoverOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{pkg.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {pkg.category}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AuditAwareButton
        variant="primary"
        auditEventType="ADMIN_ACTION"
        auditActionLabel="TWIN_SKILLS_ASSIGNED"
        targetDescription={
          selected
            ? `Assign skill "${selected.name}" to AI Teammate`
            : "Pick a skill package first"
        }
        onConfirm={onConfirm}
      >
        Assign skill
      </AuditAwareButton>
    </div>
  );
}
