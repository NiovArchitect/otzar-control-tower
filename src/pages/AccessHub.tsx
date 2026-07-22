// FILE: AccessHub.tsx
// PURPOSE: PROD-MODEL-P3 §9 — the ONE top-level Access Control destination.
//          Consolidates the two overlapping admin areas as tabs instead of
//          two nav entries with divided access logic:
//            • Permissions   → AccessControlPage (who can see/do what today)
//            • Grants & sharing → AccessGrantsPage (grants, revocations,
//              contributor sovereignty)
//          Mirrors the ToolsConnections composition precedent: both
//          underlying routes (/access-control-matrix view lives inside the
//          first tab; /access-grants) stay registered so deep links never
//          break — this is the human entry point, not a rewrite of either
//          surface.
// CONNECTS TO: src/pages/AccessControl.tsx, src/pages/AccessGrants.tsx,
//              src/lib/nav.ts ("Access Control"), App.tsx routes.

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessControlPage } from "@/pages/AccessControl";
import { AccessGrantsPage } from "@/pages/AccessGrants";

export function AccessHubPage(): JSX.Element {
  return (
    <div className="space-y-4" data-testid="access-hub-page">
      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permissions" data-testid="tab-access-permissions">
            Permissions
          </TabsTrigger>
          <TabsTrigger value="grants" data-testid="tab-access-grants">
            Grants &amp; sharing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="permissions" data-testid="panel-access-permissions">
          <AccessControlPage />
        </TabsContent>
        <TabsContent value="grants" data-testid="panel-access-grants">
          <AccessGrantsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
