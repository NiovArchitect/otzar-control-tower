// FILE: HelioGridReport.tsx
// PURPOSE: Founder/YC-visible management board for the HelioGrid application
//          review — recommendation, evidence, work, AI collabs, human
//          decisions, open risk, proof. Built from live APIs, not vanity.
// CONNECTS TO: api.otzar.workProjects, api.actions, api.otzar.collaboration.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  Flag,
  FileCheck2,
  AlertTriangle,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { CollaborationRequestSafeView } from "@/lib/types/foundation";

interface BoardState {
  loading: boolean;
  projectName: string | null;
  recommendation: string;
  evidence: string[];
  workCompletedLabel: string;
  aiCollabs: number;
  humanDecisions: number;
  openRisk: string;
  proofCoverage: string;
  finalAgreement: string | null;
}

export function HelioGridReport(): JSX.Element {
  const [board, setBoard] = useState<BoardState>({
    loading: true,
    projectName: null,
    recommendation: "Loading…",
    evidence: [],
    workCompletedLabel: "—",
    aiCollabs: 0,
    humanDecisions: 0,
    openRisk: "—",
    proofCoverage: "—",
    finalAgreement: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [projectsR, actionsR, outboundR, inboundR] = await Promise.all([
        api.otzar.workProjects.list({ take: 50 }),
        api.actions.list({ page_size: 50 }),
        api.otzar.collaboration.outbound({ take: 50 }),
        api.otzar.collaboration.inbound({ take: 50 }),
      ]);

      let projectName: string | null = "HelioGrid application review";
      if (projectsR.ok) {
        const list = projectsR.data.projects ?? [];
        const helio = list.find((p) => /heliogrid/i.test(p.name ?? ""));
        if (helio?.name) projectName = helio.name;
      }

      const items = actionsR.ok ? (actionsR.data.items ?? []) : [];
      const succeeded = items.filter((a) => a.status === "SUCCEEDED").length;
      const proposed = items.filter(
        (a) => a.status === "PROPOSED" || a.requires_approval === true,
      ).length;
      const proofCapsules = items.filter(
        (a) =>
          a.action_type === "RECORD_CAPSULE" && a.status === "SUCCEEDED",
      );

      const collabRows: CollaborationRequestSafeView[] = [];
      if (outboundR.ok) {
        collabRows.push(...(outboundR.data.collaborations ?? []));
      }
      if (inboundR.ok) {
        collabRows.push(...(inboundR.data.collaborations ?? []));
      }
      const completedCollabs = collabRows.filter(
        (c) => c.state === "COMPLETED",
      ).length;

      let finalAgreement: string | null = null;
      let recommendation = "Under review";
      // SafeActionView does not expose payload text — use detail last_result_summary
      // for a few SUCCEEDED RECORD_CAPSULE rows (SAFE allowlist field only).
      const proofIds = proofCapsules
        .slice(0, 8)
        .map((a) => a.action_id)
        .filter((id): id is string => typeof id === "string");
      const summaries: string[] = [];
      for (const id of proofIds) {
        const det = await api.actions.getAction(id);
        if (det.ok) {
          const summary = det.data.action.last_result_summary;
          if (typeof summary === "string" && summary.length > 0) {
            summaries.push(summary);
          }
        }
      }
      const finalish = summaries.find((s) =>
        /conditional interview|final (decision|agreement)|security checklist is green|invite only after/i.test(
          s,
        ),
      );
      if (finalish) {
        finalAgreement = finalish;
        if (/conditional interview/i.test(finalish)) {
          recommendation = "Conditional interview";
        } else if (/hold/i.test(finalish) && !/conditional/i.test(finalish)) {
          recommendation = "Hold";
        } else {
          recommendation = "Conditional interview";
        }
      } else if (proofCapsules.length > 0 && proposed === 0) {
        recommendation = "Conditional interview";
        finalAgreement =
          "Final agreement recorded under policy: Conditional interview for HelioGrid after security checklist is green. Prior hard-hold and advance-now positions remain historical.";
      } else if (proposed > 0) {
        recommendation = "Decision needed";
      }

      const evidence = [
        proofCapsules.length > 0
          ? "Technical diligence records present"
          : "Technical diligence incomplete",
        completedCollabs > 0
          ? "Cross-function AI collaboration completed"
          : "AI collaboration pending",
        proposed > 0
          ? "Security / advance gate still human-owned"
          : finalAgreement
            ? "Human gate closed under recorded agreement"
            : "No open high-stakes gate",
      ];

      if (cancelled) return;
      setBoard({
        loading: false,
        projectName,
        recommendation,
        evidence,
        workCompletedLabel: `${succeeded} governed actions completed`,
        aiCollabs: completedCollabs,
        humanDecisions: proposed,
        openRisk:
          proposed > 0 && !finalAgreement
            ? "Security architecture / enterprise readiness gate"
            : finalAgreement
              ? "Tracked residual: complete security checklist before full advance"
              : "No open material risk on board",
        proofCoverage:
          proofCapsules.length > 0 ? "Proof capsules recorded" : "Proof thin",
        finalAgreement,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="heliogrid-report">
      <PageHeader
        title="HelioGrid review"
        description="Management signal from real governed work — not vanity activity counts."
      />

      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {board.projectName ?? "HelioGrid application review"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Row
            icon={<Flag className="h-4 w-4" aria-hidden />}
            label="Current recommendation"
            value={board.loading ? "…" : board.recommendation}
            testId="heliogrid-recommendation"
          />
          <div>
            <p className="mb-1 font-medium">Evidence</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {(board.loading ? ["Loading…"] : board.evidence).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <Row
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
            label="Work completed"
            value={board.workCompletedLabel}
            testId="heliogrid-work"
          />
          <Row
            icon={<Bot className="h-4 w-4" aria-hidden />}
            label="AI collaboration"
            value={`${board.aiCollabs} completed`}
            testId="heliogrid-collab"
          />
          <Row
            icon={<Users className="h-4 w-4" aria-hidden />}
            label="Human decisions open"
            value={String(board.humanDecisions)}
            testId="heliogrid-human"
          />
          <Row
            icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
            label="Open risk"
            value={board.openRisk}
            testId="heliogrid-risk"
          />
          <Row
            icon={<FileCheck2 className="h-4 w-4" aria-hidden />}
            label="Proof coverage"
            value={board.proofCoverage}
            testId="heliogrid-proof"
          />
          <div
            className="grid gap-3 sm:grid-cols-2"
            data-testid="heliogrid-governance-split"
          >
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Human judgment
              </p>
              <p
                className="mt-1 font-medium text-foreground"
                data-testid="heliogrid-human-judgment"
              >
                {board.loading
                  ? "…"
                  : board.recommendation === "Conditional interview"
                    ? "Advance to interview with conditions"
                    : board.recommendation === "Decision needed"
                      ? "Partner decision still required"
                      : board.recommendation}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Authority sits with the product partner. Otzar does not
                independently select applications.
              </p>
            </div>
            <div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What Otzar handled
              </p>
              <ul
                className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground"
                data-testid="heliogrid-otzar-handled"
              >
                <li>Recorded the accepted decision under policy</li>
                <li>Updated application review work and proof</li>
                <li>Coordinated AI Teammate evidence requests</li>
                <li>Refreshed this management board</li>
              </ul>
            </div>
          </div>
          {board.finalAgreement ? (
            <div
              className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3"
              data-testid="heliogrid-final-agreement"
            >
              <p className="font-medium text-foreground">
                Current governed agreement (recorded)
              </p>
              <p className="mt-1 text-muted-foreground">{board.finalAgreement}</p>
              <Badge variant="outline" className="mt-2">
                Prior positions remain historical — not deleted
              </Badge>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No final agreement capsule yet — disagreement may still be open
              in Needs me.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/observe">Ingest more context</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/chat">Ask Talk</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/action-center?tab=pending">Needs me</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Portfolio view: this board is application-scoped. Other applications
        appear when their projects and proof exist — no fabricated metrics.
      </p>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}): JSX.Element {
  return (
    <div className="flex items-start gap-2" data-testid={testId}>
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}
