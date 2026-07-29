// FILE: primary-work-tools.ts
// PURPOSE: Slice 3 — map enterprise-tools catalog into ≤4 primary employee
//          tool cards (Google Workspace, Microsoft 365, Slack, GitHub).
//          Human status + capability language only; no MCP / scope codes.
// CONNECTS TO: ConnectorHealth, WorkLedgerItem return-context links.

/** Canonical primary tools shown above the fold for ordinary employees. */
export const PRIMARY_TOOL_IDS = [
  "GOOGLE_WORKSPACE",
  "MICROSOFT_365",
  "SLACK",
  "GITHUB",
] as const;

export type PrimaryToolId = (typeof PRIMARY_TOOL_IDS)[number];

export type EmployeeConnectStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "needs_attention"
  | "reconnect_required"
  | "disabled";

export type HumanCapabilityLevel =
  | "view"
  | "understand"
  | "draft"
  | "create"
  | "execute";

export interface CatalogProviderRow {
  provider: string;
  label: string;
  oauth_slug: string | null;
  employee_self_serve: boolean;
  status: string;
  status_label: string;
  connect_action: string;
  account_label?: string | null;
}

export interface CatalogCapabilityRow {
  capability_id: string;
  label: string;
  description: string;
  category: string;
  status: string;
  status_label: string;
  providers: CatalogProviderRow[];
}

export interface PrimaryToolCard {
  tool_id: PrimaryToolId;
  display_name: string;
  /** Short value proposition (WHY). */
  why: string;
  /** Included products (WHAT). */
  includes: string[];
  oauth_slug: string | null;
  employee_self_serve: boolean;
  status: EmployeeConnectStatus;
  status_label: string;
  /** One primary CTA label when action is available. */
  primary_action: string | null;
  connect_action: "oauth_start" | "reconnect" | "request_admin" | "none";
  account_label: string | null;
  ownership: "personal" | "organization";
  /** Runtime-true capability bullets in plain language. */
  otzar_may: string[];
  capabilities: HumanCapabilityLevel[];
  /** True when this card should appear (real support or honest availability). */
  visible: boolean;
}

const TOOL_META: Record<
  PrimaryToolId,
  {
    display_name: string;
    why: string;
    includes: string[];
    oauth_slug: string | null;
    /** Honest capability bullets only when connected / ready. */
    otzar_may_connected: string[];
    capabilities_connected: HumanCapabilityLevel[];
  }
> = {
  GOOGLE_WORKSPACE: {
    display_name: "Google Workspace",
    why: "Let your AI Teammate understand authorized email, calendar, documents, and meetings.",
    includes: ["Gmail", "Calendar", "Drive", "Docs"],
    oauth_slug: "google",
    otzar_may_connected: [
      "View authorized calendar events and availability",
      "Understand selected email and meeting context",
      "Use authorized documents as source material",
      "Draft and schedule calendar changes within policy",
      "Create or update app-created Docs where policy permits",
    ],
    capabilities_connected: ["view", "understand", "draft", "create", "execute"],
  },
  MICROSOFT_365: {
    display_name: "Microsoft 365",
    why: "Let your AI Teammate work with authorized Outlook, calendar, files, and Teams context.",
    includes: ["Outlook", "Calendar", "OneDrive", "Teams"],
    oauth_slug: "microsoft",
    otzar_may_connected: [
      "View authorized calendar and mail metadata",
      "Understand availability and work signals",
      "Draft actions for review within policy",
    ],
    capabilities_connected: ["view", "understand", "draft"],
  },
  SLACK: {
    display_name: "Slack",
    why: "Let your AI Teammate understand authorized channels and prepare messages for review.",
    includes: ["Channels", "Direct messages"],
    oauth_slug: "slack",
    otzar_may_connected: [
      "View authorized channel and member context",
      "Understand work discussions in scope",
      "Draft messages for human approval before send",
    ],
    capabilities_connected: ["view", "understand", "draft", "execute"],
  },
  GITHUB: {
    display_name: "GitHub",
    why: "Let your AI Teammate understand authorized repositories, pull requests, and issues.",
    includes: ["Repos", "Pull requests", "Issues"],
    oauth_slug: null,
    otzar_may_connected: [
      "View authorized repository and issue context",
      "Understand engineering work signals",
    ],
    capabilities_connected: ["view", "understand"],
  },
};

/**
 * WHAT: Map catalog provider status → employee-facing status enum.
 * INPUT: raw status string from enterprise-tools catalog.
 * OUTPUT: EmployeeConnectStatus.
 * WHY: Primary cards never show raw OAuth / adapter enums.
 */
export function mapEmployeeStatus(raw: string): EmployeeConnectStatus {
  switch (raw) {
    case "connected":
      return "connected";
    case "error_reconnect":
      return "reconnect_required";
    case "ready_to_connect":
      return "not_connected";
    case "blocked":
      return "disabled";
    case "needs_admin":
    case "not_configured":
      return "not_connected";
    default:
      return "not_connected";
  }
}

/**
 * WHAT: Human status label for primary cards.
 * INPUT: EmployeeConnectStatus.
 * OUTPUT: short label string.
 */
export function employeeStatusLabel(s: EmployeeConnectStatus): string {
  switch (s) {
    case "not_connected":
      return "Not connected";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "needs_attention":
      return "Needs attention";
    case "reconnect_required":
      return "Reconnect required";
    case "disabled":
      return "Disabled by administrator";
  }
}

/**
 * WHAT: Pick the best catalog provider row for a primary tool.
 * INPUT: catalog capabilities + tool id.
 * OUTPUT: aggregated status + connect action + account label.
 */
export function pickProviderForTool(
  capabilities: ReadonlyArray<CatalogCapabilityRow>,
  toolId: PrimaryToolId,
): {
  status: string;
  connect_action: string;
  employee_self_serve: boolean;
  oauth_slug: string | null;
  account_label: string | null;
  any_row: boolean;
} {
  let bestStatus = "not_configured";
  let bestRank = -1;
  let connect_action = "none";
  let employee_self_serve = false;
  let oauth_slug: string | null = TOOL_META[toolId].oauth_slug;
  let account_label: string | null = null;
  let any_row = false;

  const rank = (st: string): number => {
    switch (st) {
      case "connected":
        return 5;
      case "ready_to_connect":
        return 4;
      case "error_reconnect":
        return 3;
      case "needs_admin":
        return 2;
      case "not_configured":
        return 1;
      case "blocked":
        return 0;
      default:
        return 0;
    }
  };

  for (const cap of capabilities) {
    for (const p of cap.providers) {
      if (p.provider !== toolId) continue;
      any_row = true;
      const r = rank(p.status);
      if (r > bestRank) {
        bestRank = r;
        bestStatus = p.status;
        connect_action = p.connect_action;
        employee_self_serve = p.employee_self_serve;
        if (p.oauth_slug !== null) oauth_slug = p.oauth_slug;
        if (p.account_label) account_label = p.account_label;
      } else if (r === bestRank && p.account_label && !account_label) {
        account_label = p.account_label;
      }
    }
  }

  return {
    status: bestStatus,
    connect_action,
    employee_self_serve,
    oauth_slug,
    account_label,
    any_row,
  };
}

/**
 * WHAT: Build ≤4 primary tool cards from the enterprise-tools catalog.
 * INPUT: catalog capabilities array.
 * OUTPUT: ordered PrimaryToolCard list (only visible tools).
 * WHY: Three-second employee clarity — tool cards, not capability maze.
 */
export function buildPrimaryToolCards(
  capabilities: ReadonlyArray<CatalogCapabilityRow>,
): PrimaryToolCard[] {
  const cards: PrimaryToolCard[] = [];

  for (const toolId of PRIMARY_TOOL_IDS) {
    const meta = TOOL_META[toolId];
    const picked = pickProviderForTool(capabilities, toolId);
    // Show if catalog knows the provider OR we always show the four primaries
    // with honest availability (GitHub often not self-serve).
    const visible = true;
    const empStatus = mapEmployeeStatus(picked.status);
    let connect_action: PrimaryToolCard["connect_action"] = "none";
    if (picked.connect_action === "oauth_start") connect_action = "oauth_start";
    else if (picked.connect_action === "reconnect") connect_action = "reconnect";
    else if (picked.connect_action === "request_admin")
      connect_action = "request_admin";
    else if (
      empStatus === "not_connected" &&
      meta.oauth_slug !== null &&
      picked.employee_self_serve
    ) {
      connect_action = "oauth_start";
    } else if (empStatus === "not_connected") {
      connect_action = "request_admin";
    } else if (empStatus === "reconnect_required") {
      connect_action = "reconnect";
    }

    let primary_action: string | null = null;
    if (connect_action === "oauth_start") {
      primary_action = `Connect ${meta.display_name}`;
    } else if (connect_action === "reconnect") {
      primary_action = `Reconnect ${meta.display_name}`;
    } else if (connect_action === "request_admin") {
      primary_action = "Ask admin to enable";
    }

    const connected =
      empStatus === "connected" || empStatus === "needs_attention";

    cards.push({
      tool_id: toolId,
      display_name: meta.display_name,
      why: meta.why,
      includes: meta.includes,
      oauth_slug: picked.oauth_slug ?? meta.oauth_slug,
      employee_self_serve: picked.employee_self_serve || meta.oauth_slug !== null,
      status: empStatus,
      status_label: employeeStatusLabel(empStatus),
      primary_action,
      connect_action,
      account_label: picked.account_label,
      ownership: "organization",
      otzar_may: connected ? meta.otzar_may_connected : [],
      capabilities: connected ? meta.capabilities_connected : [],
      visible,
    });
  }

  return cards.filter((c) => c.visible);
}

/** Session key for return-to-work context around OAuth. */
export const CONNECTION_RETURN_CONTEXT_KEY = "otzar.connection.return_context";

export interface ConnectionReturnContext {
  returnPath: string;
  workTitle?: string;
  toolId?: string;
  reason?: string;
  savedAt: string;
}

/**
 * WHAT: Persist return context before leaving for provider OAuth.
 * INPUT: path + optional work title / tool / reason.
 * OUTPUT: void (sessionStorage).
 */
export function saveConnectionReturnContext(
  ctx: Omit<ConnectionReturnContext, "savedAt">,
): void {
  try {
    const payload: ConnectionReturnContext = {
      ...ctx,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(CONNECTION_RETURN_CONTEXT_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private mode); non-fatal.
  }
}

/**
 * WHAT: Read and optionally clear return context after OAuth return.
 * INPUT: clear flag.
 * OUTPUT: context or null.
 */
export function loadConnectionReturnContext(
  clear = false,
): ConnectionReturnContext | null {
  try {
    const raw = sessionStorage.getItem(CONNECTION_RETURN_CONTEXT_KEY);
    if (raw === null) return null;
    if (clear) sessionStorage.removeItem(CONNECTION_RETURN_CONTEXT_KEY);
    const parsed = JSON.parse(raw) as ConnectionReturnContext;
    if (typeof parsed.returnPath !== "string" || parsed.returnPath.length === 0) {
      return null;
    }
    // Only allow same-origin relative paths (no open redirect).
    if (!parsed.returnPath.startsWith("/") || parsed.returnPath.startsWith("//")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * WHAT: Build employee Connections deep-link with tool + return context.
 * INPUT: tool slug, return path, optional work title / reason.
 * OUTPUT: path with query string.
 */
export function buildConnectDeepLink(args: {
  tool?: string;
  returnPath?: string;
  why?: string;
}): string {
  const params = new URLSearchParams();
  if (args.tool) params.set("tool", args.tool);
  if (args.returnPath) params.set("return", args.returnPath);
  if (args.why) params.set("why", args.why.slice(0, 200));
  const q = params.toString();
  return q.length > 0 ? `/app/connector-health?${q}` : "/app/connector-health";
}

/**
 * WHAT: Map connector label / provider enum to primary tool id or oauth slug.
 * INPUT: human label or provider key.
 * OUTPUT: oauth slug for start, or null.
 */
export function oauthSlugForConnectorLabel(label: string | null): string | null {
  if (label === null) return null;
  const t = label.toLowerCase();
  if (t.includes("google") || t.includes("gmail") || t.includes("workspace")) {
    return "google";
  }
  if (t.includes("microsoft") || t.includes("outlook") || t.includes("365")) {
    return "microsoft";
  }
  if (t.includes("slack")) return "slack";
  if (t.includes("zoom")) return "zoom";
  return null;
}

/** Employee-facing banned developer terms (primary surface). */
export const EMPLOYEE_BANNED_DEV_TERMS = [
  "mcp",
  "oauth client id",
  "callback uri",
  "scope identifier",
  "connector runtime",
  "provider catalog",
  "manifest",
  "tool harness",
  "capability enum",
  "token refresh",
  "webhook",
  "service account",
  "execution adapter",
] as const;

/**
 * WHAT: Detect forbidden developer terminology on the employee primary surface.
 * INPUT: visible text blob.
 * OUTPUT: list of matched banned terms (lowercased).
 */
export function findBannedDevTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return EMPLOYEE_BANNED_DEV_TERMS.filter((term) => lower.includes(term));
}

/**
 * WHAT: Human capability level labels for UI chips.
 * INPUT: HumanCapabilityLevel.
 * OUTPUT: title + one-line explanation.
 */
export function capabilityLevelCopy(level: HumanCapabilityLevel): {
  title: string;
  detail: string;
} {
  switch (level) {
    case "view":
      return {
        title: "View",
        detail: "Otzar can retrieve authorized information.",
      };
    case "understand":
      return {
        title: "Understand",
        detail:
          "Otzar can connect that information to people, projects, and work.",
      };
    case "draft":
      return {
        title: "Draft",
        detail: "Otzar can prepare an action for review.",
      };
    case "create":
      return {
        title: "Create",
        detail: "Otzar may create an item within policy.",
      };
    case "execute":
      return {
        title: "Execute",
        detail: "Otzar may complete an authorized action under policy.",
      };
  }
}
