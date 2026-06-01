// FILE: AgentPlayground.tsx
// PURPOSE: Section 5 Wave 10 enterprise decision cockpit per
//          ADR-0077. Consumes the 6 Foundation Agent Playground
//          routes (Wave 4 scenarios CRUD + Wave 5 candidates +
//          Wave 6 outcome comparison + Wave 7 best-path
//          recommendation + Wave 8 governed transition + Wave 9
//          multi-agent simulation). Leads operators through the
//          governed intelligence pipeline:
//
//            scenario → candidates → comparison → recommendation
//                     → simulation → governed transition
//
//          Wave 10 NEVER bypasses Wave 8 / Section 2: there is
//          NO "Execute" button anywhere on this page. Section 2
//          retains all execution authority per ADR-0057. The
//          Governed Transition panel may create a Section 2
//          Action in PROPOSED status -- and the UI visibly
//          states "Action proposed (not executed)" until
//          Section 2 separately reports execution via its own
//          read surface (forward-substrate at this slice).
//
//          ADR-0077 honesty postures enforced inline:
//          - hierarchy honesty: NEVER fabricate named approvers;
//            represent only via Foundation closed-vocab
//            required_reviews / governance_findings /
//            action_transition_readiness.
//          - conversation-context honesty: Foundation does NOT
//            yet expose conversation_context_signals[];
//            UI states "not available in this version".
//          - evidence-posture honesty: render closed-vocab
//            labels verbatim, NEVER extrapolate.
//          - execution-boundary honesty: three-state lifecycle
//            simulation / proposed / executed.
//
//          NEVER displays raw memory / capsules / transcripts /
//          prompts / chain-of-thought / embeddings / vectors /
//          content hashes / storage locations / bridge IDs /
//          secret refs / numeric score / rank / winner /
//          probability / roi / hidden employee scoring /
//          psychological profiling / cross-org data. The
//          forbidden-copy guard test in tests/unit asserts none
//          of the FORBIDDEN_UI_COPY substrings appears in the
//          rendered page.
//
//          Existing /playground Placeholder is preserved
//          unchanged per ADR-0077 §11 Option A (Founder UX
//          decision 2026-05-31). Wave 10 lives at the NEW
//          /agent-playground route.
// CONNECTS TO: src/lib/api.ts (api.playground.*),
//              src/lib/types/foundation.ts (Wave 4-9 type
//              mirrors), src/components/agent-playground/*,
//              src/components/PageHeader.tsx, src/components/ui/*.

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileSearch,
  GitCompare,
  Layers,
  Network,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ActionStatus,
  CompareOutcomesSuccess,
  ConversationContextSignal,
  GenerateCandidatesSuccess,
  PlaygroundScenario,
  ProposeGovernedTransitionSuccess,
  RecommendBestPathSuccess,
  SafeActionDetailView,
  SimulationSuccess,
} from "@/lib/types/foundation";

// WHAT: The 6 ADR-0077 §1 pipeline stages.
// INPUT: Used as both Tabs value and visual order.
// OUTPUT: A readonly tuple.
// WHY: Closed-vocab stage identifiers shared across the cockpit
//      header, sidebar, and tabs.
const STAGES = [
  {
    key: "scenario" as const,
    label: "Scenario",
    icon: Compass,
    description: "Define what the enterprise is considering.",
  },
  {
    key: "candidates" as const,
    label: "Candidate paths",
    icon: Layers,
    description: "Generate the governed candidate paths.",
  },
  {
    key: "comparison" as const,
    label: "Comparison",
    icon: GitCompare,
    description: "Compare outcomes across candidates.",
  },
  {
    key: "recommendation" as const,
    label: "Recommendation",
    icon: Sparkles,
    description: "Recommended path for review.",
  },
  {
    key: "simulation" as const,
    label: "Role-perspective simulation",
    icon: Network,
    description: "How governed roles see this decision.",
  },
  {
    key: "transition" as const,
    label: "Governed transition",
    icon: ShieldAlert,
    description: "Propose a Section 2 Action -- not executed.",
  },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

export function AgentPlaygroundPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [stage, setStage] = useState<StageKey>("scenario");

  const scenariosQuery = useQuery({
    queryKey: ["playground", "scenarios"],
    queryFn: () => api.playground.listScenarios(),
  });

  // Reset stage to scenario when a different scenario is opened so
  // the operator never lands on a stale stage from a prior session.
  useEffect(() => {
    setStage("scenario");
  }, [selectedScenarioId]);

  const scenarios = useMemo<readonly PlaygroundScenario[]>(
    () =>
      scenariosQuery.data?.ok === true
        ? scenariosQuery.data.data.scenarios
        : [],
    [scenariosQuery.data],
  );

  const selectedScenario = useMemo(
    () =>
      scenarios.find((s) => s.scenario_id === selectedScenarioId) ?? null,
    [scenarios, selectedScenarioId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Playground"
        description="Enterprise decision cockpit -- think before you act. Governed, scoped, auditable. Wave 10 never bypasses governed Action runtime."
      />

      <Card>
        <CardContent className="space-y-2 py-4">
          <p className="text-sm text-foreground">
            Agent Playground is where the enterprise thinks before it acts.
            Foundation makes that thinking governed, scoped, auditable, and
            safe. Control Tower makes that intelligence usable, reviewable,
            and trusted by operators.
          </p>
          <p className="text-xs text-muted-foreground">
            Wave 10 v1 advisory only. Nothing here is executed. Any
            transition to a real action is routed through Section 2 in
            PROPOSED status and requires governance review before execution.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ScenarioSidebar
          scenarios={scenarios}
          isLoading={scenariosQuery.isLoading}
          selectedScenarioId={selectedScenarioId}
          onSelect={setSelectedScenarioId}
          onCreated={(id) => {
            setSelectedScenarioId(id);
            void scenariosQuery.refetch();
          }}
          onArchived={() => {
            setSelectedScenarioId(null);
            void scenariosQuery.refetch();
          }}
        />

        {selectedScenario === null ? (
          <Card>
            <CardContent
              className="py-16 text-center text-sm text-muted-foreground"
              data-testid="agent-playground-empty"
            >
              Select or create a scenario to start the governed decision
              pipeline. Nothing is executed at this stage.
            </CardContent>
          </Card>
        ) : (
          <ScenarioWorkspace
            key={selectedScenario.scenario_id}
            scenario={selectedScenario}
            stage={stage}
            onStageChange={setStage}
            onArchived={() => {
              setSelectedScenarioId(null);
              void scenariosQuery.refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Scenario sidebar -- list + create + select.
// ════════════════════════════════════════════════════════════════

interface ScenarioSidebarProps {
  scenarios: readonly PlaygroundScenario[];
  isLoading: boolean;
  selectedScenarioId: string | null;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
  onArchived: () => void;
}

function ScenarioSidebar({
  scenarios,
  isLoading,
  selectedScenarioId,
  onSelect,
  onCreated,
}: ScenarioSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <Card className="self-start">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scenarios</CardTitle>
        <CardDescription>Your governed decision workspaces.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => setCreateOpen(true)}
          data-testid="agent-playground-create-scenario"
        >
          New scenario
        </Button>
        <Separator />
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : scenarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scenarios yet. Create one to begin.
          </p>
        ) : (
          <ul className="space-y-1">
            {scenarios.map((s) => (
              <li key={s.scenario_id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.scenario_id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted",
                    selectedScenarioId === s.scenario_id &&
                      "bg-muted text-foreground",
                  )}
                  data-testid={`agent-playground-scenario-${s.scenario_id}`}
                >
                  <ChevronRight
                    className={cn(
                      "mt-0.5 h-4 w-4 text-muted-foreground",
                      selectedScenarioId === s.scenario_id && "text-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <ScenarioStatusBadge status={s.status} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CreateScenarioDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreateOpen(false);
          onCreated(id);
        }}
      />
    </Card>
  );
}

function ScenarioStatusBadge({
  status,
}: {
  status: PlaygroundScenario["status"];
}) {
  const variants: Record<
    PlaygroundScenario["status"],
    "default" | "secondary" | "outline" | "destructive"
  > = {
    DRAFT: "outline",
    READY: "secondary",
    IN_REVIEW: "default",
    ARCHIVED: "outline",
  };
  return (
    <Badge variant={variants[status]} className="text-[10px]">
      {status === "IN_REVIEW" ? "In review" : status[0] + status.slice(1).toLowerCase()}
    </Badge>
  );
}

function CreateScenarioDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalSummary, setGoalSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const body: { title: string; description?: string; goal_summary?: string } = {
        title: title.trim(),
      };
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 0) body.description = trimmedDescription;
      const trimmedGoal = goalSummary.trim();
      if (trimmedGoal.length > 0) body.goal_summary = trimmedGoal;
      return api.playground.createScenario(body);
    },
    onSuccess: (result) => {
      if (result.ok) {
        setTitle("");
        setDescription("");
        setGoalSummary("");
        setError(null);
        void queryClient.invalidateQueries({
          queryKey: ["playground", "scenarios"],
        });
        onCreated(result.data.scenario.scenario_id);
      } else {
        setError(genericErrorCopy(result.code, result.message));
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New scenario</DialogTitle>
          <DialogDescription>
            Define what the enterprise is considering. Nothing is executed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="scenario-title">Title</Label>
            <Input
              id="scenario-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Onboard new enterprise customer in Q1"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="scenario-goal">Goal summary (optional)</Label>
            <Input
              id="scenario-goal"
              value={goalSummary}
              onChange={(e) => setGoalSummary(e.target.value)}
              placeholder="What does success look like?"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="scenario-description">Description (optional)</Label>
            <Textarea
              id="scenario-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Plain-language context. No raw memory, transcripts, or sensitive data."
            />
          </div>
          {error !== null && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={title.trim().length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
            data-testid="agent-playground-submit-scenario"
          >
            {mutation.isPending ? "Creating..." : "Create scenario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════
// Scenario workspace -- 6 stages.
// ════════════════════════════════════════════════════════════════

interface ScenarioWorkspaceProps {
  scenario: PlaygroundScenario;
  stage: StageKey;
  onStageChange: (stage: StageKey) => void;
  onArchived: () => void;
}

function ScenarioWorkspace({
  scenario,
  stage,
  onStageChange,
  onArchived,
}: ScenarioWorkspaceProps) {
  // Each Wave 5-9 result is cached per scenario via TanStack
  // Query. Mutation triggers refetch the relevant key.
  const candidatesQuery = useQuery({
    queryKey: ["playground", scenario.scenario_id, "candidates"],
    queryFn: () => api.playground.generateCandidates(scenario.scenario_id),
    enabled: false,
  });
  const comparisonQuery = useQuery({
    queryKey: ["playground", scenario.scenario_id, "comparison"],
    queryFn: () => api.playground.compareOutcomes(scenario.scenario_id),
    enabled: false,
  });
  const recommendationQuery = useQuery({
    queryKey: ["playground", scenario.scenario_id, "recommendation"],
    queryFn: () => api.playground.recommendBestPath(scenario.scenario_id),
    enabled: false,
  });
  const simulationQuery = useQuery({
    queryKey: ["playground", scenario.scenario_id, "simulation"],
    queryFn: () =>
      api.playground.runSimulation(scenario.scenario_id, {
        caller_confirmation: true,
      }),
    enabled: false,
  });

  return (
    <div className="space-y-4">
      <ScenarioHeader scenario={scenario} onArchived={onArchived} />

      <Tabs
        value={stage}
        onValueChange={(v) => onStageChange(v as StageKey)}
        data-testid="agent-playground-stage-tabs"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {STAGES.map((s) => (
            <TabsTrigger
              key={s.key}
              value={s.key}
              data-testid={`agent-playground-stage-${s.key}`}
              className="gap-2"
            >
              <s.icon className="h-4 w-4" aria-hidden="true" />
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="scenario" className="pt-4">
          <ScenarioPanel scenario={scenario} />
        </TabsContent>

        <TabsContent value="candidates" className="pt-4">
          <CandidatesPanel
            scenarioId={scenario.scenario_id}
            data={
              candidatesQuery.data?.ok === true
                ? candidatesQuery.data.data
                : null
            }
            isFetching={candidatesQuery.isFetching}
            error={
              candidatesQuery.data?.ok === false
                ? genericErrorCopy(
                    candidatesQuery.data.code,
                    candidatesQuery.data.message,
                  )
                : null
            }
            onRun={() => void candidatesQuery.refetch()}
          />
        </TabsContent>

        <TabsContent value="comparison" className="pt-4">
          <ComparisonPanel
            scenarioId={scenario.scenario_id}
            data={
              comparisonQuery.data?.ok === true
                ? comparisonQuery.data.data
                : null
            }
            isFetching={comparisonQuery.isFetching}
            error={
              comparisonQuery.data?.ok === false
                ? genericErrorCopy(
                    comparisonQuery.data.code,
                    comparisonQuery.data.message,
                  )
                : null
            }
            onRun={() => void comparisonQuery.refetch()}
          />
        </TabsContent>

        <TabsContent value="recommendation" className="pt-4">
          <RecommendationPanel
            scenarioId={scenario.scenario_id}
            data={
              recommendationQuery.data?.ok === true
                ? recommendationQuery.data.data
                : null
            }
            isFetching={recommendationQuery.isFetching}
            error={
              recommendationQuery.data?.ok === false
                ? genericErrorCopy(
                    recommendationQuery.data.code,
                    recommendationQuery.data.message,
                  )
                : null
            }
            onRun={() => void recommendationQuery.refetch()}
          />
        </TabsContent>

        <TabsContent value="simulation" className="pt-4">
          <SimulationPanel
            scenarioId={scenario.scenario_id}
            data={
              simulationQuery.data?.ok === true
                ? simulationQuery.data.data
                : null
            }
            isFetching={simulationQuery.isFetching}
            error={
              simulationQuery.data?.ok === false
                ? genericErrorCopy(
                    simulationQuery.data.code,
                    simulationQuery.data.message,
                  )
                : null
            }
            onRun={() => void simulationQuery.refetch()}
          />
        </TabsContent>

        <TabsContent value="transition" className="pt-4">
          <GovernedTransitionPanel scenarioId={scenario.scenario_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScenarioHeader({
  scenario,
  onArchived,
}: {
  scenario: PlaygroundScenario;
  onArchived: () => void;
}) {
  const queryClient = useQueryClient();
  const archiveMutation = useMutation({
    mutationFn: () => api.playground.archiveScenario(scenario.scenario_id),
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({
          queryKey: ["playground", "scenarios"],
        });
        onArchived();
      }
    },
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{scenario.title}</CardTitle>
            <CardDescription>
              {scenario.goal_summary ?? "No goal summary provided yet."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ScenarioStatusBadge status={scenario.status} />
            <StateChip kind="not-executed" />
            {scenario.status !== "ARCHIVED" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                data-testid="agent-playground-archive-scenario"
              >
                Archive
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {scenario.description !== null && scenario.description.length > 0 && (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {scenario.description}
        </CardContent>
      )}
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// State chips (UI projection labels, not Foundation enums)
// ════════════════════════════════════════════════════════════════

type StateChipKind =
  | "not-executed"
  | "review-required"
  | "approval-required"
  | "compliance-review-required"
  | "legal-review-required"
  | "policy-review-required"
  | "blocked"
  | "action-proposed"
  | "scenario-ready"
  | "candidates-generated"
  | "comparison-ready"
  | "recommendation-ready"
  | "simulation-ready";

function StateChip({ kind }: { kind: StateChipKind }) {
  const map: Record<
    StateChipKind,
    { label: string; tone: "neutral" | "info" | "warn" | "danger" }
  > = {
    "not-executed": { label: "Not executed", tone: "neutral" },
    "review-required": { label: "Review required", tone: "warn" },
    "approval-required": { label: "Approval required", tone: "warn" },
    "compliance-review-required": {
      label: "Compliance review required",
      tone: "warn",
    },
    "legal-review-required": { label: "Legal review required", tone: "warn" },
    "policy-review-required": { label: "Policy review required", tone: "warn" },
    blocked: { label: "Blocked", tone: "danger" },
    "action-proposed": { label: "Action proposed (not executed)", tone: "info" },
    "scenario-ready": { label: "Scenario ready", tone: "info" },
    "candidates-generated": { label: "Candidates generated", tone: "info" },
    "comparison-ready": { label: "Comparison ready", tone: "info" },
    "recommendation-ready": { label: "Recommendation ready", tone: "info" },
    "simulation-ready": { label: "Simulation ready", tone: "info" },
  };
  const tone = map[kind].tone;
  return (
    <Badge
      variant={
        tone === "danger"
          ? "destructive"
          : tone === "warn"
            ? "default"
            : "secondary"
      }
      className="text-[10px]"
    >
      {map[kind].label}
    </Badge>
  );
}

// ════════════════════════════════════════════════════════════════
// Scenario panel (Wave 4)
// ════════════════════════════════════════════════════════════════

function ScenarioPanel({ scenario }: { scenario: PlaygroundScenario }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scenario context</CardTitle>
        <CardDescription>
          What the enterprise is considering. Owner-scoped. Same-org only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DetailRow label="Title" value={scenario.title} />
        <DetailRow label="Status" value={<ScenarioStatusBadge status={scenario.status} />} />
        <DetailRow
          label="Goal"
          value={scenario.goal_summary ?? "Not provided"}
        />
        <DetailRow
          label="Description"
          value={scenario.description ?? "Not provided"}
        />
        <DetailRow
          label="Owner"
          value="Your scenario (owner-scoped)"
        />
        <DetailRow
          label="Same-org"
          value={scenario.org_entity_id !== null ? "Yes" : "Personal scope"}
        />
        <DetailRow
          label="Created"
          value={new Date(scenario.created_at).toLocaleString()}
        />
        <Separator />
        <p className="text-xs text-muted-foreground">
          This is not a transcript and not raw memory. Move to the next
          stage to explore governed candidate paths.
        </p>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Candidates panel (Wave 5)
// ════════════════════════════════════════════════════════════════

function CandidatesPanel({
  data,
  isFetching,
  error,
  onRun,
}: {
  scenarioId: string;
  data: GenerateCandidatesSuccess | null;
  isFetching: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Candidate paths</CardTitle>
          <CardDescription>
            Governed candidate paths for this scenario. Advisory only.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onRun}
          disabled={isFetching}
          data-testid="agent-playground-generate-candidates"
        >
          {isFetching ? "Generating..." : data === null ? "Generate candidates" : "Regenerate"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error !== null && (
          <ErrorBlock message={error} />
        )}
        {data === null && !isFetching && error === null && (
          <p className="text-sm text-muted-foreground">
            Click <strong>Generate candidates</strong> to see the governed
            candidate paths for this scenario.
          </p>
        )}
        {isFetching && (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {data !== null && (
          <ul className="space-y-3">
            {data.candidates.map((c) => (
              <li
                key={c.candidate_key}
                className="rounded-md border border-border p-4"
                data-testid={`candidate-${c.candidate_key}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{c.candidate_title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {c.candidate_type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        Confidence: {c.confidence_label}
                      </Badge>
                      {c.blocked_by_policy && (
                        <StateChip kind="blocked" />
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-foreground">{c.candidate_summary}</p>
                <ClosedVocabGrid
                  cols={[
                    { title: "Assumptions", items: c.assumptions },
                    { title: "Expected benefits", items: c.expected_benefits },
                    { title: "Known risks", items: c.known_risks },
                    {
                      title: "Governance findings",
                      items: c.governance_findings,
                    },
                    {
                      title: "Required approvals",
                      items: c.required_approvals,
                    },
                  ]}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Transition hint: {c.action_runtime_transition_hint}
                  </Badge>
                </div>
                <HonestNote text={c.honest_note} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ClosedVocabGrid({
  cols,
}: {
  cols: { title: string; items: readonly string[] }[];
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cols.map((col) => (
        <div key={col.title} className="space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {col.title}
          </h4>
          {col.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">None.</p>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {col.items.map((it) => (
                <li key={it} className="text-foreground">
                  {it}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function HonestNote({ text }: { text: string }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div
      className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
      role="alert"
    >
      {message}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Comparison panel (Wave 6)
// ════════════════════════════════════════════════════════════════

function ComparisonPanel({
  data,
  isFetching,
  error,
  onRun,
}: {
  scenarioId: string;
  data: CompareOutcomesSuccess | null;
  isFetching: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Outcome comparison</CardTitle>
          <CardDescription>
            Compare candidates across governed outcome dimensions. Not a
            winner selection -- no numeric ranking.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onRun}
          disabled={isFetching}
          data-testid="agent-playground-compare-outcomes"
        >
          {isFetching ? "Comparing..." : data === null ? "Compare outcomes" : "Re-compare"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error !== null && <ErrorBlock message={error} />}
        {data === null && !isFetching && error === null && (
          <p className="text-sm text-muted-foreground">
            Click <strong>Compare outcomes</strong> to see how candidates
            compare across governance, risk, dependency, and review
            dimensions.
          </p>
        )}
        {isFetching && <Skeleton className="h-48 w-full" />}
        {data !== null && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                Mode: {data.comparison_mode}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {data.candidate_count} candidates
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {data.review_required_count} require review
              </Badge>
              <Badge
                variant={
                  data.blocked_candidates_count > 0 ? "destructive" : "outline"
                }
                className="text-[10px]"
              >
                {data.blocked_candidates_count} blocked
              </Badge>
            </div>

            <ul className="space-y-3">
              {data.comparison_matrix.map((m) => (
                <li
                  key={m.candidate_key}
                  className="rounded-md border border-border p-4"
                  data-testid={`comparison-${m.candidate_key}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {m.candidate_title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {m.candidate_type}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          Confidence: {m.confidence_label}
                        </Badge>
                        {m.blocked_by_policy && <StateChip kind="blocked" />}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    {m.comparison_summary}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {m.outcome_dimensions.map((d) => (
                      <div
                        key={d.dimension}
                        className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {d.dimension.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <Badge
                          variant={
                            d.rating === "FAVORABLE"
                              ? "secondary"
                              : d.rating === "UNFAVORABLE"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {d.rating}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <ClosedVocabGrid
                    cols={[
                      { title: "Risk findings", items: m.risk_findings },
                      { title: "Dependency findings", items: m.dependency_findings },
                      { title: "Required reviews", items: m.required_reviews },
                    ]}
                  />
                  <HonestNote text={m.honest_note} />
                </li>
              ))}
            </ul>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tradeoff summary</CardTitle>
                <CardDescription className="text-xs">
                  Closed-vocab candidate sets. Not a leaderboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClosedVocabGrid
                  cols={[
                    {
                      title: "Fewest blocking findings",
                      items: data.tradeoff_summary.fewest_blocking_findings,
                    },
                    {
                      title: "Strongest governance alignment",
                      items: data.tradeoff_summary.strongest_governance_alignment,
                    },
                    {
                      title: "Lowest review burden",
                      items: data.tradeoff_summary.lowest_review_burden,
                    },
                    {
                      title: "Strongest resilience",
                      items: data.tradeoff_summary.strongest_resilience,
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <HonestNote text={data.honest_note} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// Recommendation panel (Wave 7)
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// Conversation context signals panel (ADR-0078 Stage 2).
// Renders the approved-source `conversation_context_signals[]`
// sidecar Foundation PR #157 emits on Wave 7
// RecommendBestPathSuccess (top-level) and Wave 9
// EnterpriseDecisionPosture (scenario-wide; NOT per-branch —
// preserves ADR-0076 §11 budgets).
//
// Rendering discipline:
//  * Closed-vocab badges only — every signal field rendered is
//    a discriminator the Foundation projection service produced.
//  * No raw transcript text, no quotes/excerpts, no chain-of-
//    thought, no Layer 4 drilldown affordance (Stage 1 / Layer 4
//    are forward-substrate; CT can wire that affordance once
//    Foundation Stage 1 read service lands).
//  * Allowed copy per ADR-0077 §4 + Founder copy lock at this
//    slice: "Conversation context signals", "Approved-source
//    signal", "Derived from approved Foundation sources", "No
//    raw transcript shown", "Advisory context only", "Review
//    required", "Not an execution decision", "Not legal/
//    compliance certainty".
//  * Forbidden copy enforced by the page-level test guard
//    (FORBIDDEN_UI_COPY at tests/unit/agent-playground.test.tsx).
//  * Empty array → safe empty-state copy; honest about the
//    Stage 1 / Layer 4 boundary that has not yet shipped.
function ConversationContextSignalsPanel({
  signals,
  policyPurposeLabel,
}: {
  signals: readonly ConversationContextSignal[];
  policyPurposeLabel: "recommendation-review" | "simulation-review";
}) {
  return (
    <Card data-testid={`conversation-context-signals-${policyPurposeLabel}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Conversation context signals
        </CardTitle>
        <CardDescription className="text-xs">
          Derived from approved Foundation sources. Advisory
          context only. No raw transcript shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No approved-source signals for this scenario. Foundation
            surfaces a signal only when an approved source (action
            history, correction signals, hive context, or manual
            scenario input) has scope-bound context for this
            recommendation. Permissioned evidence drilldown is not
            available in this version.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="signals-list">
            {signals.map((s, i) => (
              <li
                key={`${s.signal_source_type}-${s.signal_type}-${i}`}
                className="rounded-md border border-border bg-muted/30 p-3"
                data-testid={`signal-${i}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      Approved-source signal
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Source: {s.signal_source_type
                        .replace(/_/g, " ")
                        .toLowerCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {s.signal_type.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      Confidence: {s.signal_confidence_label
                        .replace(/_/g, " ")
                        .toLowerCase()}
                    </Badge>
                    {s.review_required && (
                      <Badge variant="secondary" className="text-[10px]">
                        Review required
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-foreground">
                  {s.safe_summary}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    Scope: {s.signal_scope.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Binding: {s.scope_binding_type
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Purpose: {s.business_purpose_label
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Evidence: {s.evidence_label
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Retention: {s.retention_class
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Relevance: {s.conversation_relevance_class
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Use: {s.agent_playground_use
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Capture: {s.capture_eligibility
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </Badge>
                  {s.redaction_applied && (
                    <Badge variant="secondary" className="text-[10px]">
                      Redaction applied
                    </Badge>
                  )}
                  {s.personal_content_suppressed && (
                    <Badge variant="secondary" className="text-[10px]">
                      Personal content suppressed
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {s.honest_note}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationPanel({
  data,
  isFetching,
  error,
  onRun,
}: {
  scenarioId: string;
  data: RecommendBestPathSuccess | null;
  isFetching: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Recommended path for review</CardTitle>
          <CardDescription>
            One recommended path plus alternatives considered. Human or
            governance review required before any real-world action.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onRun}
          disabled={isFetching}
          data-testid="agent-playground-recommend"
        >
          {isFetching ? "Recommending..." : data === null ? "Recommend path" : "Re-recommend"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error !== null && <ErrorBlock message={error} />}
        {data === null && !isFetching && error === null && (
          <p className="text-sm text-muted-foreground">
            Click <strong>Recommend path</strong> to surface the recommended
            path for human review.
          </p>
        )}
        {isFetching && <Skeleton className="h-32 w-full" />}
        {data !== null && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    Recommended for review: {data.recommended_candidate_title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {data.recommended_candidate_type}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Mode: {data.recommendation_mode}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Confidence: {data.confidence_label}
                    </Badge>
                    {data.human_decision_required && (
                      <StateChip kind="review-required" />
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-foreground">
                {data.recommendation_summary}
              </p>
              <div className="mt-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Why this path
                </h4>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {data.recommendation_reasons.map((r) => (
                    <li key={r}>
                      <Badge variant="outline" className="text-[10px]">
                        {r.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Readiness: {data.action_transition_readiness}
                </Badge>
                {data.blocked_by_policy && <StateChip kind="blocked" />}
              </div>
            </div>

            <ClosedVocabGrid
              cols={[
                { title: "Required reviews", items: data.required_reviews },
                { title: "Risk findings", items: data.risk_findings },
                { title: "Dependency findings", items: data.dependency_findings },
              ]}
            />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Alternatives considered</CardTitle>
                <CardDescription className="text-xs">
                  Other paths the recommendation engine reviewed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.alternatives_considered.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.alternatives_considered.map((alt) => (
                      <li
                        key={alt.candidate_key}
                        className="rounded border border-border p-3"
                        data-testid={`alternative-${alt.candidate_key}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-sm font-medium">
                              {alt.candidate_title}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {alt.candidate_type}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              Confidence: {alt.confidence_label}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {alt.reason_not_recommended
                              .replace(/_/g, " ")
                              .toLowerCase()}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <ConversationContextSignalsPanel
              signals={data.conversation_context_signals}
              policyPurposeLabel="recommendation-review"
            />
            <HonestNote text={data.honest_note} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// Simulation + Enterprise decision posture panel (Wave 9)
// ════════════════════════════════════════════════════════════════

function SimulationPanel({
  data,
  isFetching,
  error,
  onRun,
}: {
  scenarioId: string;
  data: SimulationSuccess | null;
  isFetching: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">
            Role-perspective simulation
          </CardTitle>
          <CardDescription>
            How the organization would think through this from multiple
            governed perspectives before acting. Not autonomous agent
            debate.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onRun}
          disabled={isFetching}
          data-testid="agent-playground-simulate"
        >
          {isFetching
            ? "Simulating..."
            : data === null
              ? "Run simulation"
              : "Re-run simulation"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error !== null && <ErrorBlock message={error} />}
        {data === null && !isFetching && error === null && (
          <p className="text-sm text-muted-foreground">
            Click <strong>Run simulation</strong> to surface governed role
            perspectives and an enterprise decision posture.
          </p>
        )}
        {isFetching && <Skeleton className="h-48 w-full" />}
        {data !== null && <SimulationContent data={data} />}
      </CardContent>
    </Card>
  );
}

function SimulationContent({ data }: { data: SimulationSuccess }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          Mode: {data.orchestration_mode}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {data.branch_count} branches
        </Badge>
        {data.human_decision_required && <StateChip kind="review-required" />}
        <StateChip kind="not-executed" />
      </div>

      <EnterprisePostureCard data={data} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Where governed perspectives agree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClosedVocabGrid
            cols={[
              {
                title: "Candidates agreed upon",
                items: data.convergence_summary.candidate_keys_agreed_upon,
              },
              {
                title: "Shared governance findings",
                items: data.convergence_summary
                  .governance_findings_all_branches_share,
              },
              {
                title: "Shared required reviews",
                items: data.convergence_summary
                  .required_reviews_all_branches_share,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Where governed perspectives disagree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClosedVocabGrid
            cols={[
              {
                title: "Candidate types diverged",
                items: data.disagreement_summary.candidate_types_diverged,
              },
              {
                title: "Recommendation modes diverged",
                items: data.disagreement_summary.recommendation_modes_diverged,
              },
              {
                title: "Unresolved branches",
                items: data.disagreement_summary.unresolved_branches,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Unresolved questions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-1">
            {data.unresolved_questions.map((q) => (
              <li key={q}>
                <Badge variant="outline" className="text-[10px]">
                  {q.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recommended next review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="text-[10px]">
              {data.recommended_next_review.next_review_label
                .replace(/_/g, " ")
                .toLowerCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {data.recommended_next_review.rationale_summary}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Role-perspective branches</CardTitle>
          <CardDescription className="text-xs">
            Each branch is a Wave 7 sub-invocation projected through a
            closed-vocab role lens. Roles are lenses, not authorities. No
            agent-to-agent debate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.branches.map((b) => (
              <li
                key={b.branch_id}
                className="rounded-md border border-border p-3"
                data-testid={`simulation-branch-${b.branch_id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {b.branch_definition}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {b.agent_role}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Confidence: {b.confidence_label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm">{b.branch_summary}</p>
                <ClosedVocabGrid
                  cols={[
                    {
                      title: "Assumed constraints",
                      items: b.assumed_constraints,
                    },
                    {
                      title: "Expected outcomes",
                      items: b.expected_outcomes,
                    },
                    {
                      title: "Governance conflicts",
                      items: b.governance_conflicts,
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ConversationContextSignalsPanel
        signals={
          data.enterprise_decision_posture.conversation_context_signals
        }
        policyPurposeLabel="simulation-review"
      />

      <HonestNote text={data.honest_note} />
    </div>
  );
}

function EnterprisePostureCard({ data }: { data: SimulationSuccess }) {
  const p = data.enterprise_decision_posture;
  const primary =
    data.branches.find((b) => b.branch_id === p.primary_recommended_branch_id) ??
    null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Enterprise decision posture</CardTitle>
        <CardDescription className="text-xs">
          One primary path for review, transparent alternatives, evidence
          posture, blockers, and the safe next step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Primary path for review
          </h4>
          {primary === null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No primary path identified.
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <Badge variant="outline" className="text-[10px]">
                {primary.branch_definition}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {primary.agent_role}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {primary.branch_recommended_candidate_type}
              </Badge>
            </div>
          )}
          {p.primary_recommendation_reasons.length > 0 && (
            <div className="mt-2">
              <span className="text-[11px] text-muted-foreground">Why:</span>{" "}
              {p.primary_recommendation_reasons.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="ml-1 text-[10px]"
                >
                  {r.replace(/_/g, " ").toLowerCase()}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Viable alternatives
          </h4>
          {p.viable_alternative_branch_ids.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No viable alternatives surfaced.
            </p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-1">
              {p.viable_alternative_branch_ids.map((id) => (
                <li key={id}>
                  <Badge variant="outline" className="text-[10px]">
                    {id}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ClosedVocabGrid
          cols={[
            {
              title: "Evidence posture",
              items: p.evidence_posture,
            },
            {
              title: "Blockers before action",
              items: p.blockers_before_action,
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Safe next step
            </div>
            <div
              className="text-sm font-medium"
              data-testid="agent-playground-safe-next-step"
            >
              {p.safe_next_step.replace(/_/g, " ").toLowerCase()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// Governed Transition panel (Wave 8) -- explicit confirmation only
// ════════════════════════════════════════════════════════════════

function GovernedTransitionPanel({ scenarioId }: { scenarioId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<ProposeGovernedTransitionSuccess | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      // Generate a fresh idempotency_key per submit attempt -- never
      // reuse, never auto-submit.
      const idempotency_key = freshIdempotencyKey();
      return api.playground.proposeGovernedTransition(scenarioId, {
        caller_confirmation: true,
        idempotency_key,
      });
    },
    onSuccess: (r) => {
      if (r.ok) {
        setResult(r.data);
        setError(null);
        setConfirmOpen(false);
      } else {
        setError(genericErrorCopy(r.code, r.message));
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Governed transition</CardTitle>
        <CardDescription>
          Propose a Section 2 Action in PROPOSED status. Section 2 retains
          all execution authority -- nothing here is executed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p>
            This panel does not execute anything. If you proceed, Wave 8 may
            create a Section 2 Action in PROPOSED status. Approval,
            dual-control, policy review, and execution are governed by
            Section 2 per ADR-0057.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              data-testid="agent-playground-acknowledge"
              className="h-4 w-4"
            />
            I confirm this is a governed proposal for review only. Nothing
            is executed.
          </label>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!acknowledged || mutation.isPending}
          onClick={() => setConfirmOpen(true)}
          data-testid="agent-playground-propose-transition"
        >
          Propose governed action
        </Button>

        {error !== null && <ErrorBlock message={error} />}

        {result !== null && <TransitionResultCard result={result} />}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm governed transition</DialogTitle>
            <DialogDescription>
              This will propose a Section 2 Action in PROPOSED status. It
              will NOT execute. Section 2 governs approval and execution.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            By continuing you confirm that this proposal is governed and
            requires review.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="agent-playground-confirm-transition"
            >
              {mutation.isPending ? "Submitting..." : "Confirm and propose"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TransitionResultCard({
  result,
}: {
  result: ProposeGovernedTransitionSuccess;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Transition result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              result.transition_outcome === "ACTION_PROPOSED"
                ? "default"
                : "outline"
            }
            className="text-[10px]"
          >
            {result.transition_outcome}
          </Badge>
          {result.transition_outcome === "ACTION_PROPOSED" && (
            <StateChip kind="action-proposed" />
          )}
          {result.transition_outcome === "NO_ACTION_PROPOSED" && (
            <Badge variant="outline" className="text-[10px]">
              {result.reason_not_proposed ?? "No transition"}
            </Badge>
          )}
          {result.human_decision_required && (
            <StateChip kind="review-required" />
          )}
        </div>
        <DetailRow
          label="Recommended candidate type"
          value={result.recommended_candidate_type}
        />
        <DetailRow
          label="Recommendation summary"
          value={result.recommendation_summary}
        />
        {result.action_id !== undefined && (
          <DetailRow
            label="Section 2 Action"
            value={
              <span className="font-mono text-xs">
                {result.action_id} · status={result.action_status} · type=
                {result.action_type}
              </span>
            }
          />
        )}
        <DetailRow
          label="Playground audit"
          value={
            <span className="font-mono text-xs">
              {result.playground_audit_event_id}
            </span>
          }
        />
        {result.required_reviews.length > 0 && (
          <div>
            <span className="text-muted-foreground">Required reviews:</span>{" "}
            {result.required_reviews.map((r) => (
              <Badge key={r} variant="outline" className="ml-1 text-[10px]">
                {r.replace(/_/g, " ").toLowerCase()}
              </Badge>
            ))}
          </div>
        )}
        {result.action_id !== undefined && (
          <>
            <Separator />
            <ActionLifecyclePanel
              actionId={result.action_id}
              proposedStatus={result.action_status}
            />
          </>
        )}
        <Separator />
        <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <FileSearch className="mr-1 inline h-3 w-3 align-text-bottom" />
          Section 2 retains all execution authority per ADR-0057. Use the
          lifecycle panel above to read the current Section 2 status; Wave
          10 never approves, executes, retries, or cancels an Action.
        </p>
        <HonestNote text={result.honest_note} />
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════
// ActionLifecyclePanel — Section 2 read-surface integration per
// ADR-0057 §9 + §10 + ADR-0077 §8.4 three-state lifecycle honesty.
//
// Renders the current Section 2 Action lifecycle state for an
// `action_id` returned by Wave 8 governed transition. READ-ONLY —
// NEVER approves / executes / cancels / retries / invokes
// connectors. Consumes Foundation's existing
// `GET /api/v1/actions/:id` surface via `api.actions.getAction`.
//
// The panel surfaces an explicit "Refresh action status" button
// (NEVER polls aggressively) and renders the lifecycle status
// derived directly from Foundation's `ActionStatus` closed-vocab
// enum. NO Execute button. NO Approve button. NO Cancel button.
// NO Retry button. Forbidden UI copy guard preserved.
// ════════════════════════════════════════════════════════════════

function ActionLifecyclePanel({
  actionId,
  proposedStatus,
}: {
  actionId: string;
  proposedStatus: string | undefined;
}) {
  const query = useQuery({
    queryKey: ["actions", "detail", actionId],
    queryFn: () => api.actions.getAction(actionId),
    // Lazy: do NOT auto-fire on mount — the operator clicks
    // "Refresh action status" to read Section 2's current view.
    // Prevents aggressive polling per Founder paste discipline.
    enabled: false,
  });

  const lastResult = query.data;
  const detail: SafeActionDetailView | null =
    lastResult !== undefined && lastResult.ok === true
      ? lastResult.data.action
      : null;
  const errorCopy =
    lastResult !== undefined && lastResult.ok === false
      ? genericActionErrorCopy(lastResult.code, lastResult.message)
      : null;

  // The status surfaced depends on whether we've fetched from
  // Section 2 yet. Before fetch, render the Wave 8 PROPOSED state
  // honestly ("Action proposed (not executed)"). After fetch,
  // render the live Section 2 status.
  const displayedStatus: string = detail !== null
    ? detail.status
    : proposedStatus ?? "PROPOSED";

  return (
    <div
      className="space-y-2 rounded-md border border-border p-3"
      data-testid="agent-playground-lifecycle-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Section 2 Action lifecycle (read-only)
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Action: <span className="font-mono">{actionId}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          data-testid="agent-playground-refresh-action-status"
        >
          {query.isFetching ? "Refreshing..." : "Refresh action status"}
        </Button>
      </div>

      <ActionLifecycleStatusLine
        status={displayedStatus}
        verifiedBySection2={detail !== null}
      />

      {detail !== null && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>
            <span>Type:</span>{" "}
            <span className="text-foreground">{detail.action_type}</span>
          </div>
          <div>
            <span>Risk tier:</span>{" "}
            <span className="text-foreground">{detail.risk_tier}</span>
          </div>
          <div>
            <span>Attempts:</span>{" "}
            <span className="text-foreground">{detail.attempt_count}</span>
          </div>
          {detail.decision_reason !== undefined && (
            <div>
              <span>Decision reason:</span>{" "}
              <span className="text-foreground">{detail.decision_reason}</span>
            </div>
          )}
          {detail.escalation_id !== undefined && (
            <div>
              <span>Escalation:</span>{" "}
              <span className="font-mono text-foreground">
                {detail.escalation_id}
              </span>
            </div>
          )}
          {detail.last_result_summary !== null &&
            detail.last_result_summary.length > 0 && (
              <div>
                <span>Last result summary:</span>{" "}
                <span className="text-foreground">
                  {detail.last_result_summary}
                </span>
              </div>
            )}
        </div>
      )}

      {errorCopy !== null && (
        <ErrorBlock message={errorCopy} />
      )}

      <p className="text-[11px] text-muted-foreground">
        This Action detail is a read-only lifecycle view. It does not
        approve, execute, retry, or cancel the Action. Execution authority
        remains with the Section 2 Action Runtime per ADR-0057.
      </p>
    </div>
  );
}

// WHAT: Render the lifecycle status line with closed-vocab copy
//        derived from Section 2's ActionStatus enum.
// INPUT: status string + whether Section 2 verified the status
//        via the read endpoint.
// OUTPUT: A status badge + human-readable closed-vocab summary.
// WHY: Three-state lifecycle honesty per ADR-0077 §8.4:
//      simulation / proposed / executed must be visibly
//      distinguishable. Before fetch, render PROPOSED as "Action
//      proposed (not executed)". After fetch, render the live
//      Section 2 status verbatim with closed-vocab summary copy.
//      NEVER imply execution from PROPOSED alone.
function ActionLifecycleStatusLine({
  status,
  verifiedBySection2,
}: {
  status: string;
  verifiedBySection2: boolean;
}) {
  const summary = actionLifecycleSummary(status, verifiedBySection2);
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="agent-playground-lifecycle-status"
    >
      <Badge variant="outline" className="text-[10px]">
        {status}
      </Badge>
      <span className="text-xs text-foreground">{summary}</span>
    </div>
  );
}

// WHAT: Translate a Section 2 ActionStatus → closed-vocab summary
//        copy per ADR-0077 §8.4 + Founder paste lifecycle
//        guidance.
// INPUT: ActionStatus value (or any string Foundation may return)
//        + whether the read endpoint has been queried.
// OUTPUT: Closed-vocab human-readable copy.
// WHY: Before fetch, PROPOSED renders "Action proposed (not
//      executed)" to preserve Wave 10 v1 framing. After fetch,
//      each Section 2 status maps to its honest lifecycle copy.
//      Closed-vocab only — NEVER "AI decided" / "Final decision"
//      / "Winner" / "Auto-approved" framing.
function actionLifecycleSummary(
  status: string,
  verifiedBySection2: boolean,
): string {
  if (!verifiedBySection2) {
    // Pre-fetch: preserve Wave 10 v1 framing.
    return "Action proposed (not executed). Click 'Refresh action status' to read Section 2's current view.";
  }
  switch (status as ActionStatus) {
    case "PROPOSED":
      return "Action proposed (not executed).";
    case "APPROVED":
      return "Action approved by Section 2; scheduled for execution by the Section 2 Action Runtime.";
    case "SCHEDULED":
      return "Action scheduled by Section 2.";
    case "RUNNING":
      return "Action currently running in the Section 2 Action Runtime.";
    case "SUCCEEDED":
      return "Action completed by Section 2.";
    case "FAILED":
      return "Action failed in Section 2.";
    case "CANCELLED":
      return "Action cancelled in Section 2.";
    case "REJECTED":
      return "Action rejected by Section 2 (governance review denied).";
    case "TIMED_OUT":
      return "Action timed out in Section 2.";
    case "EXPIRED":
      return "Action expired in Section 2 (approval window elapsed).";
    default:
      // Defensive: Foundation may extend the enum in the future.
      // Render the raw closed-vocab value; the forbidden-UI-copy
      // guard prevents anything dangerous from leaking through.
      return `Section 2 status: ${status}.`;
  }
}

// WHAT: Translate Foundation Action read errors → safe UI copy.
// INPUT: Foundation error code + message.
// OUTPUT: Generic enumeration-safe copy.
// WHY: ACTION_NOT_FOUND collapses unknown / cross-org / soft-
//      deleted per ADR-0057 §9 + RULE 0; the UI surfaces that
//      generically. SESSION_* → re-login. Anything else → the
//      Foundation message (already safe per ADR-0057 §10).
function genericActionErrorCopy(code: string, message: string): string {
  switch (code) {
    case "SESSION_INVALID":
    case "SESSION_EXPIRED":
    case "SESSION_REVOKED":
    case "SESSION_INVALIDATED":
      return "Your session has ended. Please sign in again.";
    case "ACTION_NOT_FOUND":
      return "Action not found.";
    case "INVALID_ACTION_ID":
      return "Action identifier is malformed.";
    case "NETWORK_ERROR":
      return "Network unavailable. Check your connection and retry.";
    default:
      return message;
  }
}

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

// WHAT: Translate a Foundation error code/message to user-facing copy
//        per ADR-0077 §9 enumeration-safe discipline.
// INPUT: Foundation code + message.
// OUTPUT: Generic user-facing string.
// WHY: Cross-owner / unknown id all return SCENARIO_NOT_FOUND. The UI
//      renders that generically -- never reveals scope ambiguity.
function genericErrorCopy(code: string, message: string): string {
  switch (code) {
    case "SESSION_INVALID":
    case "SESSION_EXPIRED":
    case "SESSION_REVOKED":
    case "SESSION_INVALIDATED":
      return "Your session has ended. Please sign in again.";
    case "OPERATION_NOT_PERMITTED":
      return "You don't have access to perform this action.";
    case "SCENARIO_NOT_FOUND":
      return "Scenario not found.";
    case "INVALID_REQUEST":
      return "Some inputs are not valid. Adjust and try again.";
    case "IDEMPOTENCY_KEY_COLLISION":
      return "This proposal was already submitted. Please reload and try again.";
    case "INTERNAL_ERROR":
      return "Foundation reported an internal error. Try again in a moment.";
    case "NETWORK_ERROR":
      return "Network unavailable. Check your connection and retry.";
    default:
      return message;
  }
}

// WHAT: Generate a fresh idempotency key per submit attempt.
// INPUT: None.
// OUTPUT: A unique string suitable for Section 2's idempotency check.
// WHY: Wave 8 requires a fresh idempotency_key per submit. Reusing
//      would surface IDEMPOTENCY_KEY_COLLISION on retry. We never
//      reuse; we never auto-submit.
function freshIdempotencyKey(): string {
  // crypto.randomUUID is available in modern browsers + node 19+.
  // Fall back to a timestamp+random string when not available
  // (older test environments).
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `ct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
