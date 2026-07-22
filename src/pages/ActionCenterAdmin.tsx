// FILE: ActionCenterAdmin.tsx
// PURPOSE: RC2 admin Action Center — ONE exception queue for dual-control
//          approvals + high-sensitivity reviews. Recomposes two deep
//          surfaces without deleting capability.
// CONNECTS TO: Approvals, ReviewCenter, usePendingApprovals, useReviewableCount.

import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, ClipboardCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalsPage } from "@/pages/Approvals";
import { ReviewCenterPage } from "@/pages/ReviewCenter";
import { usePendingApprovals } from "@/hooks/use-pending-approvals";
import { useReviewableCount } from "@/hooks/use-reviewable-count";

const TABS = ["overview", "approvals", "reviews"] as const;
type ActionTab = (typeof TABS)[number];

function isTab(v: string | null): v is ActionTab {
  return v !== null && (TABS as readonly string[]).includes(v);
}

function CountBadge({ n }: { n: number | null | undefined }): JSX.Element | null {
  if (typeof n !== "number" || n <= 0) return null;
  return (
    <Badge variant="warning" className="text-[10px]">
      {n}
    </Badge>
  );
}

export function ActionCenterAdminPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: ActionTab = isTab(raw) ? raw : "overview";
  const { data: pendingApprovals } = usePendingApprovals();
  const { data: reviewCount } = useReviewableCount();

  const pendingN = typeof pendingApprovals === "number" ? pendingApprovals : 0;
  const reviewN = typeof reviewCount === "number" ? reviewCount : 0;
  const totalAttention = pendingN + reviewN;

  function setTab(next: string): void {
    const t = isTab(next) ? next : "overview";
    setParams(t === "overview" ? {} : { tab: t }, { replace: true });
  }

  return (
    <div className="space-y-6" data-testid="action-center-admin">
      <PageHeader
        eyebrow="Action Center"
        title="What needs your attention"
        description="Pending dual-control approvals and high-sensitivity reviews in one queue. Nothing here is decoration — each item waits on a human decision."
      />

      {totalAttention > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border border-[#F77737]/25 bg-[#F77737]/08 px-4 py-3 text-sm text-[#1e1b4b]"
          data-testid="action-center-attention-banner"
          role="status"
        >
          <AlertTriangle className="h-4 w-4 text-[#F77737]" aria-hidden />
          <span className="font-medium">
            {totalAttention} item{totalAttention === 1 ? "" : "s"} waiting
          </span>
          <span className="text-[#5c5a78]">
            {pendingN > 0 ? `${pendingN} approval${pendingN === 1 ? "" : "s"}` : null}
            {pendingN > 0 && reviewN > 0 ? " · " : null}
            {reviewN > 0 ? `${reviewN} sensitive review${reviewN === 1 ? "" : "s"}` : null}
          </span>
        </div>
      ) : (
        <div
          className="rounded-xl border border-[#1e1b4b]/08 bg-white px-4 py-3 text-sm text-[#5c5a78]"
          data-testid="action-center-calm-banner"
          role="status"
        >
          Queue is calm — nothing needs a decision right now.
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList
          className="h-auto flex-wrap gap-1 bg-[#1e1b4b]/04 p-1"
          data-testid="action-center-tabs"
        >
          <TabsTrigger value="overview" data-testid="action-center-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="approvals" data-testid="action-center-tab-approvals">
            Approvals
            <CountBadge n={pendingN} />
          </TabsTrigger>
          <TabsTrigger value="reviews" data-testid="action-center-tab-reviews">
            Sensitive reviews
            <CountBadge n={reviewN} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="action-center-panel-overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card data-testid="action-center-area-approvals">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1b4b]/06 text-[#1e1b4b]">
                  <ClipboardCheck className="h-4 w-4" aria-hidden />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Dual-control approvals</CardTitle>
                  <CountBadge n={pendingN} />
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  Risky or governed actions waiting for a second human. The
                  two-person rule is enforced by Foundation — you cannot
                  approve your own request.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#1e1b4b] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#2a2758]"
                  onClick={() => setTab("approvals")}
                  data-testid="action-center-open-approvals"
                >
                  Open queue
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </button>
                <Link
                  to="/approvals?tab=approvals"
                  className="inline-flex items-center gap-1 rounded-full border border-[#1e1b4b]/12 bg-white px-3.5 py-2 text-xs font-medium text-[#1e1b4b] hover:bg-[#F7F6FC]"
                >
                  Full approvals
                </Link>
              </CardContent>
            </Card>

            <Card data-testid="action-center-area-reviews">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1b4b]/06 text-[#1e1b4b]">
                  <ShieldAlert className="h-4 w-4" aria-hidden />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Sensitive reviews</CardTitle>
                  <CountBadge n={reviewN} />
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  High-sensitivity data access decisions — safe labels only,
                  never raw content. Approve, deny, or revoke with an audit
                  trail.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#1e1b4b] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#2a2758]"
                  onClick={() => setTab("reviews")}
                  data-testid="action-center-open-reviews"
                >
                  Open reviews
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </button>
                <Link
                  to="/review-center"
                  className="inline-flex items-center gap-1 rounded-full border border-[#1e1b4b]/12 bg-white px-3.5 py-2 text-xs font-medium text-[#1e1b4b] hover:bg-[#F7F6FC]"
                >
                  Full Review Center
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4" data-testid="action-center-signal">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">What belongs here</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Action Center is only for decisions that block progress or
                raise risk. Setup, connectors, and governance defaults live
                elsewhere. If the queue is empty, leave it empty — that is the
                product working.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" data-testid="action-center-panel-approvals">
          <ApprovalsPage />
        </TabsContent>

        <TabsContent value="reviews" data-testid="action-center-panel-reviews">
          <ReviewCenterPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
