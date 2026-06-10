// FILE: CollaborationWorkspaces.tsx
// PURPOSE: Phase 1221 — workspace LIST + CREATE surface.
//          Distinct from the existing /app/collaboration page
//          (which surfaces TwinCollaborationRequest); this is
//          the persistent shared workspace list.
//
// PRIVACY:
//   - Counts only (members / decisions / commitments / open
//     actions / completed actions) — never per-row internals.
//   - Title + description are caller-supplied + bounded.
//   - No raw transcripts / payload internals / wallet_id /
//     capsule_id ever rendered.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ListChecks,
  MessagesSquare,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  CollaborationWorkspaceListItem,
  WorkspaceVisibility,
} from "@/lib/types/foundation";

export function CollaborationWorkspaces(): JSX.Element {
  const [workspaces, setWorkspaces] = useState<CollaborationWorkspaceListItem[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createVisibility, setCreateVisibility] =
    useState<WorkspaceVisibility>("INTERNAL_ONLY");
  const [createError, setCreateError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    const r = await api.collaborationWorkspaces.list();
    if (r.ok) {
      setWorkspaces(r.data.workspaces);
      setError(null);
    } else {
      setError(r.code);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    api.collaborationWorkspaces
      .list()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setWorkspaces(r.data.workspaces);
        } else {
          setError(r.code);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("NETWORK_ERROR");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(): Promise<void> {
    setCreateError(null);
    if (createTitle.trim().length === 0) {
      setCreateError("TITLE_REQUIRED");
      return;
    }
    setCreating(true);
    const r = await api.collaborationWorkspaces.create({
      title: createTitle.trim(),
      ...(createDescription.trim().length > 0
        ? { description: createDescription.trim() }
        : {}),
      visibility: createVisibility,
    });
    setCreating(false);
    if (r.ok) {
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateVisibility("INTERNAL_ONLY");
      await refresh();
    } else {
      setCreateError(r.code);
    }
  }

  return (
    <div className="space-y-6" data-testid="collaboration-workspaces-page">
      <PageHeader
        title="Collaboration Workspaces"
        description="A workspace gathers the people, decisions, commitments, and follow-ups for a piece of work. Otzar keeps it governed end-to-end."
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Otzar keeps your private memory private. A workspace only shows
          context you explicitly share.
        </p>
        <Button
          size="sm"
          onClick={() => setCreateOpen((v) => !v)}
          data-testid="collaboration-workspace-create-toggle"
        >
          <Plus className="mr-1 h-3 w-3" aria-hidden /> New workspace
        </Button>
      </div>

      {createOpen ? (
        <Card data-testid="collaboration-workspace-create-form">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create a workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <label className="block text-[10px] font-medium uppercase text-muted-foreground">
                Workspace name
              </label>
              <input
                className="mt-1 w-full rounded border bg-background p-2 text-sm"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. Launch Collaboration"
                data-testid="collaboration-workspace-create-title"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase text-muted-foreground">
                Description (optional)
              </label>
              <textarea
                className="mt-1 w-full rounded border bg-background p-2 text-sm"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={2}
                placeholder="What is this workspace for?"
                data-testid="collaboration-workspace-create-description"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase text-muted-foreground">
                Visibility
              </label>
              <select
                className="mt-1 w-full rounded border bg-background p-2 text-sm"
                value={createVisibility}
                onChange={(e) =>
                  setCreateVisibility(e.target.value as WorkspaceVisibility)
                }
                data-testid="collaboration-workspace-create-visibility"
              >
                <option value="INTERNAL_ONLY">Internal only</option>
                <option value="EXTERNAL_ALLOWED">External allowed</option>
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Internal only = teammates inside your org. External allowed =
                clients, vendors, partners, or other outside collaborators may
                be invited with limited access (requires policy approval).
              </p>
            </div>
            {createError !== null ? (
              <p
                className="text-[10px] text-rose-500"
                data-testid="collaboration-workspace-create-error"
              >
                {createError === "TITLE_REQUIRED"
                  ? "Workspace name is required."
                  : `Couldn't create the workspace (${createError}).`}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating}
                data-testid="collaboration-workspace-create-submit"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  <>Create workspace</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* List */}
      {loading ? (
        <Card data-testid="collaboration-workspaces-loading">
          <CardContent className="py-4 text-xs text-muted-foreground">
            Loading workspaces…
          </CardContent>
        </Card>
      ) : error !== null ? (
        <Card
          className="border-rose-400/40 bg-rose-500/5"
          data-testid="collaboration-workspaces-error"
        >
          <CardContent className="py-3 text-xs">
            <ShieldAlert className="mr-1 inline h-3 w-3" aria-hidden /> Couldn't
            load workspaces ({error}).
          </CardContent>
        </Card>
      ) : (workspaces ?? []).length === 0 ? (
        <Card data-testid="collaboration-workspaces-empty">
          <CardContent className="py-4 text-xs text-muted-foreground">
            No workspaces yet. Create one to gather teammates, decisions, and
            follow-ups for a piece of work.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid="collaboration-workspaces-list">
          {workspaces!.map((w) => (
            <Card key={w.workspace_id} data-testid="collaboration-workspace-row">
              <CardContent className="flex items-start justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/app/collaboration-workspaces/${w.workspace_id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {w.title}
                  </Link>
                  {w.description !== null ? (
                    <p className="text-[10px] text-muted-foreground">
                      {w.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px]">
                      <Users className="mr-0.5 inline h-2.5 w-2.5" aria-hidden />{" "}
                      {w.counts.members} member
                      {w.counts.members === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      <MessagesSquare
                        className="mr-0.5 inline h-2.5 w-2.5"
                        aria-hidden
                      />{" "}
                      {w.counts.decisions} decision
                      {w.counts.decisions === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      <ListChecks
                        className="mr-0.5 inline h-2.5 w-2.5"
                        aria-hidden
                      />{" "}
                      {w.counts.commitments} commitment
                      {w.counts.commitments === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      <CheckCircle2
                        className="mr-0.5 inline h-2.5 w-2.5"
                        aria-hidden
                      />{" "}
                      {w.counts.completed_actions} completed /{" "}
                      {w.counts.open_actions} pending
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {w.visibility === "EXTERNAL_ALLOWED"
                        ? "External allowed"
                        : "Internal only"}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/app/collaboration-workspaces/${w.workspace_id}`}>
                    Open <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p
        className="text-[10px] text-muted-foreground"
        data-testid="collaboration-workspaces-footer"
      >
        Workspaces are governed by Otzar. Internal members see what you
        explicitly share. External collaborators see only what you explicitly
        grant — never your private memory.
      </p>
    </div>
  );
}
