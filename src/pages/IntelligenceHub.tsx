// FILE: IntelligenceHub.tsx
// PURPOSE: RC2 admin Intelligence job — Reports live under one hub.
//          Placeholder "Intelligence" marketing page removed as primary.
// CONNECTS TO: Reports, nav.ts, capability-preservation.

import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BarChart3, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ReportsPage from "@/pages/Reports";

const TABS = ["overview", "reports"] as const;
type IntelligenceTab = (typeof TABS)[number];

function isTab(v: string | null): v is IntelligenceTab {
  return v !== null && (TABS as readonly string[]).includes(v);
}

export function IntelligenceHubPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: IntelligenceTab = isTab(raw) ? raw : "overview";

  function setTab(next: string): void {
    const t = isTab(next) ? next : "overview";
    setParams(t === "overview" ? {} : { tab: t }, { replace: true });
  }

  return (
    <div className="space-y-6" data-testid="intelligence-hub">
      <PageHeader
        eyebrow="Intelligence"
        title="What is moving in the organization"
        description="Governed reports and readiness signals — exportable where proof exists, honest about what is not ready yet."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList
          className="h-auto flex-wrap gap-1 bg-[#1e1b4b]/04 p-1"
          data-testid="intelligence-tabs"
        >
          <TabsTrigger value="overview" data-testid="intelligence-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="intelligence-tab-reports">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="intelligence-panel-overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card data-testid="intelligence-area-reports">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1b4b]/06 text-[#1e1b4b]">
                  <BarChart3 className="h-4 w-4" aria-hidden />
                </div>
                <CardTitle className="text-base">Reports</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Compliance packages, readiness truth, and activity records —
                  org-scoped and approval-gated when shared.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#1e1b4b] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#2a2758]"
                  onClick={() => setTab("reports")}
                  data-testid="intelligence-open-reports"
                >
                  Open reports
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </button>
                <Link
                  to="/reports"
                  className="inline-flex items-center gap-1 rounded-full border border-[#1e1b4b]/12 bg-white px-3.5 py-2 text-xs font-medium text-[#1e1b4b] hover:bg-[#F7F6FC]"
                >
                  Full page
                </Link>
              </CardContent>
            </Card>

            <Card data-testid="intelligence-area-honest">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1b4b]/06 text-[#1e1b4b]">
                  <FileText className="h-4 w-4" aria-hidden />
                </div>
                <CardTitle className="text-base">Not a scoreboard</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Intelligence is not employee ranking or surveillance. It is
                  what leadership can prove about readiness, compliance, and
                  governed activity — nothing invented.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" data-testid="intelligence-panel-reports">
          <ReportsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
