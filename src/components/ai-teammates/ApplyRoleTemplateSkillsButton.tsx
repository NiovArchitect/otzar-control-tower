// FILE: ApplyRoleTemplateSkillsButton.tsx
// PURPOSE: G-01 — Apply default skills for the twin's role template so the
//          AI Teammate can act on the user's behalf (not an empty chatbot).
// CONNECTS TO: role-template-skills.ts, api.org.aiTeammates.addSkill,
//          TwinDetailDrawer Skills tab.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  needsRoleTemplateSkills,
  resolveSkillPackagesForRoleTemplate,
  roleTemplateSkillsSummary,
  skillIntentsForRoleTemplate,
} from "@/lib/ai-teammates/role-template-skills";
import { roleTemplateLabel } from "@/lib/labels/role-template";

interface ApplyRoleTemplateSkillsButtonProps {
  twinId: string;
  roleTemplate: string | null | undefined;
  assignedPackageIds: readonly string[];
  /** When true, auto-run once catalog loads if skills are missing. */
  autoApply?: boolean;
}

export function ApplyRoleTemplateSkillsButton({
  twinId,
  roleTemplate,
  assignedPackageIds,
  autoApply = false,
}: ApplyRoleTemplateSkillsButtonProps): JSX.Element {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const autoAttempted = useRef(false);

  const catalogQuery = useQuery({
    queryKey: ["org", "skill-packages"],
    queryFn: async () => {
      const result = await api.org.skillPackages.list();
      if (!result.ok) throw new Error(result.message);
      return result.data.items;
    },
  });

  const catalog = catalogQuery.data ?? [];
  const plan = resolveSkillPackagesForRoleTemplate({
    roleTemplate,
    catalog,
    alreadyAssignedPackageIds: assignedPackageIds,
  });
  const needs = needsRoleTemplateSkills({
    roleTemplate,
    catalog,
    alreadyAssignedPackageIds: assignedPackageIds,
  });
  const intents = skillIntentsForRoleTemplate(roleTemplate);
  const templateLabel = roleTemplateLabel(roleTemplate);

  const apply = useCallback(async (): Promise<void> => {
    const next = resolveSkillPackagesForRoleTemplate({
      roleTemplate,
      catalog,
      alreadyAssignedPackageIds: assignedPackageIds,
    });
    if (next.toAssign.length === 0) return;
    setBusy(true);
    setNotice(null);
    let ok = 0;
    let fail = 0;
    for (const pkg of next.toAssign) {
      const r = await api.org.aiTeammates.addSkill(twinId, pkg.package_id);
      if (r.ok) ok += 1;
      else fail += 1;
    }
    await queryClient.invalidateQueries({
      queryKey: ["org", "ai-teammate", twinId],
    });
    setBusy(false);
    if (fail === 0) {
      setNotice(
        `Applied ${ok} role-template skill${ok === 1 ? "" : "s"} for ${templateLabel}. This AI Teammate can act with those capabilities under policy.`,
      );
    } else {
      setNotice(
        `Applied ${ok}, failed ${fail}. Check skill packages and try again.`,
      );
    }
  }, [
    assignedPackageIds,
    catalog,
    queryClient,
    roleTemplate,
    templateLabel,
    twinId,
  ]);

  useEffect(() => {
    if (!autoApply || autoAttempted.current) return;
    if (catalogQuery.isLoading || catalog.length === 0 || !needs || busy) return;
    autoAttempted.current = true;
    void apply();
  }, [autoApply, apply, busy, catalog.length, catalogQuery.isLoading, needs]);

  if (catalogQuery.isLoading) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="role-template-skills-loading">
        Loading skill packages for role template…
      </p>
    );
  }

  if (catalogQuery.isError) {
    return (
      <p className="text-xs text-destructive" data-testid="role-template-skills-error">
        Couldn&apos;t load skill packages. Role template skills can&apos;t be applied yet.
      </p>
    );
  }

  return (
    <div
      className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3"
      data-testid="role-template-skills-panel"
      data-role-template={roleTemplate ?? ""}
      data-skills-needed={needs ? "true" : "false"}
      data-to-assign={String(plan.toAssign.length)}
    >
      <p className="text-sm font-medium">
        Skills from role template · {templateLabel}
      </p>
      <p className="text-xs text-muted-foreground">
        Templated AI Teammates carry skills so they can act on the member&apos;s
        behalf under policy — not as an empty chatbot.
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
        {intents.map((i) => (
          <li key={i.label}>{i.label}</li>
        ))}
      </ul>
      <p
        className="text-xs text-muted-foreground"
        data-testid="role-template-skills-summary"
      >
        {roleTemplateSkillsSummary({
          roleTemplate,
          catalog,
          alreadyAssignedPackageIds: assignedPackageIds,
        })}
      </p>
      <Button
        type="button"
        size="sm"
        variant={needs ? "default" : "outline"}
        disabled={busy || !needs}
        onClick={() => void apply()}
        data-testid="apply-role-template-skills"
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {busy
          ? "Applying…"
          : needs
            ? `Apply role template skills (${plan.toAssign.length})`
            : "Role template skills applied"}
      </Button>
      {notice !== null ? (
        <p
          className="text-xs text-foreground"
          data-testid="role-template-skills-notice"
          role="status"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
