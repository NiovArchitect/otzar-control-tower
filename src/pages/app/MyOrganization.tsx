// FILE: MyOrganization.tsx
// PURPOSE: Phase 1217 — "My Organization" view. Orients the employee
//          in their company without surveillance framing. Shows:
//          - the company + their role + their Twin
//          - their projects (and their role on each)
//          - the people they collaborate with (the existing
//            PeopleDirectory roster from Phase 1216)
//          - a small "What Otzar can / cannot do for me here"
//            section that surfaces the closed-vocab authority bits
//            from /context-health.
//
//          Per [FOUNDER — MY ORGANIZATION]: this is an "orient
//          yourself" surface, not a manager dashboard. Avoid
//          "manager monitoring" / "surveillance" / "activity
//          tracking" language. Use "my team / my place / my
//          permissions" framing.
//
// CONNECTS TO:
//   - src/lib/api.ts (api.otzar.contextHealth)
//   - src/components/otzar/PeopleDirectory (Phase 1216)
//   - src/lib/types/foundation.ts (ContextHealthResponse)
//
// PRIVACY INVARIANT:
//   - Reads ONLY the closed-vocab /context-health projection.
//   - Never renders TAR / wallet / clearance / permission ids /
//     payload / embedding / bearer. The authority section surfaces
//     the human-friendly authority labels (`can_admin_org`,
//     `external_write_policy`) only.

import { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  Briefcase,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PeopleDirectory } from "@/components/otzar/PeopleDirectory";
import { api } from "@/lib/api";
import type { ContextHealthResponse } from "@/lib/types/foundation";

function humanizeTitle(title: string): string {
  switch (title.toUpperCase()) {
    case "FOUNDER":
      return "Founder & CEO";
    case "TECH LEAD":
      return "Tech Lead";
    case "AI UI ENGINEER":
      return "AI UI Engineer";
    case "AI/NLP ENGINEER":
      return "AI/NLP Engineer";
    case "GO-TO-MARKET LEAD":
      return "Go-to-Market Lead";
    case "PRODUCT LEAD":
      return "Product Lead";
    case "RISK & COMPLIANCE LEAD":
      return "Risk & Compliance Lead";
    case "MEDIA LEAD":
      return "Media Lead";
    case "MEMBER":
      return "Team member";
    default:
      return title;
  }
}

function humanizeProjectRole(role: string): string {
  switch (role.toUpperCase()) {
    case "OWNER":
      return "Owner";
    case "MEMBER":
      return "Member";
    case "VIEWER":
      return "Viewer";
    default:
      return role;
  }
}

export function MyOrganization(): JSX.Element {
  const [data, setData] = useState<ContextHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.otzar.contextHealth().then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setData(r.data);
        setError(null);
      } else {
        setError(r.code);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="my-org-loading">
        <PageHeader
          title="My Organization"
          description="Orienting you in your company."
        />
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Loading your org…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error !== null || data === null) {
    return (
      <div className="space-y-6" data-testid="my-org-error">
        <PageHeader
          title="My Organization"
          description="Orienting you in your company."
        />
        <Card className="border-rose-400/40 bg-rose-500/5">
          <CardContent className="py-4 text-sm">
            Couldn't load your org. ({error ?? "Unknown error"})
          </CardContent>
        </Card>
      </div>
    );
  }

  const i = data.identity;
  type Project = (typeof i.projects)[number];
  const projectsByRole: Record<string, Project[]> = {};
  for (const p of i.projects) {
    const role = p.role.toUpperCase();
    if (projectsByRole[role] === undefined) projectsByRole[role] = [];
    projectsByRole[role]!.push(p);
  }
  const sortedRoles = Object.keys(projectsByRole).sort();

  return (
    <div className="space-y-6" data-testid="my-org-page">
      <PageHeader
        title="My Organization"
        description="See where you fit, who you work with, and what Otzar can do for you here. This is your orientation surface — not a dashboard that watches you."
      />

      {/* Company + role + twin */}
      <Card data-testid="my-org-identity">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" aria-hidden /> Your place
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{i.viewer.display_name}</span>
            <span className="text-muted-foreground">·</span>
            <Badge variant="outline">{humanizeTitle(i.viewer.title)}</Badge>
            {i.org.name !== null ? (
              <>
                <span className="text-muted-foreground">at</span>
                <Badge variant="outline">{i.org.name}</Badge>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-3 w-3" aria-hidden />
            {i.twin.active && i.twin.display_name !== null ? (
              <span>
                Your AI Twin is{" "}
                <span className="font-medium text-foreground">
                  {i.twin.display_name}
                </span>
                .
              </span>
            ) : (
              <span>Your AI Twin is not configured yet.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card data-testid="my-org-projects">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FolderKanban className="h-4 w-4" aria-hidden /> Your projects
            <Badge variant="outline" data-testid="my-org-projects-count">
              {i.projects.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {i.projects.length === 0 ? (
            <p
              className="text-xs text-muted-foreground"
              data-testid="my-org-projects-empty"
            >
              You're not a member of any projects yet. Once you're added, your
              projects will appear here.
            </p>
          ) : (
            <div className="space-y-3" data-testid="my-org-projects-by-role">
              {sortedRoles.map((role) => (
                <div key={role}>
                  <p
                    className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground"
                    data-testid="my-org-project-role-section"
                    data-role={role}
                  >
                    {humanizeProjectRole(role)}
                  </p>
                  <ul className="space-y-1">
                    {projectsByRole[role]!.map((p) => (
                      <li
                        key={p.project_id}
                        className="flex items-center justify-between gap-2 rounded border bg-card px-2 py-1.5 text-xs"
                        data-testid="my-org-project-row"
                        data-project-id={p.project_id}
                      >
                        <span className="truncate">{p.name}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {humanizeProjectRole(p.role)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* People (reuse Phase 1216 directory) */}
      <PeopleDirectory />

      {/* What Otzar can / cannot do */}
      <Card data-testid="my-org-authority">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> What Otzar can do
            for you here
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs">
            <AuthorityRow
              label="Read memory and context"
              allowed={i.authority.can_read_capsules}
              extra={undefined}
              testid="auth-read"
            />
            <AuthorityRow
              label="Write to your memory"
              allowed={i.authority.can_write_capsules}
              extra={undefined}
              testid="auth-write"
            />
            <AuthorityRow
              label="Share scoped context with teammates"
              allowed={i.authority.can_share_capsules}
              extra={undefined}
              testid="auth-share"
            />
            <AuthorityRow
              label="Make external API calls"
              allowed={i.authority.can_access_external_api}
              extra={
                i.authority.external_write_policy === "APPROVAL_REQUIRED"
                  ? "Approval required"
                  : undefined
              }
              testid="auth-external"
            />
            <AuthorityRow
              label="Make org-level changes"
              allowed={i.authority.can_admin_org}
              extra={undefined}
              testid="auth-admin-org"
            />
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Otzar follows your organization's policy. Every action is recorded
            in the audit trail. This page is for your orientation — Otzar
            does not watch you or report your activity to your manager.
          </p>
        </CardContent>
      </Card>

      {/* Context counts */}
      <Card data-testid="my-org-signals">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4" aria-hidden /> Your work context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat
            label="Memory summaries"
            value={i.context_signals.memory_capsules_count}
          />
          <Stat
            label="Transcript summaries"
            value={i.context_signals.transcript_summaries_count}
          />
          <Stat
            label="Inbound collaborations"
            value={i.context_signals.collaboration_inbound_count}
          />
          <Stat
            label="Outbound collaborations"
            value={i.context_signals.collaboration_outbound_count}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AuthorityRow({
  label,
  allowed,
  extra,
  testid,
}: {
  label: string;
  allowed: boolean;
  extra: string | undefined;
  testid: string;
}): JSX.Element {
  return (
    <li
      className="flex items-center justify-between gap-2 rounded border bg-card px-2 py-1.5"
      data-testid={testid}
      data-allowed={allowed ? "true" : "false"}
    >
      <span>{label}</span>
      <div className="flex items-center gap-1">
        {extra !== undefined ? (
          <Badge variant="outline" className="text-[10px]">
            {extra}
          </Badge>
        ) : null}
        <Badge variant={allowed ? "outline" : "destructive"} className="text-[10px]">
          {allowed ? "Yes" : "Not yet"}
        </Badge>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div className="rounded border bg-card p-2">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
