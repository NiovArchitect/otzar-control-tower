// FILE: capability-first-tools.ts
// PURPOSE: O-01 — Primary UI is capability-first (calendar, docs, Meet, chat);
//          MCP / protocol rails are advanced-only for technical admins.
// CONNECTS TO: ConnectorHealth, ToolsConnections, FOUNDER O-01.

/** Employee primary tools path — never MCP admin rails. */
export const EMPLOYEE_TOOLS_PATH = "/app/connector-health";

/** Admin inventory path — capability inventory before MCP advanced. */
export const ADMIN_TOOLS_PATH = "/tools-connections";

/** Ordered admin tabs: connect first (plug-and-play) → inventory → advanced last. */
export const ADMIN_TOOLS_TAB_ORDER = [
  "connected",
  "inventory",
  "advanced",
] as const;

export type AdminToolsTab = (typeof ADMIN_TOOLS_TAB_ORDER)[number];

/** Default lands on Connect tools (plug-and-play), not inventory KPIs. */
export const DEFAULT_ADMIN_TOOLS_TAB: AdminToolsTab = "connected";

export const CAPABILITY_FIRST_HEADLINE =
  "Connect by capability — calendar, documents, Meet, chat.";

export const CAPABILITY_FIRST_DETAIL =
  "Pick what work needs. Otzar does not ask you to configure MCP protocols for daily use.";

export const MCP_ADVANCED_ONLY_COPY =
  "Protocol rails live here for technical administrators only. Ordinary org setup does not require this tab.";

export const MCP_TAB_LABEL = "Advanced (developers only)";

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
  const connected = tabs.indexOf("connected");
  const adv = tabs.indexOf("advanced");
  // Connect tools first; advanced always last.
  return connected === 0 && adv === tabs.length - 1;
}
