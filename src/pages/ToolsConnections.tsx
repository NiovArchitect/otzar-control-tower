// FILE: ToolsConnections.tsx
// PURPOSE: Production Admin Center IA — the single "Tools & Connections"
//          destination. Ordinary admins connect the tools their company
//          already uses (plain language). Advanced developer rails stay
//          one deliberate click away — never the primary vocabulary.
//            • Your tools     → ConnectorsAdminPage (OAuth, health, enable)
//            • Advanced       → ConnectorRailsAdmin (hidden MCP / policies)
// CONNECTS TO: src/pages/ConnectorsAdmin.tsx, src/pages/ConnectorRailsAdmin.tsx,
//              src/lib/nav.ts ("Tools & Connections").

import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import ConnectorRailsAdmin from "@/pages/ConnectorRailsAdmin";

const CATEGORIES: ReadonlyArray<{ title: string; examples: string }> = [
  { title: "Email and Calendar", examples: "Google Workspace, Microsoft 365" },
  { title: "Documents and Files", examples: "Google Drive, OneDrive" },
  { title: "Communication", examples: "Slack, email notifications" },
  { title: "Projects and Tasks", examples: "Jira, work ledgers" },
  { title: "Engineering", examples: "GitHub" },
  { title: "Custom company tools", examples: "Internal systems (advanced)" },
];

export function ToolsConnectionsPage(): JSX.Element {
  return (
    <div className="space-y-6" data-testid="tools-connections-page">
      <PageHeader
        title="Connect the tools your company already uses"
        description="Choose a tool, authorize access, and decide who may use it. Otzar never posts or writes without your policy — and you will not need protocol jargon to finish setup."
      />

      <section
        className="grid gap-2 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="connector-categories"
        aria-label="Tool categories"
      >
        {CATEGORIES.map((c) => (
          <div
            key={c.title}
            className="rounded-lg border border-border/60 bg-background px-3 py-2.5"
            data-testid="connector-category"
          >
            <p className="text-sm font-medium text-foreground">{c.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.examples}</p>
          </div>
        ))}
      </section>

      <Tabs defaultValue="connected" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connected" data-testid="tab-connected-tools">
            Your tools
          </TabsTrigger>
          <TabsTrigger value="advanced" data-testid="tab-integrations-advanced">
            Advanced (developers)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="connected" data-testid="panel-connected-tools">
          <ConnectorsAdminPage />
        </TabsContent>
        <TabsContent value="advanced" data-testid="panel-integrations-advanced">
          <p className="mb-3 text-sm text-muted-foreground">
            Protocol-level connections, tool policies, and custom servers for
            authorized technical administrators. Ordinary org setup does not
            require this tab.
          </p>
          <ConnectorRailsAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
