// FILE: MyTwinSidecarsPanel.tsx
// PURPOSE: Phase 4 PR 2 — calm, premium employee-facing panel that
//          renders the EDX-1 / EDX-4 / EDX-5 / EDX-6 + Phase 1
//          sidecars Foundation now ships on GET /api/v1/otzar/my-twin
//          (CT PR #33 added the type mirrors). Each sidecar is a
//          single tile: count + most-recent timestamp + calm prose.
//          NEVER surfaces raw grant ids / correction substance /
//          per-row content / capability flags. Sidecars are optional
//          on the response — tiles render only when their sidecar
//          arrives.
// CONNECTS TO: src/pages/app/MyTwin.tsx, MyTwinView sidecar types.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  MyTwinView,
  TwinActiveAuthoritySummary,
  TwinActiveGrantsSummary,
  TwinCollaborationInboxSummary,
  TwinMemoryScopeSummary,
  TwinPendingApprovalsSummary,
  TwinPersonalPreferencesSummary,
  TwinProjectContextSummary,
  TwinRecentActionSummary,
  TwinVoiceReadinessState,
} from "@/lib/types/foundation";

interface MyTwinSidecarsPanelProps {
  twin: MyTwinView;
}

export function MyTwinSidecarsPanel({ twin }: MyTwinSidecarsPanelProps) {
  const tiles: Array<{ key: string; node: React.ReactNode } | null> = [
    twin.pending_approvals_summary
      ? {
          key: "pending-approvals",
          node: (
            <PendingApprovalsTile summary={twin.pending_approvals_summary} />
          ),
        }
      : null,
    twin.recent_action_summary
      ? {
          key: "recent-actions",
          node: <RecentActionsTile summary={twin.recent_action_summary} />,
        }
      : null,
    twin.memory_scope_summary
      ? {
          key: "memory-scope",
          node: <MemoryScopeTile summary={twin.memory_scope_summary} />,
        }
      : null,
    twin.active_grants_summary
      ? {
          key: "active-grants",
          node: <ActiveGrantsTile summary={twin.active_grants_summary} />,
        }
      : null,
    twin.active_authority_summary
      ? {
          key: "active-authority",
          node: (
            <ActiveAuthorityTile summary={twin.active_authority_summary} />
          ),
        }
      : null,
    twin.personal_preferences_summary
      ? {
          key: "personal-preferences",
          node: (
            <PersonalPreferencesTile
              summary={twin.personal_preferences_summary}
            />
          ),
        }
      : null,
    twin.collaboration_inbox_summary
      ? {
          key: "collaboration-inbox",
          node: (
            <CollaborationInboxTile
              summary={twin.collaboration_inbox_summary}
            />
          ),
        }
      : null,
    twin.project_context_summary
      ? {
          key: "project-context",
          node: <ProjectContextTile summary={twin.project_context_summary} />,
        }
      : null,
    twin.voice_readiness_state
      ? {
          key: "voice-readiness",
          node: <VoiceReadinessTile state={twin.voice_readiness_state} />,
        }
      : null,
  ];
  const visible = tiles.filter(
    (t): t is { key: string; node: React.ReactNode } => t !== null,
  );
  if (visible.length === 0) return null;
  return (
    <Card data-testid="my-twin-sidecars-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">What your Twin is tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="my-twin-sidecars-grid"
        >
          {visible.map((tile) => (
            <div key={tile.key}>{tile.node}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  primary,
  secondary,
  testId,
}: {
  label: string;
  primary: string;
  secondary?: string | undefined;
  testId: string;
}) {
  return (
    <div
      className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm"
      data-testid={testId}
    >
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-base text-foreground">{primary}</div>
      {secondary && (
        <div className="mt-1 text-xs text-muted-foreground">{secondary}</div>
      )}
    </div>
  );
}

function PendingApprovalsTile({
  summary,
}: {
  summary: TwinPendingApprovalsSummary;
}) {
  return (
    <Tile
      label="Pending approvals"
      primary={`${summary.pending_count} awaiting`}
      secondary={
        summary.most_recent_at
          ? `Most recent ${formatRelativeTime(summary.most_recent_at)}`
          : "No recent requests"
      }
      testId="sidecar-pending-approvals"
    />
  );
}

function RecentActionsTile({
  summary,
}: {
  summary: TwinRecentActionSummary;
}) {
  return (
    <Tile
      label="Recent actions"
      primary={`${summary.recent_action_count} recorded`}
      secondary={
        summary.most_recent_at
          ? `Most recent ${formatRelativeTime(summary.most_recent_at)}`
          : "No recent actions"
      }
      testId="sidecar-recent-actions"
    />
  );
}

function MemoryScopeTile({
  summary,
}: {
  summary: TwinMemoryScopeSummary;
}) {
  return (
    <Tile
      label="Memory scope"
      primary={`${summary.active_scope_count} active`}
      secondary={
        summary.most_recent_at
          ? `Most recent ${formatRelativeTime(summary.most_recent_at)}`
          : undefined
      }
      testId="sidecar-memory-scope"
    />
  );
}

function ActiveGrantsTile({
  summary,
}: {
  summary: TwinActiveGrantsSummary;
}) {
  const total =
    summary.active_consent_grants_count +
    summary.active_team_delegations_count;
  return (
    <Tile
      label="Active consents and delegations"
      primary={`${total} active`}
      secondary={
        summary.soonest_expiry_at
          ? `Soonest expires ${formatRelativeTime(summary.soonest_expiry_at)}`
          : "None expiring"
      }
      testId="sidecar-active-grants"
    />
  );
}

function ActiveAuthorityTile({
  summary,
}: {
  summary: TwinActiveAuthoritySummary;
}) {
  const detail: string[] = [];
  if (summary.expiring_soon_count > 0) {
    detail.push(`${summary.expiring_soon_count} expiring soon`);
  }
  if (summary.indefinite_grant_count > 0) {
    detail.push(`${summary.indefinite_grant_count} indefinite`);
  }
  if (summary.sensitive_case_by_case_count > 0) {
    detail.push(
      `${summary.sensitive_case_by_case_count} case-by-case`,
    );
  }
  return (
    <Tile
      label="Authority you have granted your Twin"
      primary={`${summary.active_grant_count} grants`}
      secondary={detail.length > 0 ? detail.join(" · ") : undefined}
      testId="sidecar-active-authority"
    />
  );
}

function PersonalPreferencesTile({
  summary,
}: {
  summary: TwinPersonalPreferencesSummary;
}) {
  const total =
    summary.active_personal_preferences_count +
    summary.active_tone_preferences_count +
    summary.active_project_preferences_count +
    summary.active_sensitivity_boundaries_count +
    summary.active_approval_preferences_count +
    summary.active_terminology_definitions_count +
    summary.active_ask_before_acting_count;
  return (
    <Tile
      label="Personal preferences your Twin knows"
      primary={`${total} active`}
      secondary={
        summary.last_correction_at
          ? `Last updated ${formatRelativeTime(summary.last_correction_at)}`
          : "No corrections recorded yet"
      }
      testId="sidecar-personal-preferences"
    />
  );
}

function CollaborationInboxTile({
  summary,
}: {
  summary: TwinCollaborationInboxSummary;
}) {
  return (
    <Tile
      label="Collaboration inbox"
      primary={`${summary.pending_request_count} pending`}
      secondary={
        summary.most_recent_request_at
          ? `Most recent ${formatRelativeTime(summary.most_recent_request_at)}`
          : "No recent requests"
      }
      testId="sidecar-collaboration-inbox"
    />
  );
}

function ProjectContextTile({
  summary,
}: {
  summary: TwinProjectContextSummary;
}) {
  return (
    <Tile
      label="Projects you are working on"
      primary={`${summary.active_project_count} active`}
      secondary={
        summary.recent_project_activity_at
          ? `Recent activity ${formatRelativeTime(summary.recent_project_activity_at)}`
          : undefined
      }
      testId="sidecar-project-context"
    />
  );
}

function VoiceReadinessTile({ state }: { state: TwinVoiceReadinessState }) {
  const allLive =
    state.envelope_construction === "LIVE" &&
    state.live_audio_input === "LIVE" &&
    state.live_audio_output === "LIVE";
  const someLive =
    state.envelope_construction === "LIVE" ||
    state.live_audio_input === "LIVE" ||
    state.live_audio_output === "LIVE";
  const primary = allLive
    ? "Voice fully ready"
    : someLive
      ? "Text + speech-ready text"
      : "Voice not configured";
  return (
    <Tile
      label="Voice readiness"
      primary={primary}
      secondary={
        state.live_audio_input === "LIVE"
          ? undefined
          : "Live microphone capture is not enabled at this tier"
      }
      testId="sidecar-voice-readiness"
    />
  );
}
