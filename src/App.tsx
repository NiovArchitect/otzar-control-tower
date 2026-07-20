// FILE: App.tsx
// PURPOSE: Top-level providers + the route map. BrowserRouter wraps
//          QueryClientProvider + TooltipProvider + Toaster, then the
//          routes. All authenticated routes are rendered through
//          AuthGuard -> Layout -> Outlet so navigation never escapes
//          the auth check.
// CONNECTS TO: every page in src/pages/, src/lib/query.ts, AuthGuard,
//              Layout. Routes are kept aligned with src/lib/nav.ts.

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import { restoreSession } from "@/lib/stores/auth";
import { AuthGuard } from "@/components/AuthGuard";
import { ActivatePage } from "@/pages/Activate";
import { OrgSetupPage } from "@/pages/OrgSetup";
import { ImportPeoplePage } from "@/pages/ImportPeople";
import { DataFlowPage } from "@/pages/DataFlow";
import { GoLivePage } from "@/pages/GoLive";
import { SeedHistoryPage } from "@/pages/SeedHistory";
import { SeedCorpusPage } from "@/pages/SeedCorpus";
import { ContextBoundariesPage } from "@/pages/ContextBoundaries";
import { ForgotPasswordPage } from "@/pages/ForgotPassword";
import { CompanyProfilePage } from "@/pages/CompanyProfile";
import { WorkSchedulePage } from "@/pages/app/WorkSchedule";
import { AccountSecurityPage } from "@/pages/app/AccountSecurity";
import { TwinCalibrationPage } from "@/pages/app/TwinCalibration";
import { WritingStylePage } from "@/pages/app/WritingStyle";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query";

import { EmployeeGuard } from "@/components/employee/EmployeeGuard";
import { EmployeeLayout } from "@/components/employee/EmployeeLayout";
import { Chat } from "@/pages/app/Chat";
import { Observe } from "@/pages/app/Observe";
import { Corrections } from "@/pages/app/Corrections";
import { ActionCenter } from "@/pages/app/ActionCenter";
import { Comms } from "@/pages/app/Comms";
import { ConnectorHealth } from "@/pages/app/ConnectorHealth";
import { AmbientWorkSurface } from "@/pages/app/AmbientWorkSurface";
import { MyMemory } from "@/pages/app/MyMemory";
import { MyOrganization } from "@/pages/app/MyOrganization";
import { MyTwin } from "@/pages/app/MyTwin";
import { AuthorityGrants } from "@/pages/app/AuthorityGrants";
import { Preferences } from "@/pages/app/Preferences";
import { Collaboration } from "@/pages/app/Collaboration";
import { CollaborationWorkspaces } from "@/pages/app/CollaborationWorkspaces";
import { CollaborationWorkspaceDetail } from "@/pages/app/CollaborationWorkspaceDetail";
import { MeetingCaptures } from "@/pages/app/MeetingCaptures";
import { OnboardingReadiness } from "@/pages/app/OnboardingReadiness";
import { VoiceCaptures } from "@/pages/app/VoiceCaptures";
import { WorkProjects } from "@/pages/app/WorkProjects";
import { InboxThread } from "@/pages/app/InboxThread";
import { Voice } from "@/pages/app/Voice";

import { LoginPage } from "@/pages/Login";
import { HomePage } from "@/pages/Home";
import { UsersPage } from "@/pages/Users";
import { AITeammatesPage } from "@/pages/AITeammates";
import { AccessHubPage } from "@/pages/AccessHub";
import { DataKnowledgePage } from "@/pages/Data";
import { SecurityPage } from "@/pages/Security";
import { AnalyticsPage } from "@/pages/Analytics";
import { ConversationsPage } from "@/pages/Conversations";
import { WorkflowsPage } from "@/pages/Workflows";
import { PlaygroundPage } from "@/pages/Playground";
import { AgentPlaygroundPage } from "@/pages/AgentPlayground";
import { PoliciesPage } from "@/pages/Policies";
import { CollaborationPolicy } from "@/pages/CollaborationPolicy";
import { SystemHealthPage } from "@/pages/SystemHealth";
import { SettingsPage } from "@/pages/Settings";
import { OnboardingPage } from "@/pages/Onboarding";
import { BillingPreviewPage } from "@/pages/BillingPreview";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import { OrganizationSeedingPage } from "@/pages/OrganizationSeeding";
import { ToolsConnectionsPage } from "@/pages/ToolsConnections";
import ConnectorRailsAdmin from "@/pages/ConnectorRailsAdmin";
import ReportsPage from "@/pages/Reports";
import VoiceProvidersPage from "@/pages/VoiceProviders";
import RetentionPage from "@/pages/Retention";
import { DocumentationPage } from "@/pages/Documentation";
import { IntelligencePage } from "@/pages/Intelligence";
import { ApprovalsPage } from "@/pages/Approvals";
import { ReviewCenterPage } from "@/pages/ReviewCenter";
import { MarketplaceDiscoveryPage } from "@/pages/MarketplaceDiscovery";
import { CohortGovernancePage } from "@/pages/CohortGovernance";
import { AccessGrantsPage } from "@/pages/AccessGrants";
import { NotFoundPage } from "@/pages/NotFound";
import { VoiceTwinPage } from "@/pages/VoiceTwin";

// [APP-NAV-CONTINUITY] Data router (createBrowserRouter) — same route tree,
// authored as JSX and adapted via createRoutesFromElements, so the entire map
// below is byte-for-byte the prior <Routes> content. The data router is what
// unlocks a STABLE useBlocker (react-router 6.7+), which the unsaved-work guard
// uses to intercept EVERY in-app navigation vector (sidebar, Back button,
// programmatic redirects) with one calm confirmation — not just reload/close.
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<LoginPage />} />
            {/* [P0-ONBOARD] public activation / reset page — outside every
                auth guard (the invitee has no session yet). */}
            <Route path="/activate" element={<ActivatePage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Employee Otzar shell -- EmployeeGuard admits product
                users (can_read_capsules); does NOT require can_admin_org
                and never consults can_admin_niov. Distinct from the
                org-admin Control Tower below. */}
            <Route
              path="/app"
              element={
                <EmployeeGuard>
                  <EmployeeLayout />
                </EmployeeGuard>
              }
            >
              {/* EXPERIENCE WAVE-1 — ambient Today is the only daily home.
                  Legacy routes redirect into Today / Needs me / Talk. */}
              <Route index element={<AmbientWorkSurface />} />
              <Route path="my-day" element={<Navigate to="/app" replace />} />
              <Route path="workspace" element={<Navigate to="/app" replace />} />
              <Route path="chat" element={<Chat />} />
              <Route path="observe" element={<Observe />} />
              <Route path="welcome" element={<Navigate to="/app" replace />} />
              <Route path="corrections" element={<Corrections />} />
              <Route
                path="approvals"
                element={<Navigate to="/app/action-center" replace />}
              />
              <Route path="action-center" element={<ActionCenter />} />
              <Route path="comms" element={<Comms />} />
              <Route path="my-organization" element={<MyOrganization />} />
              <Route path="my-memory" element={<MyMemory />} />
              <Route path="account-security" element={<AccountSecurityPage />} />
              <Route path="work-schedule" element={<WorkSchedulePage />} />
              <Route path="connector-health" element={<ConnectorHealth />} />
              <Route path="my-twin" element={<MyTwin />} />
              <Route path="my-twin/calibration" element={<TwinCalibrationPage />} />
              <Route path="my-twin/calibration/writing-style" element={<WritingStylePage />} />
              <Route path="authority-grants" element={<AuthorityGrants />} />
              <Route path="preferences" element={<Preferences />} />
              <Route path="collaboration" element={<Collaboration />} />
              <Route
                path="collaboration-workspaces"
                element={<CollaborationWorkspaces />}
              />
              <Route
                path="collaboration-workspaces/:workspace_id"
                element={<CollaborationWorkspaceDetail />}
              />
              <Route path="meeting-captures" element={<MeetingCaptures />} />
              <Route path="onboarding-readiness" element={<OnboardingReadiness />} />
              <Route path="voice-captures" element={<VoiceCaptures />} />
              <Route path="work-projects" element={<WorkProjects />} />
              {/* Needs-me consolidates open work + decisions. */}
              <Route
                path="my-work"
                element={<Navigate to="/app/action-center" replace />}
              />
              <Route
                path="team-work"
                element={<Navigate to="/app" replace />}
              />
              <Route path="inbox/:id" element={<InboxThread />} />
              <Route
                path="blind-spots"
                element={<Navigate to="/app/action-center" replace />}
              />
              <Route
                path="operational-health"
                element={<Navigate to="/app" replace />}
              />
              <Route path="voice-ready" element={<Navigate to="/app/voice" replace />} />
              <Route path="voice" element={<Voice />} />
              <Route
                path="conversations"
                element={<Navigate to="/app/comms" replace />}
              />
              {/* Keep MyDay component reachable only if imported elsewhere;
                  route consolidates to ambient Today. */}
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>

            {/* Org-admin Control Tower -- UNCHANGED, still gated on
                can_admin_org by AuthGuard. */}
            <Route
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
              {/* 16 main nav screens */}
              <Route index element={<HomePage />} />
              <Route path="setup" element={<OrgSetupPage />} />
              <Route path="setup/import-people" element={<ImportPeoplePage />} />
              <Route path="setup/data-flow" element={<DataFlowPage />} />
              <Route path="setup/go-live" element={<GoLivePage />} />
              <Route path="setup/seed-history" element={<SeedHistoryPage />} />
              <Route path="setup/seed-corpus" element={<SeedCorpusPage />} />
              <Route path="setup/context-boundaries" element={<ContextBoundariesPage />} />
              <Route path="setup/company-profile" element={<CompanyProfilePage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="ai-teammates" element={<AITeammatesPage />} />
              {/* PROD-MODEL-P3 §9 — ONE Access Control destination (tabs);
                  /access-grants below stays registered for deep links. */}
              <Route path="access-control" element={<AccessHubPage />} />
              <Route path="data-knowledge" element={<DataKnowledgePage />} />
              <Route path="security-audit" element={<SecurityPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="playground" element={<PlaygroundPage />} />
              <Route
                path="agent-playground"
                element={<AgentPlaygroundPage />}
              />
              <Route path="policies" element={<PoliciesPage />} />
              <Route
                path="collaboration-policy"
                element={<CollaborationPolicy />}
              />
              <Route path="system-health" element={<SystemHealthPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="voice-providers" element={<VoiceProvidersPage />} />
              <Route path="retention" element={<RetentionPage />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="billing" element={<BillingPreviewPage />} />
              {/* Tools & Connections: ONE production destination that composes
                  the two connector surfaces as tabs. The underlying routes stay
                  registered below so existing deep links never break. */}
              <Route path="tools-connections" element={<ToolsConnectionsPage />} />
              <Route path="connectors" element={<ConnectorsAdminPage />} />
              <Route path="organization-seeding" element={<OrganizationSeedingPage />} />
              <Route path="connector-rails" element={<ConnectorRailsAdmin />} />
              <Route path="voice" element={<VoiceTwinPage />} />
              <Route path="documentation" element={<DocumentationPage />} />
              <Route path="intelligence" element={<IntelligencePage />} />
              <Route path="review-center" element={<ReviewCenterPage />} />
              <Route path="marketplace" element={<MarketplaceDiscoveryPage />} />
              <Route path="cohorts" element={<CohortGovernancePage />} />
              <Route path="access-grants" element={<AccessGrantsPage />} />
              {/* Side-section: badge-driven Pending Approvals */}
              <Route path="approvals" element={<ApprovalsPage />} />
              {/* Catch-all inside the chrome so the sidebar still works */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </>,
  ),
);

// [SECTION-16] Gate the first render on a one-shot session restore so a
// hard-reload / protected deep link rehydrates the in-memory auth store from the
// HttpOnly cookie (GET /auth/me) BEFORE the guards evaluate — instead of
// flashing /login and losing the user's place. Resilient by construction: a
// bounded timeout guarantees the app renders even if /auth/me stalls or errors
// (then the guards route to /login as normal). It never hangs on the splash, and
// stores nothing client-side — the token lands in memory exactly as after login.
function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        setReady(true);
      }
    };
    // Never block the app on a hung/slow /auth/me — render after 8s regardless.
    const timer = window.setTimeout(finish, 8000);
    void restoreSession().finally(() => {
      window.clearTimeout(timer);
      finish();
    });
    return () => {
      settled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-screen items-center justify-center text-muted-foreground"
      >
        Restoring your session…
      </div>
    );
  }
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
