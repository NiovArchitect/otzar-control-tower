// FILE: Preferences.tsx
// PURPOSE: Phase 4C — employee-facing page for the EDX-5
//          TwinCorrectionMemory substrate (PR Foundation #273/#274/
//          #275). Distinct from the existing /app/corrections
//          (conversation-tied free-form CORRECTION capsule per
//          ADR-0055 Wave 2C). This page is structured personal
//          work-style memory the employee teaches their Twin —
//          preferences, tone, project rules, terminology,
//          sensitivity boundaries, ask-before-acting rules.
//
// COPY: friendly, owner-controlled, non-performance. "Teach your
//       Twin" / "Remember this for me" / "Ask before acting" /
//       "Do not use this context" / "This worked" / "This did not
//       work". No "mistake" / "score" / "performance" / "monitor"
//       framing anywhere.
//
// CONNECTS TO: api.otzar.correctionMemory.*

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
  CreateCorrectionRequest,
  TwinCorrectionSafeView,
  TwinCorrectionScopeType,
  TwinCorrectionType,
} from "@/lib/types/foundation";

const CORRECTION_TYPES: ReadonlyArray<TwinCorrectionType> = [
  "MEANING_CLARIFICATION",
  "TERMINOLOGY_DEFINITION",
  "PREFERENCE",
  "TONE_PREFERENCE",
  "PROJECT_PREFERENCE",
  "CLIENT_CONTEXT",
  "TEAM_BEST_PRACTICE_CANDIDATE",
  "ORG_BEST_PRACTICE_CANDIDATE",
  "FAILED_PATTERN",
  "SUCCESSFUL_PATTERN",
  "SENSITIVITY_BOUNDARY",
  "APPROVAL_PREFERENCE",
  "DO_NOT_USE_CONTEXT",
  "ASK_BEFORE_ACTING",
];

const SCOPE_TYPES: ReadonlyArray<TwinCorrectionScopeType> = [
  "PERSONAL",
  "CONVERSATION",
  "PROJECT",
  "TEAM",
  "ROLE",
  "ORG",
];

function labelCorrectionType(value: TwinCorrectionType): string {
  switch (value) {
    case "MEANING_CLARIFICATION":
      return "Clarify what I meant";
    case "TERMINOLOGY_DEFINITION":
      return "Define a term";
    case "PREFERENCE":
      return "A preference";
    case "TONE_PREFERENCE":
      return "Tone preference";
    case "PROJECT_PREFERENCE":
      return "Project preference";
    case "CLIENT_CONTEXT":
      return "Client context";
    case "TEAM_BEST_PRACTICE_CANDIDATE":
      return "Team best-practice candidate";
    case "ORG_BEST_PRACTICE_CANDIDATE":
      return "Org best-practice candidate";
    case "FAILED_PATTERN":
      return "This did not work";
    case "SUCCESSFUL_PATTERN":
      return "This worked";
    case "SENSITIVITY_BOUNDARY":
      return "Sensitivity boundary";
    case "APPROVAL_PREFERENCE":
      return "Approval preference";
    case "DO_NOT_USE_CONTEXT":
      return "Do not use this context";
    case "ASK_BEFORE_ACTING":
      return "Ask before acting";
  }
}

function labelScope(value: TwinCorrectionScopeType): string {
  switch (value) {
    case "PERSONAL":
      return "Just for me";
    case "CONVERSATION":
      return "This conversation";
    case "PROJECT":
      return "A project";
    case "TEAM":
      return "My team";
    case "ROLE":
      return "My role";
    case "ORG":
      return "Org-wide candidate";
  }
}

export function Preferences() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["otzar", "correction-memory", "active"],
    queryFn: () => api.otzar.correctionMemory.list({ state: "ACTIVE" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teach your Twin"
        description="Help your AI Twin understand how you work. Personal preferences, tone, project context, sensitivity boundaries, and ask-before-acting rules. Personal items stay personal; team/org candidates are candidates only."
      />

      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How this works</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Personal items stay personal unless you share them.</li>
          <li>Team / org candidates are candidates only — they do not auto-promote.</li>
          <li>This is not a performance record.</li>
          <li>You can revoke any item later.</li>
        </ul>
      </div>

      <CreatePreferenceForm
        onCreated={() => queryClient.invalidateQueries({
          queryKey: ["otzar", "correction-memory", "active"],
        })}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">What your Twin knows</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading && <Skeleton className="h-24 w-full" />}
          {list.data && list.data.ok && (
            <PreferenceList corrections={list.data.data.corrections} />
          )}
          {list.data && !list.data.ok && (
            <p className="text-sm text-destructive">
              Couldn't load preferences. {list.data.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreatePreferenceForm({ onCreated }: { onCreated: () => void }) {
  const [scopeType, setScopeType] =
    useState<TwinCorrectionScopeType>("PERSONAL");
  const [correctionType, setCorrectionType] =
    useState<TwinCorrectionType>("PREFERENCE");
  const [safeSummary, setSafeSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (body: CreateCorrectionRequest) =>
      api.otzar.correctionMemory.create(body),
    onSuccess: (result) => {
      if (result.ok) {
        setSafeSummary("");
        setError(null);
        onCreated();
      } else {
        setError(result.message);
      }
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (safeSummary.trim().length === 0) {
      setError("A short summary is required.");
      return;
    }
    create.mutate({
      scope_type: scopeType,
      correction_type: correctionType,
      safe_summary: safeSummary.trim(),
    });
  }

  return (
    <Card data-testid="create-preference-form">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Remember this for me</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Summary" id="pref-summary">
            <textarea
              id="pref-summary"
              data-testid="pref-summary"
              value={safeSummary}
              onChange={(e) => setSafeSummary(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Use last name only when summarizing customer feedback."
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Kind of teaching" id="pref-type">
              <select
                id="pref-type"
                data-testid="pref-type"
                value={correctionType}
                onChange={(e) =>
                  setCorrectionType(e.target.value as TwinCorrectionType)
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {CORRECTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelCorrectionType(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scope" id="pref-scope">
              <select
                id="pref-scope"
                data-testid="pref-scope"
                value={scopeType}
                onChange={(e) =>
                  setScopeType(e.target.value as TwinCorrectionScopeType)
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {SCOPE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {labelScope(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="pref-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={create.isPending}
            data-testid="pref-submit"
          >
            {create.isPending ? "Teaching…" : "Teach my Twin"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function PreferenceList({
  corrections,
}: {
  corrections: TwinCorrectionSafeView[];
}) {
  if (corrections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="prefs-empty">
        Nothing taught yet. Add your first preference above.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-testid="prefs-list">
      {corrections.map((c) => (
        <PreferenceRow key={c.correction_id} correction={c} />
      ))}
    </ul>
  );
}

function PreferenceRow({
  correction,
}: {
  correction: TwinCorrectionSafeView;
}) {
  const queryClient = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => api.otzar.correctionMemory.revoke(correction.correction_id),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["otzar", "correction-memory", "active"],
      }),
  });
  return (
    <li
      className="rounded-md border border-border bg-card px-4 py-3"
      data-testid={`pref-row-${correction.correction_id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{labelCorrectionType(correction.correction_type)}</Badge>
        <Badge variant="outline">{labelScope(correction.scope_type)}</Badge>
      </div>
      <p className="mt-2 text-sm text-foreground">{correction.safe_summary}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Added {formatRelativeTime(correction.created_at)}
      </p>
      {correction.revocable && (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate()}
            data-testid={`pref-revoke-${correction.correction_id}`}
          >
            {revoke.isPending ? "Removing…" : "Remove"}
          </Button>
        </div>
      )}
    </li>
  );
}
