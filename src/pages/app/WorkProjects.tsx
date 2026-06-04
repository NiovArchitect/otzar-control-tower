// FILE: WorkProjects.tsx
// PURPOSE: Phase 4E — minimal employee-facing WorkProject page
//          consuming the Phase 1 routes (Foundation #281). Create a
//          project (caller becomes OWNER), list owned/joined
//          projects, archive a project, manage members.
//          Deliberately minimal — not a full project-management
//          suite. The directive said "do not build a huge project
//          management suite" and "do not fake identities or
//          membership".
// CONNECTS TO: api.otzar.workProjects.*

import { useState } from "react";
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
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work projects"
        description="Create projects so your Twin understands which work belongs together. Same-project collaboration usually flows automatically; cross-project work asks for approval."
      />

      <CreateProjectForm onCreated={invalidate} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your active projects</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading && <Skeleton className="h-24 w-full" />}
          {list.data && list.data.ok && (
            <ProjectList
              projects={list.data.data.projects}
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
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
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
        <CardTitle className="text-lg">New project</CardTitle>
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
            placeholder="Phoenix launch"
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
      <p className="text-sm text-muted-foreground" data-testid="projects-empty">
        No projects yet. Create your first one above.
      </p>
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
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{project.state}</Badge>
        <span className="text-sm font-medium text-foreground">
          {project.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(project.created_at)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelect}
          data-testid={`project-toggle-${project.project_id}`}
        >
          {selected ? "Hide members" : "Members"}
        </Button>
        {project.archivable && (
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
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const members = useQuery({
    queryKey: ["otzar", "work-projects", projectId, "members"],
    queryFn: () => api.otzar.workProjects.members(projectId),
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
      } else {
        setError(result.message);
      }
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (entityId.trim().length === 0) {
      setError("Entity id is required.");
      return;
    }
    add.mutate();
  }

  return (
    <Card data-testid="project-members-panel">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Members</CardTitle>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-3">
          <input
            data-testid="add-member-id"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Coworker entity id"
          />
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
            {add.isPending ? "Adding…" : "Add member"}
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
          <span className="font-mono text-xs">{m.entity_id}</span>
        </li>
      ))}
    </ul>
  );
}
