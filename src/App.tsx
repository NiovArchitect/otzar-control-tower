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
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query";

import { EmployeeGuard } from "@/components/employee/EmployeeGuard";
import { EmployeeLayout } from "@/components/employee/EmployeeLayout";
import { EmployeeHome } from "@/pages/app/EmployeeHome";
import { Chat } from "@/pages/app/Chat";
import { Observe } from "@/pages/app/Observe";
import { Corrections } from "@/pages/app/Corrections";
import { Approvals } from "@/pages/app/Approvals";
import { MyTwin } from "@/pages/app/MyTwin";
import { Conversations } from "@/pages/app/Conversations";

import { LoginPage } from "@/pages/Login";
import { HomePage } from "@/pages/Home";
import { UsersPage } from "@/pages/Users";
import { AITeammatesPage } from "@/pages/AITeammates";
import { AccessControlPage } from "@/pages/AccessControl";
import { DataKnowledgePage } from "@/pages/Data";
import { SecurityPage } from "@/pages/Security";
import { AnalyticsPage } from "@/pages/Analytics";
import { ConversationsPage } from "@/pages/Conversations";
import { WorkflowsPage } from "@/pages/Workflows";
import { PlaygroundPage } from "@/pages/Playground";
import { AgentPlaygroundPage } from "@/pages/AgentPlayground";
import { PoliciesPage } from "@/pages/Policies";
import { SystemHealthPage } from "@/pages/SystemHealth";
import { SettingsPage } from "@/pages/Settings";
import { OnboardingPage } from "@/pages/Onboarding";
import { BillingPreviewPage } from "@/pages/BillingPreview";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import { DocumentationPage } from "@/pages/Documentation";
import { IntelligencePage } from "@/pages/Intelligence";
import { ApprovalsPage } from "@/pages/Approvals";
import { NotFoundPage } from "@/pages/NotFound";
import { VoiceTwinPage } from "@/pages/VoiceTwin";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

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
              <Route index element={<EmployeeHome />} />
              <Route path="chat" element={<Chat />} />
              <Route path="observe" element={<Observe />} />
              <Route path="corrections" element={<Corrections />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="my-twin" element={<MyTwin />} />
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
              <Route path="users" element={<UsersPage />} />
              <Route path="ai-teammates" element={<AITeammatesPage />} />
              <Route path="access-control" element={<AccessControlPage />} />
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
              <Route path="system-health" element={<SystemHealthPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="billing" element={<BillingPreviewPage />} />
              <Route path="connectors" element={<ConnectorsAdminPage />} />
              <Route path="voice" element={<VoiceTwinPage />} />
              <Route path="documentation" element={<DocumentationPage />} />
              <Route path="intelligence" element={<IntelligencePage />} />
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
