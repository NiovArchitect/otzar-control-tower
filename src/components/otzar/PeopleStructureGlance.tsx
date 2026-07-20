// FILE: PeopleStructureGlance.tsx
// PURPOSE: First-use hierarchy discoverability on People — one calm card
//          showing who you report to, who reports to you, and a shallow
//          org tree. Admins can set a reporting line here (same assign API
//          as Control Tower Users). Never invents edges.
// CONNECTS TO: Collaboration page, api.org.hierarchy, personal-structure.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { formatPersonName } from "@/lib/identity/person-name";
import { buildPersonalStructure } from "@/lib/org/personal-structure";

function label(name: string, role: string | null): string {
  const n = formatPersonName(name) || name;
  if (role && role.trim().length > 0) return `${n} · ${role}`;
  return n;
}

export function PeopleStructureGlance(): JSX.Element {
  const queryClient = useQueryClient();
  const email = useAuthStore((s) => s.entity?.email ?? null);
  const capabilities = useAuthStore((s) => s.capabilities);
  const admin = isOrgAdmin(capabilities);

  const hierarchy = useQuery({
    queryKey: ["org", "hierarchy", "people-glance"],
    queryFn: () => api.org.hierarchy.get(),
  });
  const people = useQuery({
    queryKey: ["org", "entities", "person", "people-glance"],
    queryFn: () => api.org.entities.list({ type: "PERSON", take: 250 }),
  });

  const structure = useMemo(() => {
    if (!hierarchy.data?.ok || !people.data?.ok) return null;
    return buildPersonalStructure({
      orgEntityId: hierarchy.data.data.org_entity_id,
      memberships: hierarchy.data.data.memberships,
      people: people.data.data.items.map((p) => ({
        entity_id: p.entity_id,
        display_name: p.display_name,
        email: p.email,
      })),
      viewerEmail: email,
    });
  }, [hierarchy.data, people.data, email]);

  const loading = hierarchy.isLoading || people.isLoading;
  const denied =
    (hierarchy.data && !hierarchy.data.ok) ||
    (people.data && !people.data.ok);

  if (loading) {
    return (
      <Card data-testid="people-structure-loading">
        <CardContent className="py-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (denied || structure === null) {
    return (
      <Card data-testid="people-structure-unavailable">
        <CardContent className="py-3 text-sm text-muted-foreground">
          Reporting structure is not available on this account yet.
        </CardContent>
      </Card>
    );
  }

  const trees = structure.trees.slice(0, 6);

  return (
    <Card data-testid="people-structure-glance">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Network className="h-4 w-4 text-indigo-500" aria-hidden />
          How work reports
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Otzar routes reviews and escalations along this structure — not a flat
          list of names.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Your place — ADHD one-shot */}
        <div
          className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5"
          data-testid="people-structure-you"
        >
          {structure.self === null ? (
            <p className="text-sm text-muted-foreground">
              Sign-in identity could not be matched to a person row yet.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              <li>
                <span className="text-muted-foreground">You report to </span>
                <span className="font-medium text-foreground" data-testid="people-structure-manager">
                  {structure.manager
                    ? label(structure.manager.name, structure.manager.role_title)
                    : "no one yet (top of chain)"}
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">Reports to you </span>
                <span className="font-medium text-foreground" data-testid="people-structure-reports">
                  {structure.reports.length === 0
                    ? "— none"
                    : structure.reports
                        .map((r) => formatPersonName(r.name) || r.name)
                        .join(", ")}
                </span>
              </li>
            </ul>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground" data-testid="people-structure-pulse">
            {structure.peopleCount} people · {structure.withoutManagerCount} at
            top (no manager line)
          </p>
        </div>

        {/* Shallow org tree */}
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
                      .map((r) => formatPersonName(r.name) || r.name)
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
          <p className="text-sm text-muted-foreground" data-testid="people-structure-empty-tree">
            No reporting lines yet. When managers are set, Otzar can route work
            up the right chain.
          </p>
        )}

        {admin ? (
          <AdminReportingEditor
            people={
              people.data?.ok
                ? people.data.data.items.map((p) => ({
                    entity_id: p.entity_id,
                    display_name: p.display_name,
                    email: p.email,
                  }))
                : []
            }
            onSaved={() => {
              void queryClient.invalidateQueries({
                queryKey: ["org", "hierarchy"],
              });
            }}
          />
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Only org admins change reporting lines. Ask your admin if your
            manager looks wrong.
          </p>
        )}
      </CardContent>
    </Card>
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
            ? "That would create a loop — pick a different manager."
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
            Same as Control Tower → People. Changes are audited.
          </p>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            data-testid="people-structure-person"
            aria-label="Person"
          >
            <option value="">Choose a person…</option>
            {people.map((p) => (
              <option key={p.entity_id} value={p.entity_id}>
                {formatPersonName(p.display_name) || p.display_name}
                {p.email ? ` (${p.email})` : ""}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            data-testid="people-structure-manager-select"
            aria-label="Manager"
          >
            <option value="">No manager (top level)</option>
            {people
              .filter((p) => p.entity_id !== personId)
              .map((p) => (
                <option key={p.entity_id} value={p.entity_id}>
                  {formatPersonName(p.display_name) || p.display_name}
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
            {assign.isPending ? "Saving…" : "Save reporting line"}
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
