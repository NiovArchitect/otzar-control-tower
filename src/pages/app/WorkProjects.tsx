// FILE: WorkProjects.tsx
// PURPOSE: Projects are Otzar's mission anchors — who, what work, blockers,
//          and AI Teammate activity for an organizational goal. Opening
//          context must land in-viewport with a clear project heart (not an
//          empty panel below the fold). Users do not live here.
// CONNECTS TO: api.otzar.workProjects.*, api.workOs.myWork, AmbientWorkSurface.

import { useEffect, useMemo, useRef, useState } from "react";
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
  const contextRef = useRef<HTMLDivElement | null>(null);
  // J-03 — conversation deep-link: /app/work-projects?project=<id>&open=1
  // resolves Talk → mission heart in ONE hop (no list maze).
  const [fromConversation, setFromConversation] = useState(false);

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
    list.data?.ok === true
      ? list.data.data.projects
      : ([] as WorkProjectSafeView[]);

  // Apply ?project= once projects load (Talk / voice resolution).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (projects.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("project");
    if (pid === null || pid.length === 0) return;
    const exists = projects.some((p) => p.project_id === pid);
    if (!exists) return;
    setSelectedId(pid);
    if (params.get("open") === "1") setFromConversation(true);
  }, [projects]);

  const selected =
    selectedId === null
      ? null
      : (projects.find((p) => p.project_id === selectedId) ?? null);

  // Smoke-proven: panel used to mount below the fold with no scroll — felt
  // like "nothing opened". Always bring context into the shell viewport.
  useEffect(() => {
    if (selectedId === null || contextRef.current === null) return;
    const el = contextRef.current;
    // Prefer scrolling the employee shell main (not the window).
    const main = el.closest("main");
    requestAnimationFrame(() => {
      if (main instanceof HTMLElement) {
        const top =
          el.getBoundingClientRect().top -
          main.getBoundingClientRect().top +
          main.scrollTop -
          12;
        main.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [selectedId]);

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-4 pb-24"
      data-testid="work-projects-page"
      data-conversation-resolved={fromConversation && selected !== null ? "true" : "false"}
      data-selected-project={selected?.project_id ?? ""}
    >
      <PageHeader
        eyebrow="Missions"
        title="Projects"
        description="A project is the mission Otzar organizes around — people, work, and AI Teammate effort for one organizational goal. Open context to see that heart in one place."
      />

      {/* Context first when open — never buried under create/list scroll. */}
      {selected !== null ? (
        <div
          ref={contextRef}
          className="scroll-mt-3"
          data-testid="project-context-anchor"
        >
          {fromConversation ? (
            <p
              className="mb-2 text-xs text-muted-foreground"
              data-testid="conversation-project-resolved"
            >
              Opened from Talk — mission heart in one hop (not a multi-page maze).
            </p>
          ) : null}
          <ProjectContextPanel
            project={selected}
            onClose={() => {
              setSelectedId(null);
              setFromConversation(false);
            }}
          />
        </div>
      ) : null}

      <ManagerAmbientPlacement onPlaced={invalidate} />

      {selected === null ? <CreateProjectForm onCreated={invalidate} /> : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {selected !== null ? "Switch project" : "Your projects"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {list.isLoading
              ? "Loading…"
              : projects.length === 0
                ? "None yet"
                : `${projects.length} active · tap Open to see the mission heart`}
          </p>
        </CardHeader>
        <CardContent>
          {list.isLoading && <Skeleton className="h-24 w-full" />}
          {list.data && list.data.ok === false && (
            <p
              className="text-sm text-destructive"
              data-testid="projects-load-error"
            >
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

      {selected === null ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Otzar uses project membership to keep work, meetings, and AI Teammate
          activity on the right mission — not a generic chat.
        </p>
      ) : null}
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

/**
 * Project heart — one-shot mission view for YC + ADHD:
 * who owns it, who is on it, open work, blockers, AI activity.
 * Mounted at top of page and scrolled into the shell main viewport on open.
 */
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
  const documents = stampedWork.filter(
    (e) =>
      e.ledger_type === "DOCUMENT" ||
      (e.twin_work?.web_view_link != null &&
        e.twin_work.web_view_link.includes("docs.google.com")),
  );
  const blockers = openWork.filter(
    (e) =>
      e.status === "BLOCKED" ||
      e.status === "RUNTIME_MISSING" ||
      e.blind_spot_reason !== undefined,
  );

  const nextStep =
    dgi.data?.ok === true ? dgi.data.data.coherence?.next_best_step : null;
  const coherence =
    dgi.data?.ok === true ? dgi.data.data.coherence : null;
  const truthConflicts =
    coherence?.open_org_truth_conflicts_count ?? 0;
  const obligationTitles =
    coherence?.open_obligation_titles?.slice(0, 3) ?? [];
  const obligationCount = coherence?.open_obligations_count ?? openWork.length;

  const peopleCount =
    typeof project.member_count === "number"
      ? project.member_count
      : memberRows.length;

  // J-02 spine: always-present facets (honest empty when unknown).
  const spineFacets: Array<{
    id: string;
    label: string;
    value: string;
    empty: boolean;
  }> = [
    {
      id: "objective",
      label: "Objective",
      value: project.name,
      empty: false,
    },
    {
      id: "owners",
      label: "Owners",
      value: owner?.display_name
        ? owner.display_name
        : "Owner not listed yet",
      empty: !owner?.display_name,
    },
    {
      id: "truth",
      label: "Truth",
      value:
        truthConflicts > 0
          ? `${truthConflicts} org truth conflict${truthConflicts === 1 ? "" : "s"} need review`
          : "No open org-truth conflicts",
      empty: truthConflicts === 0,
    },
    {
      id: "obligations",
      label: "Obligations",
      value:
        openWork.length > 0
          ? `${openWork.length} open on this mission`
          : obligationCount > 0
            ? `${obligationCount} open in your org posture`
            : "No open obligations stamped here yet",
      empty: openWork.length === 0 && obligationCount === 0,
    },
    {
      id: "meetings",
      label: "Meetings",
      value:
        meetings.length > 0
          ? `${meetings.length} linked`
          : "None linked yet",
      empty: meetings.length === 0,
    },
    {
      id: "next",
      label: "Next",
      value:
        nextStep && nextStep.kind !== "IDLE_HEALTHY"
          ? nextStep.safe_title
          : "No forced next step — mission is quiet",
      empty: !nextStep || nextStep.kind === "IDLE_HEALTHY",
    },
  ];

  return (
    <Card
      className="border-indigo-200/50 shadow-sm"
      data-testid="project-context-panel"
      data-project-id={projectId}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500/80">
              Mission
            </p>
            <CardTitle className="text-xl" data-testid="project-context-name">
              {project.name}
            </CardTitle>
            <p
              className="text-sm text-muted-foreground"
              data-testid="project-context-summary"
            >
              Otzar organizes people, work, and AI Teammate effort around this
              goal so the organization moves one mission forward — not scattered
              tasks.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-testid="project-context-close"
          >
            Close
          </Button>
        </div>

        {/* J-02 — full spine always visible (honest empty, never missing facets). */}
        <dl
          className="grid gap-2 rounded-xl border border-slate-200/80 bg-white/50 p-3 sm:grid-cols-2"
          data-testid="project-spine"
        >
          {spineFacets.map((f) => (
            <div
              key={f.id}
              className="min-w-0"
              data-testid={`project-spine-${f.id}`}
              data-spine-empty={f.empty ? "true" : "false"}
            >
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {f.label}
              </dt>
              <dd
                className={`mt-0.5 text-sm leading-snug ${
                  f.empty ? "text-slate-400" : "text-slate-800"
                }`}
              >
                {f.value}
              </dd>
            </div>
          ))}
          {obligationTitles.length > 0 ? (
            <div className="sm:col-span-2" data-testid="project-spine-obligation-samples">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Sample obligations
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
                {obligationTitles.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </dl>

        {/* Pulse — one glance at the project heart */}
        <div
          className="flex flex-wrap gap-2"
          data-testid="project-context-pulse"
        >
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            {project.my_role ? labelRole(project.my_role) : "Member"}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            {peopleCount} people
          </span>
          <span
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
            data-testid="project-work-count"
          >
            {myWork.isLoading ? "…" : `${openWork.length} open`}
          </span>
          <span
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
            data-testid="project-blocker-count"
          >
            {myWork.isLoading ? "…" : `${blockers.length} blocked`}
          </span>
          <span
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
            data-testid="project-doc-count"
          >
            {myWork.isLoading ? "…" : `${documents.length} docs`}
          </span>
          <span
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
            data-testid="project-meeting-count"
          >
            {myWork.isLoading ? "…" : `${meetings.length} meetings`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {owner?.display_name
            ? `Owner ${owner.display_name}`
            : "Owner not listed yet"}
          {project.my_role ? ` · you are ${labelRole(project.my_role)}` : ""}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* People — compact */}
        <section data-testid="project-context-people" className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Who</h3>
          {members.isLoading && <Skeleton className="h-12 w-full" />}
          {members.data && members.data.ok && (
            <div data-testid="project-members-panel">
              <MembersList members={members.data.data.members} />
            </div>
          )}
          {members.data && !members.data.ok && (
            <p className="text-sm text-destructive">{members.data.message}</p>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
              Add teammate
            </summary>
            <form onSubmit={submit} className="mt-2 space-y-2">
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
                size="sm"
                disabled={add.isPending}
                data-testid="add-member-submit"
              >
                {add.isPending ? "Adding…" : "Add to project"}
              </Button>
            </form>
          </details>
        </section>

        {/* Open work */}
        <section
          data-testid="project-context-work"
          className="space-y-2 border-t border-border pt-3"
        >
          <h3 className="text-sm font-medium text-foreground">Open work</h3>
          {myWork.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : openWork.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="project-work-empty"
            >
              No work is stamped to this project yet. When Otzar links
              commitments from communications or your AI Teammate, they appear
              here so the mission stays coherent.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="project-work-list">
              {openWork.slice(0, 5).map((entry) => (
                <li key={entry.ledger_entry_id}>
                  <WorkLedgerItem entry={entry} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">
            Personal decisions also surface under{" "}
            <Link to="/app/action-center" className="underline underline-offset-2">
              Needs me
            </Link>
            .
          </p>
        </section>

        {/* Blockers + AI — compact side by side on wide */}
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <section data-testid="project-context-blockers" className="space-y-1.5">
            <h3 className="text-sm font-medium text-foreground">Blockers</h3>
            {blockers.length === 0 ? (
              <p
                className="text-sm text-muted-foreground"
                data-testid="project-blockers-empty"
              >
                Nothing blocked.
              </p>
            ) : (
              <ul className="space-y-1 text-sm" data-testid="project-blockers-list">
                {blockers.slice(0, 4).map((b) => (
                  <li key={b.ledger_entry_id} data-testid="project-blocker-row">
                    <span className="font-medium">{b.title || "Blocked work"}</span>
                    <span className="ml-1 text-xs text-amber-700">
                      {b.blind_spot_reason ?? b.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section data-testid="project-context-twin" className="space-y-1.5">
            <h3 className="text-sm font-medium text-foreground">AI Teammate</h3>
            {twinish.length === 0 ? (
              <p
                className="text-sm text-muted-foreground"
                data-testid="project-twin-empty"
              >
                No AI Teammate work active on this mission right now.
              </p>
            ) : (
              <ul className="space-y-1 text-sm" data-testid="project-twin-list">
                {twinish.slice(0, 4).map((e) => (
                  <li key={e.ledger_entry_id}>
                    <span className="font-medium">{e.title || "Work"}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {e.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Docs + meetings collapsed if empty, compact if present */}
        {(documents.length > 0 || meetings.length > 0) && (
          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            {documents.length > 0 ? (
              <section data-testid="project-context-documents" className="space-y-1.5">
                <h3 className="text-sm font-medium">Documents</h3>
                <ul className="space-y-1 text-sm" data-testid="project-docs-list">
                  {documents.slice(0, 3).map((d) => (
                    <li key={d.ledger_entry_id} data-testid="project-doc-row">
                      {d.twin_work?.web_view_link ? (
                        <a
                          href={d.twin_work.web_view_link}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-600 underline-offset-2 hover:underline"
                          data-testid="project-doc-link"
                        >
                          {d.title || "Document"}
                        </a>
                      ) : (
                        <span className="font-medium">{d.title || "Document"}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section data-testid="project-context-documents" className="hidden" />
            )}
            {meetings.length > 0 ? (
              <section data-testid="project-context-meetings" className="space-y-1.5">
                <h3 className="text-sm font-medium">Meetings</h3>
                <ul className="space-y-1 text-sm" data-testid="project-meetings-list">
                  {meetings.slice(0, 3).map((m) => (
                    <li key={m.ledger_entry_id} data-testid="project-meeting-row">
                      <span className="font-medium">{m.title || "Meeting"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section data-testid="project-context-meetings" className="hidden" />
            )}
          </div>
        )}
        {documents.length === 0 && meetings.length === 0 ? (
          <>
            <section data-testid="project-context-documents" className="hidden" />
            <section data-testid="project-context-meetings" className="hidden" />
            <p
              className="text-[11px] text-muted-foreground"
              data-testid="project-docs-empty"
            >
              Docs and meetings appear when Otzar links them to this mission.
            </p>
            <p className="hidden" data-testid="project-meetings-empty" />
          </>
        ) : null}

        {nextStep && nextStep.kind !== "IDLE_HEALTHY" ? (
          <section
            data-testid="project-context-next"
            className="space-y-1 rounded-xl border border-violet-200/60 bg-violet-50/40 px-3 py-2.5"
          >
            <h3 className="text-sm font-medium text-foreground">Suggested next</h3>
            <p className="text-sm text-slate-700">
              {nextStep.safe_title}
              {nextStep.reason ? ` — ${nextStep.reason}` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">
              From live organization posture — confirm it applies to this mission.
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
