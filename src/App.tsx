// FILE: App.tsx
// PURPOSE: Top-level providers + the route map. BrowserRouter wraps
//          QueryClientProvider + TooltipProvider + Toaster, then the
//          routes. All authenticated routes are rendered through
//          AuthGuard -> Layout -> Outlet so navigation never escapes
//          the auth check.
// CONNECTS TO: every page in src/pages/, src/lib/query.ts, AuthGuard,
//              Layout. Routes are kept aligned with src/lib/nav.ts.

import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { ActivatePage } from "@/pages/Activate";
import { OrgSetupPage } from "@/pages/OrgSetup";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query";

import { EmployeeGuard } from "@/components/employee/EmployeeGuard";
import { EmployeeLayout } from "@/components/employee/EmployeeLayout";
import { EmployeeHome } from "@/pages/app/EmployeeHome";
import { Chat } from "@/pages/app/Chat";
import { Observe } from "@/pages/app/Observe";
import { Welcome } from "@/pages/app/Welcome";
import { Corrections } from "@/pages/app/Corrections";
import { Approvals } from "@/pages/app/Approvals";
import { ActionCenter } from "@/pages/app/ActionCenter";
import { Comms } from "@/pages/app/Comms";
import { ConnectorHealth } from "@/pages/app/ConnectorHealth";
import { MyDay } from "@/pages/app/MyDay";
import { AmbientWorkSurface } from "@/pages/app/AmbientWorkSurface";
import { MyMemory } from "@/pages/app/MyMemory";
import { MyOrganization } from "@/pages/app/MyOrganization";
import { MyTwin } from "@/pages/app/MyTwin";
import { Conversations } from "@/pages/app/Conversations";
import { AuthorityGrants } from "@/pages/app/AuthorityGrants";
import { Preferences } from "@/pages/app/Preferences";
import { Collaboration } from "@/pages/app/Collaboration";
import { CollaborationWorkspaces } from "@/pages/app/CollaborationWorkspaces";
import { CollaborationWorkspaceDetail } from "@/pages/app/CollaborationWorkspaceDetail";
import { MeetingCaptures } from "@/pages/app/MeetingCaptures";
import { OnboardingReadiness } from "@/pages/app/OnboardingReadiness";
import { VoiceCaptures } from "@/pages/app/VoiceCaptures";
import { WorkProjects } from "@/pages/app/WorkProjects";
import { MyWork } from "@/pages/app/MyWork";
import { InboxThread } from "@/pages/app/InboxThread";
import { TeamWork } from "@/pages/app/TeamWork";
import { BlindSpots } from "@/pages/app/BlindSpots";
import { OperationalHealth } from "@/pages/app/OperationalHealth";
import { VoiceReady } from "@/pages/app/VoiceReady";
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* [P0-ONBOARD] public activation / reset page — outside every
                auth guard (the invitee has no session yet). */}
            <Route path="/activate" element={<ActivatePage />} />

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
              {/* Phase 1253 — the ambient Focus Home is the default
                  landing (Founder acceptance: no dashboard first). The
                  full My Day workbench lives at /app/my-day. */}
              <Route index element={<AmbientWorkSurface />} />
              <Route path="my-day" element={<MyDay />} />
              <Route path="workspace" element={<EmployeeHome />} />
              <Route path="chat" element={<Chat />} />
              <Route path="observe" element={<Observe />} />
              <Route path="welcome" element={<Welcome />} />
              <Route path="corrections" element={<Corrections />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="action-center" element={<ActionCenter />} />
              <Route path="comms" element={<Comms />} />
              <Route path="my-organization" element={<MyOrganization />} />
              <Route path="my-memory" element={<MyMemory />} />
              <Route path="connector-health" element={<ConnectorHealth />} />
              <Route path="my-twin" element={<MyTwin />} />
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
              <Route path="my-work" element={<MyWork />} />
              <Route path="inbox/:id" element={<InboxThread />} />
              <Route path="team-work" element={<TeamWork />} />
              <Route path="blind-spots" element={<BlindSpots />} />
              <Route path="operational-health" element={<OperationalHealth />} />
              <Route path="voice-ready" element={<VoiceReady />} />
              <Route path="voice" element={<Voice />} />
              <Route path="conversations" element={<Conversations />} />
              {/* Unknown /app/* paths fall back to the employee home. */}
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
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
