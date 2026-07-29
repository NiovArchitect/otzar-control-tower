// FILE: Governance.tsx
// PURPOSE: RC2 admin job surface — ONE Governance destination for
//          Access, Policies, and Data retention. Preserves full deep
//          routes; recomposes the human entry (not a capability delete).
// CONNECTS TO: AccessHub, Policies, Retention, nav.ts, activation-path.

import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  KeyRound,
  ScrollText,
  Shield,
  Archive,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AccessHubPage } from "@/pages/AccessHub";
import { PoliciesPage } from "@/pages/Policies";
import RetentionPage from "@/pages/Retention";

const TABS = ["overview", "access", "policies", "retention"] as const;
type GovernanceTab = (typeof TABS)[number];

function isTab(v: string | null): v is GovernanceTab {
  return v !== null && (TABS as readonly string[]).includes(v);
}

const AREAS: Array<{
  tab: GovernanceTab;
  title: string;
  body: string;
  icon: typeof KeyRound;
  deepLink: string;
  deepLabel: string;
}> = [
  {
    tab: "access",
    title: "Access",
    body: "Who can see, use, and share work — permissions, grants, and revocations.",
    icon: KeyRound,
    deepLink: "/access-control",
    deepLabel: "Open Access",
  },
  {
    tab: "policies",
    title: "Policies",
    body: "Autonomy, decision rights, compliance posture, and what Otzar may do without asking.",
    icon: ScrollText,
    deepLink: "/policies",
    deepLabel: "Open Policies",
  },
  {
    tab: "retention",
    title: "Data retention",
    body: "How long records live, what can be revoked, and what stays as proof.",
    icon: Archive,
    deepLink: "/retention",
    deepLabel: "Open retention",
  },
];

export function GovernancePage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: GovernanceTab = isTab(raw) ? raw : "overview";

  function setTab(next: string): void {
    const t = isTab(next) ? next : "overview";
    setParams(t === "overview" ? {} : { tab: t }, { replace: true });
  }

  return (
    <div className="space-y-6" data-testid="governance-page">
      <PageHeader
        eyebrow="Governance"
        title="How Otzar is allowed to work"
        description="What AI may handle, what needs a person, what is prohibited, who may access what, how long information is kept, and what happens when someone leaves."
      />

      {tab === "overview" ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="governance-business-model"
        >
          {[
            {
              t: "What AI may handle automatically",
              b: "Organize communication, update routine work, request authorized clarification, draft internal summaries, and create low-risk proof under policy.",
            },
            {
              t: "What requires a person",
              b: "Final selection decisions, sensitive external messages, access grants, high-impact policy change, financial commitments, irreversible actions.",
            },
            {
              t: "What is not allowed",
              b: "Cross-tenant disclosure, hidden recording, unauthorized external send, silent authority expansion, exporting company data via a personal profile.",
            },
            {
              t: "Who may access what",
              b: "Role, project, and relationship type control visibility. Title never grants authority alone.",
            },
            {
              t: "How information is retained",
              b: "Audit proof is retained; governed memory can be revoked; transcripts follow org policy with legal hold.",
            },
            {
              t: "When someone leaves",
              b: "Access ends, tools disconnect, organization data stays, personal portable capability can be requested separately.",
            },
          ].map((x) => (
            <Card key={x.t}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{x.t}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{x.b}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList
          className="h-auto flex-wrap gap-1 bg-[#1e1b4b]/04 p-1"
          data-testid="governance-tabs"
        >
          <TabsTrigger value="overview" data-testid="governance-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="access" data-testid="governance-tab-access">
            Access
          </TabsTrigger>
          <TabsTrigger value="policies" data-testid="governance-tab-policies">
            Policies
          </TabsTrigger>
          <TabsTrigger value="retention" data-testid="governance-tab-retention">
            Data retention
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" data-testid="governance-panel-overview">
          <div className="grid gap-4 sm:grid-cols-3">
            {AREAS.map((area) => {
              const Icon = area.icon;
              return (
                <Card
                  key={area.tab}
                  className="transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(30,27,75,0.14)]"
                  data-testid={`governance-area-${area.tab}`}
                >
                  <CardHeader className="pb-2">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1b4b]/06 text-[#1e1b4b]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <CardTitle className="text-base">{area.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {area.body}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-[#1e1b4b] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#2a2758]"
                      onClick={() => setTab(area.tab)}
                      data-testid={`governance-open-${area.tab}`}
                    >
                      Open
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </button>
                    <Link
                      to={area.deepLink}
                      className="inline-flex items-center gap-1 rounded-full border border-[#1e1b4b]/12 bg-white px-3.5 py-2 text-xs font-medium text-[#1e1b4b] hover:bg-[#F7F6FC]"
                    >
                      Full page
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-4" data-testid="governance-signal">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-[#1e1b4b]">
                <Shield className="h-4 w-4" aria-hidden />
                <CardTitle className="text-sm">What this is for</CardTitle>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                Governance is the operating envelope: who may act, what Otzar
                may do without asking, and how long records stay. It is not a
                legal guarantee and not a dump of raw rules. Open a section when
                something needs a decision — otherwise leave defaults calm.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="access" data-testid="governance-panel-access">
          <AccessHubPage />
        </TabsContent>

        <TabsContent value="policies" data-testid="governance-panel-policies">
          <PoliciesPage />
        </TabsContent>

        <TabsContent value="retention" data-testid="governance-panel-retention">
          <RetentionPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
