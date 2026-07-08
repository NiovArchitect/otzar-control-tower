// FILE: MyTwinActivityPanel.tsx
// PURPOSE: [GAP-H OPS] The employee's partner-transparency panel: what MY
//          AI Twin recently did — composed ONLY from existing self-scoped
//          endpoints (conversations metadata, my pending follow-up drafts,
//          my actions), so cross-user leakage is structurally impossible.
//          Every row is source-of-truth backed; when the twin provably did
//          nothing, the empty state says so honestly. Ambient means
//          low-noise and explainable — never an invisible black box, and
//          never fake activity.
// CONNECTS TO: api.otzar.conversations.list (OtzarConversation metadata —
//          the ONE provably twin-attributable source),
//          api.workOs.commsPendingFollowUps (drafts Otzar prepared for me),
//          api.actions.list (my submissions awaiting approval),
//          src/pages/app/MyTwin.tsx (host surface).

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { formatRelativeTime } from "@/lib/utils/relative-time";

export function MyTwinActivityPanel(): JSX.Element {
  const conversations = useQuery({
    queryKey: ["otzar", "conversations", { take: 1 }],
    queryFn: () => api.otzar.conversations.list({ take: 1 }),
  });
  const followUps = useQuery({
    queryKey: ["work-os", "comms", "follow-ups"],
    queryFn: () => api.workOs.commsPendingFollowUps(),
  });
  const actions = useQuery({
    queryKey: ["actions", "list", "mine"],
    queryFn: () => api.actions.list(),
  });

  const conv =
    conversations.data?.ok === true ? (conversations.data.data.items[0] ?? null) : null;
  const pending =
    followUps.data?.ok === true ? (followUps.data.data.follow_ups ?? []) : [];
  const actionItems = actions.data?.ok === true ? (actions.data.data.items ?? []) : [];

  const latestDraft = pending[0] ?? null;
  const waitingOnApproval = actionItems.filter(
    (a) => a.status === "PROPOSED" && typeof a.escalation_id === "string",
  ).length;
  // Backend-evidence-gated only: the proof source on the stored governance
  // verdict must BE a prior team decision (learn-loop) for this row to exist.
  const usedPriorChoice = pending.some((f) => {
    const src = f.action.recipient_governance?.evidence?.source;
    return src === "correction_memory" || src === "caller_confirmed";
  });

  const loading = conversations.isLoading || followUps.isLoading || actions.isLoading;
  const hasAnything =
    conv !== null || pending.length > 0 || waitingOnApproval > 0;

  return (
    <Card data-testid="my-twin-activity">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">My AI Teammate</CardTitle>
        <p className="text-xs text-muted-foreground">
          Recent work your AI Teammate helped move.
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !hasAnything ? (
          <p className="text-muted-foreground" data-testid="my-twin-activity-empty">
            Your AI Teammate has no recorded activity yet. When it drafts, routes,
            or submits work for you, it will appear here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            <li data-testid="my-twin-activity-row">
              <span className="text-muted-foreground">Last activity: </span>
              {conv !== null
                ? `Talked with you ${formatRelativeTime(conv.started_at)}.`
                : "No twin activity yet."}
            </li>
            {latestDraft !== null ? (
              <li data-testid="my-twin-activity-row">
                <span className="text-muted-foreground">Recent action: </span>
                Drafted a follow-up for {entityLabel(latestDraft.action.target.display_name)}.
              </li>
            ) : null}
            {pending.length > 0 ? (
              <li data-testid="my-twin-activity-row">
                <span className="text-muted-foreground">Waiting on you: </span>
                {pending.length === 1
                  ? "1 draft ready for your review."
                  : `${pending.length} drafts ready for your review.`}
              </li>
            ) : null}
            {waitingOnApproval > 0 ? (
              <li data-testid="my-twin-activity-row">
                <span className="text-muted-foreground">Waiting on approval: </span>
                {waitingOnApproval === 1
                  ? "1 submission is with your approver."
                  : `${waitingOnApproval} submissions are with your approver.`}
              </li>
            ) : null}
            {usedPriorChoice ? (
              <li data-testid="my-twin-activity-row">
                <span className="text-muted-foreground">Learned: </span>
                Used your previous recipient choice.
              </li>
            ) : null}
            <li data-testid="my-twin-activity-row">
              <span className="text-muted-foreground">Tools: </span>
              Tool requirements not set yet.
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
