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
import { PoliciesPage } from "@/pages/Policies";
import { SystemHealthPage } from "@/pages/SystemHealth";
import { SettingsPage } from "@/pages/Settings";
import { OnboardingPage } from "@/pages/Onboarding";
import { DocumentationPage } from "@/pages/Documentation";
import { IntelligencePage } from "@/pages/Intelligence";
import { ApprovalsPage } from "@/pages/Approvals";
import { NotFoundPage } from "@/pages/NotFound";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
              <Route path="policies" element={<PoliciesPage />} />
              <Route path="system-health" element={<SystemHealthPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="onboarding" element={<OnboardingPage />} />
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
