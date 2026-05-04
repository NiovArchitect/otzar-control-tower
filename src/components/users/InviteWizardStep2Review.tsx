// FILE: InviteWizardStep2Review.tsx
// PURPOSE: Step 2 of the 3-step Dandelion invite wizard. Triggers
//          POST /org/onboarding/start (Phase 2 analyze) and renders
//          a focused slice of the propagation_order so the admin
//          sees the new member's hierarchy slot before committing.
// CONNECTS TO: InviteWizard (parent), api.org.onboarding.start,
//              shadcn Card.
//
// FOCUSED SLICE (decision #27):
// Show the new entity (highlighted) + their direct manager (if any)
// + their first 5 direct reports (if any). Auto-expand to full when
// the propagation_order has < 6 entries. Otherwise expose a "View
// full propagation order ({total} entities)" link.

import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Phase2Result, PropagationEntry } from "@/lib/types/foundation";

interface InviteWizardStep2ReviewProps {
  newEntityId: string;
  newDisplayName: string;
  onReady: () => void;
  onCancel: () => void;
}

const FOCUS_LIMIT = 6;

export function InviteWizardStep2Review({
  newEntityId,
  newDisplayName,
  onReady,
  onCancel,
}: InviteWizardStep2ReviewProps) {
  const [phase2, setPhase2] = useState<Phase2Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  async function runPhase2(): Promise<void> {
    setLoading(true);
    setError(null);
    const r = await api.org.onboarding.start();
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setPhase2(r.data);
  }

  useEffect(() => {
    void runPhase2();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error !== null || phase2 === null) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">
            Couldn't load propagation analysis
          </CardTitle>
          <CardDescription>
            {error ?? "The Phase 2 analyze step failed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => void runPhase2()}>
            <Loader2 className="mr-2 h-4 w-4" aria-hidden />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const order = phase2.propagation_order;
  const newEntry = order.find((e) => e.entity_id === newEntityId);
  const focusedSlice = computeFocusedSlice(order, newEntityId);
  const showFull = expanded || order.length < FOCUS_LIMIT;
  const visible = showFull ? order : focusedSlice;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Propagation impact</CardTitle>
          <CardDescription>
            {phase2.mode === "INTELLIGENCE"
              ? "This propagation uses intelligence-driven ordering."
              : "Based on your org hierarchy."}{" "}
            {order.length} total {order.length === 1 ? "entity" : "entities"} in
            the propagation order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {visible.map((entry) => (
              <PropagationRow
                key={entry.entity_id}
                entry={entry}
                highlight={entry.entity_id === newEntityId}
              />
            ))}
          </ul>
          {!showFull && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              View full propagation order ({order.length} entities)
            </button>
          )}
          {newEntry === undefined && (
            <p className="mt-3 text-sm text-amber-700">
              Notice: {newDisplayName} did not appear in the propagation
              analysis. They are still pending in your org -- you can complete
              their invite from the next step or from their member detail
              page later.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onReady}>
          Continue to confirmation
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// WHAT: Pick the new entity + their direct manager + first 5 direct
//        reports out of the propagation_order.
// INPUT: The full propagation_order and the new entity's id.
// OUTPUT: A subset of entries to render in the focused slice view.
// WHY: Decision #27 -- avoid overwhelming the admin with the full
//      org propagation when only the local impact matters before
//      commit.
function computeFocusedSlice(
  order: PropagationEntry[],
  newEntityId: string,
): PropagationEntry[] {
  const newIdx = order.findIndex((e) => e.entity_id === newEntityId);
  if (newIdx === -1) {
    // New entity not present -- fall back to first FOCUS_LIMIT.
    return order.slice(0, FOCUS_LIMIT);
  }
  const newEntry = order[newIdx];
  if (newEntry === undefined) return [];

  // Direct manager: the closest preceding entry with a smaller
  // hierarchy_level (Foundation's propagation order is breadth-first
  // by hierarchy, so the immediate predecessor in a lower level is
  // the proxy for "manager").
  let manager: PropagationEntry | null = null;
  for (let i = newIdx - 1; i >= 0; i--) {
    const candidate = order[i];
    if (candidate && candidate.hierarchy_level < newEntry.hierarchy_level) {
      manager = candidate;
      break;
    }
  }

  // First 5 direct reports: subsequent entries with hierarchy_level
  // exactly one greater than newEntry's.
  const reports = order
    .slice(newIdx + 1)
    .filter((e) => e.hierarchy_level === newEntry.hierarchy_level + 1)
    .slice(0, 5);

  const slice: PropagationEntry[] = [];
  if (manager !== null) slice.push(manager);
  slice.push(newEntry);
  slice.push(...reports);
  return slice;
}

function PropagationRow({
  entry,
  highlight,
}: {
  entry: PropagationEntry;
  highlight: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
        highlight
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-background",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="text-xs text-muted-foreground"
          style={{ marginLeft: `${entry.hierarchy_level * 12}px` }}
        >
          L{entry.hierarchy_level}
        </span>
        <span className="font-medium">{entry.display_name}</span>
        {entry.is_admin && (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
            Admin
          </span>
        )}
        {highlight && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            Adding now
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{entry.reason}</span>
    </li>
  );
}
