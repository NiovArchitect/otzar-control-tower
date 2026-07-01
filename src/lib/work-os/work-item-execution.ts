// FILE: work-item-execution.ts
// PURPOSE: PROD-UX-P0A — derive an ambient, ACTIONABLE view of a WorkLedger item from
//          the governed execution rails (Slice F). Given a work item, decide its
//          execution state (human task / Otzar-can-handle / pending approval /
//          executing / executed / blocked) and the MINIMAL correct set of actions —
//          no dead buttons, no fake buttons, and interruption only where the item
//          genuinely needs the human (doctrine: routing/autonomy, approval is the
//          exception). Pure + deterministic; the component renders whatever this
//          returns. Reads the stored camelCase execution_plan defensively.
// CONNECTS TO: src/lib/types/foundation.ts (WorkLedgerEntryView),
//   src/components/work-os/WorkLedgerItem.tsx.
import type { WorkLedgerEntryView } from "../types/foundation";

export type WorkItemExecState =
  | "human_task" // a person must do it; Otzar tracks + can help
  | "otzar_can_handle" // governed execute-with-approval, ready to route to Otzar
  | "pending_approval" // a governed Action is waiting on an approver
  | "executing" // approved/scheduled/running
  | "executed" // done via a connector; a receipt exists
  | "blocked_setup" // a tool/connector must be connected first
  | "needs_owner" // no confirmed owner yet
  | "tracking"; // saved + tracked, nothing to do right now

export type WorkItemActionId =
  | "open_source"
  | "ask_otzar"
  | "mark_done"
  | "add_update"
  | "request_setup"
  | "view_receipt"
  | "reconcile"
  | "view_why";

export interface WorkItemExecutionView {
  state: WorkItemExecState;
  stateLabel: string;
  /** Human connector name when the work runs through a tool (else null). */
  connectorLabel: string | null;
  nextBestAction: string | null;
  hasLinkedAction: boolean;
  /** The minimal, correct actions for this state — every one is live. */
  actions: WorkItemActionId[];
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

function planField(entry: WorkLedgerEntryView, camel: string, snake: string): string | null {
  const p = entry.execution_plan;
  if (p === undefined || p === null) return null;
  return str(p[camel]) ?? str(p[snake]);
}

const CONNECTOR_LABEL: Record<string, string> = {
  SLACK: "Slack",
  GITHUB: "GitHub",
  GITLAB: "GitLab",
  JIRA: "Jira",
  LINEAR: "Linear",
  NOTION: "Notion",
  CONFLUENCE: "Confluence",
  GOOGLE_WORKSPACE: "Google Workspace",
  MICROSOFT_365: "Microsoft 365",
  GMAIL: "Gmail",
  CALENDAR: "Calendar",
  MCP_SERVER: "a connected tool",
};
function connectorLabel(raw: string | null): string | null {
  if (raw === null || raw === "NONE" || raw === "INTERNAL") return null;
  return CONNECTOR_LABEL[raw] ?? raw.replace(/_/g, " ").toLowerCase();
}

const EXECUTED_STATUSES = new Set(["EXECUTED", "VERIFIED"]);
const EXECUTING_STATUSES = new Set(["EXECUTING"]);
const BLOCKED_STATUSES = new Set(["BLOCKED", "RUNTIME_MISSING"]);
const NEEDS_OWNER_STATUSES = new Set(["NEEDS_OWNER", "NEEDS_TARGET_RESOLUTION"]);
const NEEDS_APPROVAL_STATUSES = new Set(["NEEDS_APPROVAL", "NEEDS_AUTHORITY"]);

/** Derive the ambient execution view + the minimal correct actions. */
export function deriveWorkItemExecution(entry: WorkLedgerEntryView): WorkItemExecutionView {
  const status = entry.status;
  const mode = planField(entry, "executionMode", "execution_mode");
  const connector = connectorLabel(planField(entry, "requiredConnector", "required_connector"));
  const capability = planField(entry, "capabilityState", "capability_state");
  const nextBest = planField(entry, "nextBestAction", "next_best_action");
  const hasLinkedAction = typeof entry.proposed_action_id === "string" && entry.proposed_action_id.length > 0;
  const canComplete = entry.can_complete === true;
  const hasSource = typeof entry.conversation_id === "string" && entry.conversation_id.length > 0;

  const connectorNotReady =
    capability !== null && capability !== "available_and_authorized" && capability !== "connected";

  let state: WorkItemExecState;
  if (EXECUTED_STATUSES.has(status)) state = "executed";
  else if (EXECUTING_STATUSES.has(status)) state = "executing";
  else if (NEEDS_APPROVAL_STATUSES.has(status) || (hasLinkedAction && !EXECUTED_STATUSES.has(status))) state = "pending_approval";
  else if (BLOCKED_STATUSES.has(status) || (connector !== null && connectorNotReady && mode !== "human_must_do")) state = "blocked_setup";
  else if (NEEDS_OWNER_STATUSES.has(status)) state = "needs_owner";
  else if (mode === "otzar_can_execute_with_approval" && connector !== null) state = "otzar_can_handle";
  else if (mode === "human_must_do" || mode === null) state = canComplete ? "human_task" : "tracking";
  else state = "tracking";

  const label: Record<WorkItemExecState, string> = {
    human_task: "Waiting on you",
    otzar_can_handle: connector !== null ? `Otzar can do this in ${connector}` : "Otzar can handle this",
    pending_approval: "Waiting on approval",
    executing: "Otzar is handling this",
    executed: connector !== null ? `Done in ${connector}` : "Done",
    blocked_setup: connector !== null ? `Needs ${connector} connected` : "Needs setup",
    needs_owner: "Owner needs confirmation",
    tracking: "Tracked",
  };

  const actions: WorkItemActionId[] = [];
  if (hasSource) actions.push("open_source");
  switch (state) {
    case "executed":
      if (hasLinkedAction) actions.push("view_receipt");
      break;
    case "executing":
      if (hasLinkedAction) actions.push("reconcile");
      break;
    case "pending_approval":
      // The approver acts in the Action Center; here it's a status, not a button.
      break;
    case "blocked_setup":
      actions.push("request_setup");
      break;
    case "otzar_can_handle":
      actions.push("ask_otzar");
      break;
    case "human_task":
      actions.push("mark_done", "add_update");
      break;
    case "needs_owner":
      break;
    case "tracking":
      if (canComplete) actions.push("mark_done");
      break;
  }
  actions.push("view_why");

  return {
    state,
    stateLabel: label[state],
    connectorLabel: connector,
    nextBestAction: nextBest,
    hasLinkedAction,
    actions,
  };
}
