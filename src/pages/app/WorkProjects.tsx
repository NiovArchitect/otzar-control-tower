// FILE: WorkProjects.tsx
// PURPOSE: Employee Work OS project surface — see which projects you are on,
//          create one, manage members with human names (not entity UUIDs).
//          Projects are the coherence anchor for Twin / Dandelion structure.
// CONNECTS TO: api.otzar.workProjects.*, AmbientWorkSurface "Your projects".

import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  CreateWorkProjectRequest,
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
        <ProjectMembersPanel
          projectId={selectedId}
          projectName={
            projects.find((p) => p.project_id === selectedId)?.name ?? "Project"
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
          {selected ? "Hide people" : "People on this project"}
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

function ProjectMembersPanel({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const members = useQuery({
    queryKey: ["otzar", "work-projects", projectId, "members"],
    queryFn: () => api.otzar.workProjects.members(projectId),
  });
  const colleagues = useQuery({
    queryKey: ["otzar", "work-projects", "colleagues"],
    queryFn: () => api.otzar.workProjects.colleagues(),
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

  return (
    <Card data-testid="project-members-panel">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">People · {projectName}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Add teammates by name. Access is not granted outside this project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <MembersList members={members.data.data.members} />
        )}
        {members.data && !members.data.ok && (
          <p className="text-sm text-destructive">{members.data.message}</p>
        )}
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
