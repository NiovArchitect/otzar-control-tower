// FILE: ToolsConnections.tsx
// PURPOSE: Production Admin Center IA — the single "Tools & Connections"
//          destination. Everything external Otzar can use or needs access to
//          lives here. It COMPOSES the two existing connector surfaces as tabs
//          rather than duplicating their logic:
//            • Connected Tools     → ConnectorsAdminPage (connected apps / bindings,
//                                     enable/disable, health)
//            • Integrations & MCP  → ConnectorRailsAdmin (provider catalog, advanced
//                                     integrations, scopes, and per-tool policies)
//          Both underlying routes (/connectors, /connector-rails) stay registered
//          in App.tsx so existing deep links never break — this landing is the
//          human entry point, not a replacement.
// CONNECTS TO: src/pages/ConnectorsAdmin.tsx, src/pages/ConnectorRailsAdmin.tsx,
//              src/lib/nav.ts ("Tools & Connections").

import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import ConnectorRailsAdmin from "@/pages/ConnectorRailsAdmin";

export function ToolsConnectionsPage(): JSX.Element {
  return (
    <div className="space-y-6" data-testid="tools-connections-page">
      <PageHeader
        title="Tools & Connections"
        description="Everything external Otzar can use — what's connected, what needs authorization or setup, and the policies that govern each tool. Advanced integration detail stays one click away."
      />
      <Tabs defaultValue="connected" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connected" data-testid="tab-connected-tools">
            Connected Tools
          </TabsTrigger>
          <TabsTrigger value="advanced" data-testid="tab-integrations-mcp">
            Integrations &amp; MCP
          </TabsTrigger>
        </TabsList>
        {/* Connected apps + their health and setup state. */}
        <TabsContent value="connected" data-testid="panel-connected-tools">
          <ConnectorsAdminPage />
        </TabsContent>
        {/* Advanced: provider catalog, MCP connections, scopes, and per-tool
            policies (allow / approval / block / draft-only / dual-control). */}
        <TabsContent value="advanced" data-testid="panel-integrations-mcp">
          <ConnectorRailsAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
