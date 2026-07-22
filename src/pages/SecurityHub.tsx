// FILE: SecurityHub.tsx
// PURPOSE: RC2 admin Security job — audit evidence + advanced health.
//          Primary is Security & Audit; System Health stays advanced.
// CONNECTS TO: Security, SystemHealth, nav.ts.

import { Link, useSearchParams } from "react-router-dom";
import { Activity, ArrowRight, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityPage } from "@/pages/Security";
import { SystemHealthPage } from "@/pages/SystemHealth";

const TABS = ["overview", "audit", "health"] as const;
type SecurityTab = (typeof TABS)[number];

function isTab(v: string | null): v is SecurityTab {
  return v !== null && (TABS as readonly string[]).includes(v);
}

export function SecurityHubPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: SecurityTab = isTab(raw) ? raw : "overview";

  function setTab(next: string): void {
    const t = isTab(next) ? next : "overview";
    setParams(t === "overview" ? {} : { tab: t }, { replace: true });
  }

  return (
    <div className="space-y-6" data-testid="security-hub">
      <PageHeader
        eyebrow="Security"
        title="Evidence of what happened"
        description="Audit history for governed actions, and advanced platform health when operators need it. Safe labels only — never raw secrets or payloads."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList
          className="h-auto flex-wrap gap-1 bg-[#1e1b4b]/04 p-1"
          data-testid="security-tabs"
        >
          <TabsTrigger value="overview" data-testid="security-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="security-tab-audit">
            Audit
          </TabsTrigger>
          <TabsTrigger value="health" data-testid="security-tab-health">
            System health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="security-panel-overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card data-testid="security-area-audit">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1b4b]/06 text-[#1e1b4b]">
                  <Shield className="h-4 w-4" aria-hidden />
                </div>
                <CardTitle className="text-base">Security &amp; Audit</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Immutable audit events — who acted, what outcome, chain
                  references. Self-scope first; no raw payloads.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#1e1b4b] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#2a2758]"
                  onClick={() => setTab("audit")}
                  data-testid="security-open-audit"
                >
                  Open audit
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </button>
                <Link
                  to="/security-audit?tab=audit"
                  className="inline-flex items-center gap-1 rounded-full border border-[#1e1b4b]/12 bg-white px-3.5 py-2 text-xs font-medium text-[#1e1b4b] hover:bg-[#F7F6FC]"
                >
                  Full audit
                </Link>
              </CardContent>
            </Card>

            <Card data-testid="security-area-health">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1b4b]/06 text-[#1e1b4b]">
                  <Activity className="h-4 w-4" aria-hidden />
                </div>
                <CardTitle className="text-base">System health</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Advanced operator view — API, database, runtimes, and voice
                  substrate. Not the everyday admin job.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#1e1b4b] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#2a2758]"
                  onClick={() => setTab("health")}
                  data-testid="security-open-health"
                >
                  Open health
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </button>
                <Link
                  to="/system-health"
                  className="inline-flex items-center gap-1 rounded-full border border-[#1e1b4b]/12 bg-white px-3.5 py-2 text-xs font-medium text-[#1e1b4b] hover:bg-[#F7F6FC]"
                >
                  Full page
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4" data-testid="security-signal">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">What this is not</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Security is not employee monitoring or a dump of secrets. It is
                the proof trail for governed actions and, when needed, platform
                status for operators.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="audit" data-testid="security-panel-audit">
          <SecurityPage />
        </TabsContent>

        <TabsContent value="health" data-testid="security-panel-health">
          <SystemHealthPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
