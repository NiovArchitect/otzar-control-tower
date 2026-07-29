// FILE: capability-first-tools.ts
// PURPOSE: O-01 — Primary UI is capability-first (calendar, docs, Meet, chat);
//          MCP / protocol rails are advanced-only for technical admins.
// CONNECTS TO: ConnectorHealth, ToolsConnections, FOUNDER O-01.

/** Employee primary tools path — never MCP admin rails. */
export const EMPLOYEE_TOOLS_PATH = "/app/connector-health";

/** Admin inventory path — capability inventory before MCP advanced. */
export const ADMIN_TOOLS_PATH = "/tools-connections";

/** Ordered admin tabs: OAuth Connections → Access governance → Advanced last. */
export const ADMIN_TOOLS_TAB_ORDER = [
  "connections",
  "access",
  "advanced",
] as const;

export type AdminToolsTab = (typeof ADMIN_TOOLS_TAB_ORDER)[number];

/** Default lands on human OAuth Connections launcher, not engineering console. */
export const DEFAULT_ADMIN_TOOLS_TAB: AdminToolsTab = "connections";

/** Slice 3 — employee primary copy (no MCP / protocol jargon). */
export const CAPABILITY_FIRST_HEADLINE =
  "Connect your work tools — calendar, email, documents, chat.";

export const CAPABILITY_FIRST_DETAIL =
  "Choose a tool, sign in through its official provider, and see what Otzar may do within your permissions.";

export const MCP_ADVANCED_ONLY_COPY =
  "Advanced integrations for technical administrators only. Ordinary employees connect Google Workspace, Microsoft 365, Slack, or GitHub from Connect your work tools — they never need this tab.";

export const MCP_TAB_LABEL = "Advanced connections";

/** True when a path is the employee capability-first surface. */
export function isEmployeeCapabilityFirstPath(pathname: string): boolean {
  return (
    pathname === EMPLOYEE_TOOLS_PATH ||
    pathname.startsWith(`${EMPLOYEE_TOOLS_PATH}?`)
  );
}

/** True when a path is admin tools (capability inventory + advanced). */
export function isAdminToolsPath(pathname: string): boolean {
  return (
    pathname === ADMIN_TOOLS_PATH || pathname.startsWith(`${ADMIN_TOOLS_PATH}?`)
  );
}

/**
 * Primary framing must not lead with MCP protocol jargon.
 * Returns false if copy is MCP-primary (forbidden for employee default).
 */
export function isCapabilityFirstCopy(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (t.length === 0) return false;
  // MCP may appear only as denial ("no MCP jargon") or advanced section.
  const mcpLead =
    /^(mcp|model context protocol|protocol rails|custom server)/i.test(t);
  if (mcpLead) return false;
  return (
    /capability|calendar|document|meet|chat|connect|tool|work/i.test(t) ||
    /nobody needs mcp|not.*mcp|advanced/i.test(t)
  );
}

/** Admin tab order fingerprint for tests. */
export function adminToolsTabFingerprint(
  tabs: ReadonlyArray<string>,
): string {
  return tabs.join(">");
}

export function isValidAdminTabOrder(tabs: ReadonlyArray<string>): boolean {
  if (tabs.length < 3) return false;
  const connections = tabs.indexOf("connections");
  const adv = tabs.indexOf("advanced");
  // OAuth Connections first; advanced always last.
  return connections === 0 && adv === tabs.length - 1;
}
