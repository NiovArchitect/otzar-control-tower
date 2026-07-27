// FILE: PeopleStructureGlance.tsx
// PURPOSE: Optional, dismissible reporting-structure panel on People.
//          Founder rejection: sticky "popup" without close was a trap and
//          leaked rc2-admin test identities. Default collapsed; expands as
//          an inline card (not sticky overlay). Escape / X / Hide dismiss.
// CONNECTS TO: Collaboration page, api.org.hierarchy, synthetic-principal.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Network, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { formatPersonName } from "@/lib/identity/person-name";
import {
  coworkerDisplayLabel,
  filterCoworkerPeople,
  isSyntheticPrincipal,
} from "@/lib/identity/synthetic-principal";
import { buildPersonalStructure } from "@/lib/org/personal-structure";

const DISMISS_KEY = "otzar_people_structure_collapsed";

function label(name: string, role: string | null): string {
  const n = formatPersonName(name) || name;
  if (isSyntheticPrincipal({ display_name: name, email: name })) {
    return "Internal test account";
  }
  if (n.includes("@") && isSyntheticPrincipal({ email: n })) {
    return "Internal test account";
  }
  if (role && role.trim().length > 0) return `${n} · ${role}`;
  return n;
}

function readCollapsedDefault(): boolean {
  if (typeof window === "undefined") return true;
  try {
    // Default collapsed so People opens on the directory, not hierarchy chrome.
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

function writeCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function PeopleStructureGlance(): JSX.Element {
  const queryClient = useQueryClient();
  const email = useAuthStore((s) => s.entity?.email ?? null);
  const capabilities = useAuthStore((s) => s.capabilities);
  const admin = isOrgAdmin(capabilities);
  const [collapsed, setCollapsed] = useState(readCollapsedDefault);
  const panelRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  const hierarchy = useQuery({
    queryKey: ["org", "hierarchy", "people-glance"],
    queryFn: () => api.org.hierarchy.get(),
  });
  const people = useQuery({
    queryKey: ["org", "entities", "person", "people-glance"],
    queryFn: () => api.org.entities.list({ type: "PERSON", take: 250 }),
  });

  const coworkerPeople = useMemo(() => {
    if (!people.data?.ok) return [];
    return filterCoworkerPeople(
      people.data.data.items.map((p) => ({
        entity_id: p.entity_id,
        display_name: p.display_name,
        email: p.email,
      })),
    );
  }, [people.data]);

  const structure = useMemo(() => {
    if (!hierarchy.data?.ok || coworkerPeople.length === 0) {
      // Still try with raw when empty after filter (edge: only synthetic org)
      if (!hierarchy.data?.ok || !people.data?.ok) return null;
    }
    if (!hierarchy.data?.ok) return null;
    const peopleForStructure =
      coworkerPeople.length > 0
        ? coworkerPeople
        : people.data?.ok
          ? filterCoworkerPeople(
              people.data.data.items.map((p) => ({
                entity_id: p.entity_id,
                display_name: p.display_name,
                email: p.email,
              })),
            )
          : [];
    if (peopleForStructure.length === 0) return null;
    return buildPersonalStructure({
      orgEntityId: hierarchy.data.data.org_entity_id,
      memberships: hierarchy.data.data.memberships,
      people: peopleForStructure,
      viewerEmail: email,
    });
  }, [hierarchy.data, people.data, coworkerPeople, email]);

  const loading = hierarchy.isLoading || people.isLoading;
  const denied =
    (hierarchy.data && !hierarchy.data.ok) ||
    (people.data && !people.data.ok);

  function collapse(): void {
    setCollapsed(true);
    writeCollapsed(true);
    // Return focus to the reopen control after close.
    window.setTimeout(() => openBtnRef.current?.focus(), 0);
  }

  function expand(): void {
    setCollapsed(false);
    writeCollapsed(false);
    window.setTimeout(() => panelRef.current?.focus(), 0);
  }

  // Escape closes when expanded (founder requirement).
  useEffect(() => {
    if (collapsed) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        collapse();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- collapse is stable enough
  }, [collapsed]);

  if (loading) {
    return (
      <div className="scroll-mt-4" data-testid="people-structure-anchor">
        <Card data-testid="people-structure-loading">
          <CardContent className="py-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (denied || structure === null) {
    return (
      <div className="scroll-mt-4" data-testid="people-structure-anchor">
        <Card data-testid="people-structure-unavailable">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Reporting structure is not available on this account yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Collapsed: one calm control - People opens on the directory first.
  if (collapsed) {
    return (
      <div className="scroll-mt-4" data-testid="people-structure-anchor">
        <button
          ref={openBtnRef}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 text-left text-sm transition hover:bg-muted/40"
          data-testid="people-structure-open"
          aria-expanded={false}
          onClick={() => expand()}
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Network className="h-4 w-4 text-indigo-500" aria-hidden />
            Reporting structure
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Optional
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </span>
        </button>
      </div>
    );
  }

  const trees = structure.trees
    .map((t) => ({
      ...t,
      reports: t.reports.filter(
        (r) =>
          !isSyntheticPrincipal({
            display_name: r.name,
            email: r.name.includes("@") ? r.name : null,
          }),
      ),
    }))
    .filter(
      (t) =>
        !isSyntheticPrincipal({
          display_name: t.lead.name,
          email: t.lead.name.includes("@") ? t.lead.name : null,
        }),
    )
    .slice(0, 6);

  const reportsVisible = structure.reports.filter(
    (r) =>
      !isSyntheticPrincipal({
        display_name: r.name,
        email: r.name.includes("@") ? r.name : null,
      }),
  );

  return (
    <div
      className="scroll-mt-4"
      data-testid="people-structure-anchor"
      data-people-structure="expanded"
    >
      <Card
        ref={panelRef}
        tabIndex={-1}
        data-testid="people-structure-glance"
        className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        role="region"
        aria-label="Reporting structure"
      >
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4 text-indigo-500" aria-hidden />
              Reporting structure
            </CardTitle>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Hide reporting structure"
              data-testid="people-structure-close"
              onClick={() => collapse()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Who reports to whom for reviews and escalations. Hide anytime -
            your people list stays available below.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5"
            data-testid="people-structure-you"
          >
            {structure.self === null ? (
              <p className="text-sm text-muted-foreground">
                Your place in the reporting line is not set yet.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                <li>
                  <span className="text-muted-foreground">You report to </span>
                  <span
                    className="font-medium text-foreground"
                    data-testid="people-structure-manager"
                  >
                    {structure.manager
                      ? label(
                          structure.manager.name,
                          structure.manager.role_title,
                        )
                      : "no one yet (top of chain)"}
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground">Reports to you </span>
                  <span
                    className="font-medium text-foreground"
                    data-testid="people-structure-reports"
                  >
                    {reportsVisible.length === 0
                      ? "(none)"
                      : reportsVisible
                          .map((r) =>
                            coworkerDisplayLabel({
                              display_name: r.name,
                              email: r.name.includes("@") ? r.name : null,
                            }),
                          )
                          .join(", ")}
                  </span>
                </li>
              </ul>
            )}
            <p
              className="mt-1.5 text-[11px] text-muted-foreground"
              data-testid="people-structure-pulse"
            >
              {structure.peopleCount} people shown ·{" "}
              {structure.withoutManagerCount} without a manager line
            </p>
          </div>

          {trees.length > 0 ? (
            <ul className="space-y-2" data-testid="people-structure-trees">
              {trees.map((t) => (
                <li
                  key={t.lead.entity_id}
                  className="text-sm"
                  data-testid="people-structure-tree"
                >
                  <p className="font-medium text-foreground">
                    {label(t.lead.name, t.lead.role_title)}
                  </p>
                  {t.reports.length > 0 ? (
                    <p className="mt-0.5 pl-3 text-xs text-muted-foreground">
                      →{" "}
                      {t.reports
                        .slice(0, 6)
                        .map((r) =>
                          coworkerDisplayLabel({
                            display_name: r.name,
                            email: r.name.includes("@") ? r.name : null,
                          }),
                        )
                        .join(", ")}
                      {t.reports.length > 6
                        ? ` +${t.reports.length - 6} more`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-0.5 pl-3 text-xs text-muted-foreground">
                      → no direct reports listed
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="text-sm text-muted-foreground"
              data-testid="people-structure-empty-tree"
            >
              No reporting lines yet. When managers are set, reviews route along
              the right chain.
            </p>
          )}

          {admin ? (
            <>
              <AdminReportingEditor
                people={coworkerPeople}
                onSaved={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["org", "hierarchy"],
                  });
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Full org map and bulk tools:{" "}
                <Link
                  to="/users"
                  className="font-medium text-indigo-600 underline-offset-2 hover:underline"
                  data-testid="people-structure-open-ct-users"
                >
                  Open organization members
                </Link>
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Only organization admins change reporting lines.
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="people-structure-hide"
              onClick={() => collapse()}
            >
              Hide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminReportingEditor({
  people,
  onSaved,
}: {
  people: Array<{
    entity_id: string;
    display_name: string;
    email: string | null;
  }>;
  onSaved: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const assign = useMutation({
    mutationFn: () =>
      api.org.hierarchy.assign({
        person_entity_id: personId,
        manager_entity_id: managerId.length > 0 ? managerId : null,
      }),
    onSuccess: (r) => {
      if (r.ok && r.data.ok) {
        const person = people.find((p) => p.entity_id === personId);
        const manager = people.find((p) => p.entity_id === managerId);
        setNotice(
          manager
            ? `${formatPersonName(person?.display_name ?? "Member")} now reports to ${formatPersonName(manager.display_name)}.`
            : `${formatPersonName(person?.display_name ?? "Member")} is at the top (no manager).`,
        );
        setPersonId("");
        setManagerId("");
        onSaved();
      } else {
        const code = r.ok ? null : r.code;
        setNotice(
          code === "CYCLE"
            ? "That would create a loop. Pick a different manager."
            : "Could not save reporting line. Try again.",
        );
      }
    },
  });

  return (
    <div className="border-t border-border pt-3" data-testid="people-structure-admin">
      <button
        type="button"
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        onClick={() => setOpen((v) => !v)}
        data-testid="people-structure-admin-toggle"
      >
        {open ? "Hide set manager" : "Set a reporting line"}
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Changes are audited. Test accounts are hidden from this list.
          </p>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            data-testid="people-structure-person-select"
          >
            <option value="">Select person</option>
            {people.map((p) => (
              <option key={p.entity_id} value={p.entity_id}>
                {coworkerDisplayLabel(p)}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            data-testid="people-structure-manager-select"
          >
            <option value="">No manager (top of chain)</option>
            {people.map((p) => (
              <option key={p.entity_id} value={p.entity_id}>
                {coworkerDisplayLabel(p)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={personId.length === 0 || assign.isPending}
            onClick={() => assign.mutate()}
            data-testid="people-structure-assign"
          >
            Save
          </Button>
          {notice ? (
            <p className="text-xs text-muted-foreground" data-testid="people-structure-notice">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
