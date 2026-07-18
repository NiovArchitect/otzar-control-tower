// FILE: WorkProjects.tsx
// PURPOSE: Employee Work OS project surface — see which projects you are on,
//          create one, manage members with human names (not entity UUIDs).
//          Projects are the coherence anchor for Twin / Dandelion structure.
//          [ACCEPTANCE] Selecting a project opens a composed context: people,
//          open work, meetings, and next steps in one place (not a tour of
//          Documents / Calendar / Obligations pages).
// CONNECTS TO: api.otzar.workProjects.*, api.workOs.myWork, AmbientWorkSurface.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  CreateWorkProjectRequest,
  WorkLedgerEntryView,
  WorkProjectMemberRole,
  WorkProjectSafeView,
  WorkProjectMemberSafeView,
} from "@/lib/types/foundation";

const ROLES: ReadonlyArray<WorkProjectMemberRole> = [
  "OWNER",
  "MEMBER",
  "REVIEWER",
];

function labelRole(r: WorkProjectMemberRole): string {
  switch (r) {
    case "OWNER":
      return "Owner";
    case "MEMBER":
      return "Member";
    case "REVIEWER":
      return "Reviewer";
  }
}

export function WorkProjects() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["otzar", "work-projects", "active"],
    queryFn: () => api.otzar.workProjects.list({ state: "ACTIVE" }),
  });

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ["otzar", "work-projects"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["otzar", "work-projects", "manager-structure-gaps"],
    });
  }

  const projects =
    list.data?.ok === true ? list.data.data.projects : ([] as WorkProjectSafeView[]);

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6 pb-24"
      data-testid="work-projects-page"
    >
      <PageHeader
        eyebrow="Missions"
        title="Projects"
        description="Projects group people and work so Otzar and your AI Teammate know what belongs together. Placement is ambient — nobody lives here."
      />

      <ManagerAmbientPlacement onPlaced={invalidate} />

      <CreateProjectForm onCreated={invalidate} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Projects you are on</CardTitle>
          <p className="text-xs text-muted-foreground">
            {list.isLoading
              ? "Loading…"
              : projects.length === 0
                ? "None yet"
                : `${projects.length} active project${projects.length === 1 ? "" : "s"}`}
          </p>
        </CardHeader>
        <CardContent>
          {list.isLoading && <Skeleton className="h-24 w-full" />}
          {list.data && list.data.ok === false && (
            <p className="text-sm text-destructive" data-testid="projects-load-error">
              Couldn&apos;t load projects right now.
            </p>
          )}
          {list.data && list.data.ok && (
            <ProjectList
              projects={projects}
              selectedId={selectedId}
              onSelect={(id) =>
                setSelectedId((curr) => (curr === id ? null : id))
              }
              onArchived={invalidate}
            />
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <ProjectContextPanel
          project={
            projects.find((p) => p.project_id === selectedId) ?? {
              project_id: selectedId,
              name: "Project",
              state: "ACTIVE",
              created_at: new Date(0).toISOString(),
              archivable: false,
              my_role: null,
              member_count: 0,
            }
          }
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

/**
 * Ambient manager surface: only appears when Otzar already noticed reports
 * without a project. Non-blocking — place when it fits, or ignore.
 * Managers act here; Organization Seeding is oversight only.
 */
function ManagerAmbientPlacement({ onPlaced }: { onPlaced: () => void }) {
  const gaps = useQuery({
    queryKey: ["otzar", "work-projects", "manager-structure-gaps"],
    queryFn: () => api.otzar.workProjects.managerStructureGaps(),
    retry: false,
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectByPerson, setProjectByPerson] = useState<Record<string, string>>(
    {},
  );

  if (!gaps.data || !gaps.data.ok) return null;
  const { reports, my_led_projects: led } = gaps.data.data;
  if (reports.length === 0) return null;

  async function place(personId: string): Promise<void> {
    const projectId = projectByPerson[personId] ?? led[0]?.project_id;
    if (!projectId) {
      setError("Create a project you lead first, then place them.");
      return;
    }
    setBusyKey(personId);
    setError(null);
    const r = await api.otzar.workProjects.addMember(projectId, {
      entity_id: personId,
      role: "MEMBER",
    });
    setBusyKey(null);
    if (r.ok) {
      onPlaced();
      void gaps.refetch();
    } else {
      setError(r.message ?? "Could not place them right now.");
    }
  }

  return (
    <Card
      className="border-border/60 bg-muted/10"
      data-testid="manager-ambient-placement"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">People waiting for a first project</CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Otzar noticed this — no rush. When it fits your day, put them on a
          project you lead. Otzar will not nag and will not assign for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {led.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="manager-placement-no-led">
            You lead no active project yet. Create one below, then place them.
          </p>
        ) : null}
        <ul className="space-y-2">
          {reports.map((person) => (
            <li
              key={person.person_entity_id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/60 px-3 py-2"
              data-testid="manager-placement-row"
              data-person-id={person.person_entity_id}
            >
              <span className="min-w-[8rem] flex-1 text-sm font-medium">
                {person.display_name}
              </span>
              {led.length > 0 ? (
                <select
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  data-testid="manager-placement-project"
                  value={
                    projectByPerson[person.person_entity_id] ?? led[0]!.project_id
                  }
                  onChange={(e) =>
                    setProjectByPerson((prev) => ({
                      ...prev,
                      [person.person_entity_id]: e.target.value,
                    }))
                  }
                >
                  {led.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyKey === person.person_entity_id || led.length === 0}
                onClick={() => void place(person.person_entity_id)}
                data-testid="manager-placement-place"
              >
                {busyKey === person.person_entity_id ? "Placing…" : "Place on project"}
              </Button>
            </li>
          ))}
        </ul>
        {error ? (
          <p className="text-xs text-destructive" data-testid="manager-placement-error">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: (body: CreateWorkProjectRequest) =>
      api.otzar.workProjects.create(body),
    onSuccess: (result) => {
      if (result.ok) {
        setName("");
        setError(null);
        onCreated();
      } else {
        setError(result.message);
      }
    },
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length === 0) {
      setError("Project name is required.");
      return;
    }
    create.mutate({ name: name.trim() });
  }
  return (
    <Card data-testid="create-project-form">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Start a project</CardTitle>
        <p className="text-xs text-muted-foreground">
          You become the owner. Add teammates next so Otzar can route shared work.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <input
            id="project-name"
            data-testid="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="e.g. Enterprise pilot, Clinic intake redesign"
          />
          {error && (
            <p className="text-sm text-destructive" data-testid="project-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={create.isPending}
            data-testid="project-submit"
          >
            {create.isPending ? "Creating…" : "Create project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProjectList({
  projects,
  selectedId,
  onSelect,
  onArchived,
}: {
  projects: WorkProjectSafeView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onArchived: () => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground" data-testid="projects-empty">
        <p>
          You are not on any project yet. Create one above, or ask an org admin
          to assign you from Organization Seeding when Otzar finds a structure gap.
        </p>
        <p className="text-xs">
          Without a project, Otzar cannot group your work, tools, and Twin
          context accurately — that is why structure seeds appear for admins.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-3" data-testid="projects-list">
      {projects.map((p) => (
        <ProjectRow
          key={p.project_id}
          project={p}
          selected={p.project_id === selectedId}
          onSelect={() => onSelect(p.project_id)}
          onArchived={onArchived}
        />
      ))}
    </ul>
  );
}

function ProjectRow({
  project,
  selected,
  onSelect,
  onArchived,
}: {
  project: WorkProjectSafeView;
  selected: boolean;
  onSelect: () => void;
  onArchived: () => void;
}) {
  const archive = useMutation({
    mutationFn: () => api.otzar.workProjects.archive(project.project_id),
    onSuccess: onArchived,
  });
  return (
    <li
      className="rounded-md border border-border bg-card px-4 py-3"
      data-testid={`project-row-${project.project_id}`}
      data-project-id={project.project_id}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{project.state === "ACTIVE" ? "Active" : project.state}</Badge>
        {project.my_role ? (
          <Badge variant="secondary" data-testid="project-my-role">
            {labelRole(project.my_role)}
          </Badge>
        ) : null}
        <span className="text-sm font-medium text-foreground">{project.name}</span>
        {typeof project.member_count === "number" ? (
          <span className="text-xs text-muted-foreground" data-testid="project-member-count">
            · {project.member_count} member{project.member_count === 1 ? "" : "s"}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          · {formatRelativeTime(project.created_at)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelect}
          data-testid={`project-toggle-${project.project_id}`}
        >
          {selected ? "Hide project context" : "Open project context"}
        </Button>
        {project.archivable && project.my_role === "OWNER" && (
          <Button
            variant="outline"
            size="sm"
            disabled={archive.isPending}
            onClick={() => archive.mutate()}
            data-testid={`project-archive-${project.project_id}`}
          >
            {archive.isPending ? "Archiving…" : "Archive"}
          </Button>
        )}
      </div>
    </li>
  );
}

/** Composed project context — people + open work + meetings in one panel. */
function ProjectContextPanel({
  project,
  onClose,
}: {
  project: WorkProjectSafeView;
  onClose: () => void;
}) {
  const projectId = project.project_id;
  const queryClient = useQueryClient();
  const members = useQuery({
    queryKey: ["otzar", "work-projects", projectId, "members"],
    queryFn: () => api.otzar.workProjects.members(projectId),
  });
  const colleagues = useQuery({
    queryKey: ["otzar", "work-projects", "colleagues"],
    queryFn: () => api.otzar.workProjects.colleagues(),
  });
  const myWork = useQuery({
    queryKey: ["work-os", "my-work", "project-compose", projectId],
    queryFn: () => api.workOs.myWork({ take: 50 }),
  });
  const dgi = useQuery({
    queryKey: ["otzar", "dgi-coherence", "project-compose"],
    queryFn: () => api.otzar.dgiCoherence(),
  });

  const [entityId, setEntityId] = useState("");
  const [role, setRole] = useState<WorkProjectMemberRole>("MEMBER");
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      api.otzar.workProjects.addMember(projectId, {
        entity_id: entityId.trim(),
        role,
      }),
    onSuccess: (result) => {
      if (result.ok) {
        setEntityId("");
        setError(null);
        void queryClient.invalidateQueries({
          queryKey: ["otzar", "work-projects", projectId, "members"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["otzar", "work-projects"],
        });
      } else {
        setError(result.message);
      }
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (entityId.trim().length === 0) {
      setError("Choose a teammate.");
      return;
    }
    add.mutate();
  }

  const colleagueOptions =
    colleagues.data?.ok === true ? colleagues.data.data.colleagues : [];

  const memberRows: WorkProjectMemberSafeView[] =
    members.data?.ok === true ? members.data.data.members : [];
  const owner = memberRows.find((m) => m.role === "OWNER");

  const stampedWork: WorkLedgerEntryView[] = useMemo(() => {
    if (!myWork.data || !myWork.data.ok) return [];
    const items = myWork.data.data.items ?? myWork.data.data.entries ?? [];
    return items.filter((e) => e.project_id === projectId);
  }, [myWork.data, projectId]);

  const openWork = stampedWork.filter(
    (e) =>
      !(
        e.ledger_type === "MEETING" &&
        (e.status === "EXECUTED" || e.status === "CANCELLED")
      ) &&
      !["COMPLETED", "SUCCEEDED", "CLOSED", "DONE", "CANCELLED"].includes(
        e.status,
      ),
  );
  const meetings = stampedWork.filter((e) => e.ledger_type === "MEETING");
  const twinish = openWork.filter(
    (e) => e.twin_work !== undefined || e.status === "EXECUTING",
  );

  const nextStep =
    dgi.data?.ok === true ? dgi.data.data.coherence?.next_best_step : null;
  const nextLabel = nextStep
    ? `${nextStep.safe_title}${nextStep.reason ? ` — ${nextStep.reason}` : ""}`
    : "";

  return (
    <Card data-testid="project-context-panel" data-project-id={projectId}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500/80">
            Project context
          </p>
          <CardTitle className="text-lg" data-testid="project-context-name">
            {project.name}
          </CardTitle>
          <p className="text-xs text-muted-foreground" data-testid="project-context-summary">
            {project.my_role ? `${labelRole(project.my_role)} · ` : ""}
            {typeof project.member_count === "number"
              ? `${project.member_count} people · `
              : ""}
            {owner?.display_name
              ? `Owner ${owner.display_name}`
              : "Owner not listed"}
            {" · "}
            work, meetings, and decisions that belong here — without touring
            separate backend pages.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* People */}
        <section data-testid="project-context-people" className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">People</h3>
          <p className="text-xs text-muted-foreground">
            Project roles are not the same as org hierarchy or tool access.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <select
              data-testid="add-member-id"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a teammate…</option>
              {colleagueOptions.map((c) => (
                <option key={c.entity_id} value={c.entity_id}>
                  {c.display_name}
                </option>
              ))}
            </select>
            <select
              data-testid="add-member-role"
              value={role}
              onChange={(e) => setRole(e.target.value as WorkProjectMemberRole)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {labelRole(r)}
                </option>
              ))}
            </select>
            {error && (
              <p className="text-sm text-destructive" data-testid="add-member-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={add.isPending}
              data-testid="add-member-submit"
            >
              {add.isPending ? "Adding…" : "Add to project"}
            </Button>
          </form>
          {members.isLoading && <Skeleton className="h-16 w-full" />}
          {members.data && members.data.ok && (
            <div data-testid="project-members-panel">
              <MembersList members={members.data.data.members} />
            </div>
          )}
          {members.data && !members.data.ok && (
            <p className="text-sm text-destructive">{members.data.message}</p>
          )}
        </section>

        {/* Open work stamped to this project */}
        <section data-testid="project-context-work" className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">
              Open work on this project
            </h3>
            <span
              className="rounded-full bg-muted px-2 text-xs text-muted-foreground"
              data-testid="project-work-count"
            >
              {myWork.isLoading ? "…" : openWork.length}
            </span>
          </div>
          {myWork.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : myWork.data && !myWork.data.ok ? (
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load project work right now.
            </p>
          ) : openWork.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="project-work-empty"
            >
              No open work is stamped to this project yet. Commitments from
              communications land here when Otzar links them.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="project-work-list">
              {openWork.map((entry) => (
                <li key={entry.ledger_entry_id}>
                  <WorkLedgerItem entry={entry} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Decisions waiting on you also appear under{" "}
            <Link
              to="/app/action-center"
              className="underline underline-offset-2"
            >
              Needs me
            </Link>
            .
          </p>
        </section>

        {/* Meetings */}
        <section data-testid="project-context-meetings" className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">Meetings</h3>
            <span
              className="rounded-full bg-muted px-2 text-xs text-muted-foreground"
              data-testid="project-meeting-count"
            >
              {myWork.isLoading ? "…" : meetings.length}
            </span>
          </div>
          {meetings.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="project-meetings-empty"
            >
              No meetings linked to this project in your work yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm" data-testid="project-meetings-list">
              {meetings.map((m) => (
                <li
                  key={m.ledger_entry_id}
                  className="rounded-md border border-border px-3 py-2"
                  data-testid="project-meeting-row"
                >
                  <span className="font-medium">{m.title || "Meeting"}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {m.status === "EXECUTED"
                      ? "Scheduled"
                      : m.status === "CANCELLED"
                        ? "Cancelled"
                        : m.status}
                  </span>
                  {m.scheduled_meeting?.provider === "google_calendar_event" ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      On Google Calendar
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* AI Teammate activity on project work */}
        <section data-testid="project-context-twin" className="space-y-2 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">AI Teammate activity</h3>
          {twinish.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="project-twin-empty">
              No AI Teammate-owned work is active on this project right now.
            </p>
          ) : (
            <ul className="space-y-1 text-sm" data-testid="project-twin-list">
              {twinish.slice(0, 5).map((e) => (
                <li key={e.ledger_entry_id}>
                  <span className="font-medium">{e.title || "Work item"}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {e.status}
                    {e.owner_display_name ? ` · ${e.owner_display_name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Org next step (honest: may be broader than this project) */}
        {nextLabel.length > 0 ? (
          <section
            data-testid="project-context-next"
            className="space-y-1 border-t border-border pt-4"
          >
            <h3 className="text-sm font-medium text-foreground">Next best step</h3>
            <p className="text-sm text-muted-foreground">{nextLabel}</p>
            <p className="text-[11px] text-muted-foreground">
              Suggested from your organization posture — confirm it applies to
              this project before acting.
            </p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MembersList({ members }: { members: WorkProjectMemberSafeView[] }) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No members yet.</p>
    );
  }
  return (
    <ul className="space-y-2" data-testid="members-list">
      {members.map((m) => (
        <li
          key={m.project_member_id}
          className="flex items-center gap-2 text-sm"
          data-testid={`member-row-${m.project_member_id}`}
        >
          <Badge variant="outline">{labelRole(m.role)}</Badge>
          <span className="font-medium">
            {m.display_name && m.display_name.length > 0
              ? m.display_name
              : "Teammate"}
          </span>
        </li>
      ))}
    </ul>
  );
}

// re-export path for ambient links
export function ProjectsNavHint(): JSX.Element {
  return (
    <Link to="/app/work-projects" className="text-xs font-medium underline-offset-2 hover:underline">
      Open projects
    </Link>
  );
}
