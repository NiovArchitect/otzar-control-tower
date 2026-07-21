// FILE: PeopleDirectory.tsx
// PURPOSE: Phase 1216 — render the viewer's org_roster from
//          Foundation's identity-context (Phase 1207 substrate) as a
//          friendly People directory. Mounted at the top of the
//          Collaboration page so an employee can see WHO they can
//          collaborate with before opening the request flow.
//
//          Per [FOUNDER — PEOPLE & COLLABORATION / DANDELION]: the
//          surface is labeled "People & Collaboration" with the
//          subtitle "Powered by Dandelion" so the codename stays
//          familiar without overwhelming first-time enterprise users.
//
// CONNECTS TO:
//   - src/lib/api.ts (api.otzar.contextHealth)
//   - src/lib/types/foundation.ts (ContextHealthResponse.identity.org_roster)
//   - src/pages/app/Collaboration.tsx (mount point)
//
// PRIVACY INVARIANT:
//   - Renders ONLY the closed-vocab roster fields Foundation already
//     exposes: display_name, email, title, shared_project_count,
//     recent_collab_count.
//   - Never renders TAR / wallet / clearance / permission internals
//     for other org members.

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { formatPersonName } from "@/lib/identity/person-name";
import type { ContextHealthResponse } from "@/lib/types/foundation";
import { PersonCockpit } from "@/components/otzar/PersonCockpit";
import { PersonRelationshipPreview } from "@/components/otzar/PersonRelationshipPreview";
import { PersonTypeTaxonomyCard } from "@/components/otzar/PersonTypeTaxonomyCard";
import {
  classifyPersonType,
  inventoryPersonTypes,
  personTypeLabel,
} from "@/lib/org/person-type-taxonomy";

type RosterPeer =
  ContextHealthResponse["identity"]["org_roster"][number];

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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (
    parts[0]!.charAt(0).toUpperCase() +
    parts[parts.length - 1]!.charAt(0).toUpperCase()
  );
}

export function PeopleDirectory({
  onRequestHelp,
}: {
  onRequestHelp?: (entityId: string, displayName: string) => void;
} = {}): JSX.Element {
  const [roster, setRoster] = useState<ReadonlyArray<RosterPeer> | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Phase 1285 slice 2 — the open relationship cockpit (one at a time).
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.otzar.contextHealth().then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setRoster(r.data.identity.org_roster);
        setOrgName(r.data.identity.org.name);
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
      <Card data-testid="people-directory-loading">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Loading your team…
        </CardContent>
      </Card>
    );
  }

  if (error !== null) {
    return (
      <Card
        className="border-rose-400/40 bg-rose-500/5"
        data-testid="people-directory-error"
      >
        <CardContent className="py-4 text-sm">
          Couldn't load your team. ({error})
        </CardContent>
      </Card>
    );
  }

  if (roster === null || roster.length === 0) {
    return (
      <Card data-testid="people-directory-empty">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" aria-hidden /> People in your org
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          No teammates have been added to your organization yet. Once your org
          is seeded, the people you can collaborate with will appear here.
        </CardContent>
      </Card>
    );
  }

  // Sort identical to Foundation's preamble ordering:
  // shared_project_count DESC, recent_collab_count DESC, name ASC.
  const sorted = [...roster].sort((a, b) => {
    if (b.shared_project_count !== a.shared_project_count) {
      return b.shared_project_count - a.shared_project_count;
    }
    if (b.recent_collab_count !== a.recent_collab_count) {
      return b.recent_collab_count - a.recent_collab_count;
    }
    return a.display_name.localeCompare(b.display_name);
  });

  const typeInventory = inventoryPersonTypes(
    sorted.map((p) => ({
      entity_id: p.entity_id,
      display_name: p.display_name,
      title: p.title,
      role_title: p.title,
    })),
  );

  return (
    <div className="space-y-4" data-testid="people-directory-wrap">
      {/* E-03 — person types + participation ≠ authority (employee-safe). */}
      <PersonTypeTaxonomyCard variant="employee" inventory={typeInventory} />

    <Card data-testid="people-directory">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" aria-hidden /> People in your org
          </span>
          {orgName !== null ? (
            <Badge variant="outline" className="text-xs">
              {orgName}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          data-testid="people-directory-list"
        >
          {sorted.map((p) => {
            const open = openId === p.entity_id;
            const pType = classifyPersonType({ title: p.title, role_title: p.title });
            return (
              <li
                key={p.entity_id}
                className={`rounded border bg-card ${open ? "sm:col-span-2" : ""}`}
                data-testid="people-directory-card"
                data-entity-id={p.entity_id}
                data-e03-person-type={pType}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"
                  data-testid="people-directory-card-open"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : p.entity_id)}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                    aria-hidden
                  >
                    {initials(p.display_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{formatPersonName(p.display_name)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {humanizeTitle(p.title)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        data-testid="people-person-type-badge"
                        data-person-type={pType}
                      >
                        {personTypeLabel(pType)}
                      </Badge>
                      {p.shared_project_count > 0 ? (
                        <PersonRelationshipPreview
                          entityId={p.entity_id}
                          displayName={formatPersonName(p.display_name)}
                          mode="projects"
                          count={p.shared_project_count}
                        >
                          <Badge variant="outline" className="text-[10px]">
                            {p.shared_project_count} shared project
                            {p.shared_project_count === 1 ? "" : "s"}
                          </Badge>
                        </PersonRelationshipPreview>
                      ) : null}
                      {p.recent_collab_count > 0 ? (
                        <PersonRelationshipPreview
                          entityId={p.entity_id}
                          displayName={formatPersonName(p.display_name)}
                          mode="collabs"
                          count={p.recent_collab_count}
                        >
                          <Badge variant="outline" className="text-[10px]">
                            {p.recent_collab_count} recent collab
                            {p.recent_collab_count === 1 ? "" : "s"}
                          </Badge>
                        </PersonRelationshipPreview>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{open ? "Close" : "Open"}</span>
                </button>
                {open ? (
                  <div className="px-3 pb-3">
                    <PersonCockpit
                      entityId={p.entity_id}
                      displayName={formatPersonName(p.display_name)}
                      roleTitle={humanizeTitle(p.title)}
                      sharedProjects={p.shared_project_count}
                      recentCollabs={p.recent_collab_count}
                      {...(onRequestHelp !== undefined ? { onRequestHelp } : {})}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[10px] text-muted-foreground">
          You can ask these teammates for help. Sensitive requests still follow
          your organization&apos;s rules.
        </p>
      </CardContent>
    </Card>
    </div>
  );
}
