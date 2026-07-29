// FILE: org-admin-home.ts
// PURPOSE: Slice 5 — pure Admin Home readiness projection.
//          Organization status, what is working, ≤3 real priorities,
//          outcome KPIs with source lineage. No vanity “6 of 11”.
// CONNECTS TO: CommandCenterPanel, Home, setup-journey inputs.

export type WorkingAreaId =
  | "people_hierarchy"
  | "ai_teammates"
  | "work_tools"
  | "governance"
  | "reports";

export type WorkingAreaState = "working" | "limited" | "needs_attention";

export interface WorkingArea {
  id: WorkingAreaId;
  label: string;
  state: WorkingAreaState;
  detail: string;
}

export interface AdminPriority {
  id: string;
  what: string;
  why: string;
  actionLabel: string;
  to: string;
}

export interface OutcomeKpi {
  id: string;
  label: string;
  value: string;
  source: string;
}

export interface OrgAdminHomeView {
  /** One-sentence organization status. */
  status_line: string;
  org_ready: boolean;
  working: WorkingArea[];
  /** At most three genuine priorities. */
  priorities: AdminPriority[];
  kpis: OutcomeKpi[];
  /** Hide raw demo/mode/checklist fraction from primary copy. */
  hide_setup_fraction: true;
  hide_demo_mode_badge: true;
}

export interface OrgAdminHomeInputs {
  orgName: string | null;
  peopleCount: number;
  activePeopleCount: number;
  managerLineCount: number;
  peopleWithoutManager: number;
  twinsReadyCount: number;
  twinsTotalCount: number;
  toolsConnectedCount: number;
  toolsReadyCount: number;
  openReviewCount: number;
  pendingApprovals: number | null;
  governanceHumanApproval: boolean | null;
  /** Credential / app-review blocked capabilities. */
  credentialBlockedCount: number;
}

/**
 * WHAT: Build Admin Home three-second contract from live projections.
 * INPUT: counts from people/hierarchy/twins/tools/approvals.
 * OUTPUT: OrgAdminHomeView.
 * WHY: Replace setup fraction theater with outcome readiness.
 */
export function buildOrgAdminHome(input: OrgAdminHomeInputs): OrgAdminHomeView {
  const org = (input.orgName ?? "Your organization").trim() || "Your organization";

  const hierarchyOk =
    input.peopleCount > 0 &&
    input.managerLineCount > 0 &&
    input.peopleWithoutManager === 0;
  const hierarchyLimited =
    input.peopleCount > 0 &&
    (input.managerLineCount === 0 || input.peopleWithoutManager > 0);

  const peopleArea: WorkingArea = {
    id: "people_hierarchy",
    label: "People and hierarchy",
    state: hierarchyOk
      ? "working"
      : hierarchyLimited
        ? "needs_attention"
        : "needs_attention",
    detail: hierarchyOk
      ? `${input.activePeopleCount} people with reporting lines`
      : input.peopleCount === 0
        ? "No people yet — invite your team"
        : `${input.peopleWithoutManager} people need a manager or team`,
  };

  const twinsOk =
    input.twinsTotalCount > 0 &&
    input.twinsReadyCount >= Math.min(input.twinsTotalCount, 1);
  const aiArea: WorkingArea = {
    id: "ai_teammates",
    label: "AI Teammates",
    state: twinsOk ? "working" : input.twinsTotalCount > 0 ? "limited" : "needs_attention",
    detail: twinsOk
      ? `${input.twinsReadyCount} ready of ${input.twinsTotalCount}`
      : input.twinsTotalCount === 0
        ? "No AI Teammates assigned yet"
        : "Some teammates need a role or tool",
  };

  const toolsOk = input.toolsConnectedCount > 0;
  const toolsArea: WorkingArea = {
    id: "work_tools",
    label: "Work tools",
    state:
      input.credentialBlockedCount > 0
        ? "needs_attention"
        : toolsOk
          ? "working"
          : "limited",
    detail:
      input.credentialBlockedCount > 0
        ? `${input.credentialBlockedCount} tools need credentials or review`
        : toolsOk
          ? `${input.toolsConnectedCount} connected`
          : "Connect Google Workspace or other tools when work needs them",
  };

  const govOk = input.governanceHumanApproval !== false;
  const govArea: WorkingArea = {
    id: "governance",
    label: "Governance",
    state: govOk ? "working" : "limited",
    detail: govOk
      ? "Human approval on sensitive actions is active"
      : "Confirm autonomy and approval policies",
  };

  const reportsArea: WorkingArea = {
    id: "reports",
    label: "Reports",
    state: "working",
    detail: "Audit, readiness, and compliance packages available",
  };

  const working = [peopleArea, aiArea, toolsArea, govArea, reportsArea];

  const priorities: AdminPriority[] = [];
  if (input.peopleCount === 0) {
    priorities.push({
      id: "invite-people",
      what: "Invite people into the organization",
      why: "Without people, hierarchy, AI Teammates, and work routing cannot run.",
      actionLabel: "Invite people",
      to: "/users",
    });
  } else if (input.peopleWithoutManager > 0 || input.managerLineCount === 0) {
    priorities.push({
      id: "hierarchy",
      what: "Place people in the reporting structure",
      why: "Escalations, team status, and manager routing need real reporting lines.",
      actionLabel: "Fix hierarchy",
      to: "/users",
    });
  }
  if (input.credentialBlockedCount > 0) {
    priorities.push({
      id: "tools",
      what: "Finish work-tool credentials",
      why: "Blocked tools prevent calendar, docs, and message help for employees.",
      actionLabel: "Open Connections",
      to: "/tools-connections",
    });
  }
  if (
    input.pendingApprovals !== null &&
    input.pendingApprovals > 0 &&
    priorities.length < 3
  ) {
    priorities.push({
      id: "approvals",
      what: `Review ${input.pendingApprovals} item${input.pendingApprovals === 1 ? "" : "s"} needing judgment`,
      why: "Sensitive actions wait on a human — clear them or escalate.",
      actionLabel: "Open Action Center",
      to: "/action-center",
    });
  }
  if (input.openReviewCount > 0 && priorities.length < 3) {
    // Only surface if not already crowded; cap meaningful structure reviews.
    const meaningful = input.openReviewCount;
    if (meaningful > 0 && meaningful <= 20) {
      priorities.push({
        id: "structure-review",
        what: `Confirm ${meaningful} structure proposal${meaningful === 1 ? "" : "s"}`,
        why: "Otzar found manager or team relationships that need a human check.",
        actionLabel: "Review structure",
        to: "/setup",
      });
    }
  }
  if (input.twinsTotalCount === 0 && priorities.length < 3) {
    priorities.push({
      id: "twins",
      what: "Assign AI Teammates from role templates",
      why: "Each person needs a scoped AI Teammate before Talk and work automation help.",
      actionLabel: "Open AI Teammates",
      to: "/ai-teammates",
    });
  }

  const capped = priorities.slice(0, 3);

  const workingCount = working.filter((w) => w.state === "working").length;
  const org_ready = workingCount >= 4 && capped.length === 0;
  const status_line = org_ready
    ? `${org} is ready for governed work — people, tools, and policies are in place.`
    : capped.length > 0
      ? `${org} needs attention on ${capped.length} priorit${capped.length === 1 ? "y" : "ies"} before setup is complete.`
      : `${org} is partially ready — review what is working below.`;

  const kpis: OutcomeKpi[] = [
    {
      id: "people",
      label: "Active people",
      value: String(input.activePeopleCount),
      source: "Organization membership (active PERSON entities)",
    },
    {
      id: "reporting",
      label: "Reporting lines",
      value: String(input.managerLineCount),
      source: "Manager edges from /org/hierarchy",
    },
    {
      id: "twins",
      label: "AI Teammates ready",
      value: `${input.twinsReadyCount}/${input.twinsTotalCount}`,
      source: "AI Teammate list readiness projection",
    },
    {
      id: "judgment",
      label: "Needs human judgment",
      value:
        input.pendingApprovals === null
          ? "—"
          : String(input.pendingApprovals),
      source: "Pending approvals queue (Action Center)",
    },
  ];

  return {
    status_line,
    org_ready,
    working,
    priorities: capped,
    kpis,
    hide_setup_fraction: true,
    hide_demo_mode_badge: true,
  };
}

/** Role templates for invite prefill (product vocabulary). */
export const ROLE_TEMPLATES = [
  {
    id: "org_lead",
    title: "Organization lead",
    purpose: "Final organization-level judgment",
    auto: ["Organize work", "Receive escalations", "Review executive reports"],
    needs_person: ["Company-level decisions", "Access grants"],
    prohibited: ["Silent policy bypass"],
  },
  {
    id: "application_review_lead",
    title: "Application review lead",
    purpose: "Owns the application-review process",
    auto: ["Draft review notes", "Request authorized context", "Update review work"],
    needs_person: ["Final selection recommendation"],
    prohibited: ["Cross-org disclosure"],
  },
  {
    id: "security_lead",
    title: "Security lead",
    purpose: "Owns security readiness gates",
    auto: ["Summarize security findings", "Flag unresolved claims"],
    needs_person: ["Security gate release", "External security commitments"],
    prohibited: ["Grant org-wide access"],
  },
  {
    id: "technical_diligence",
    title: "Technical diligence lead",
    purpose: "Architecture and engineering review",
    auto: ["Compare architecture evidence", "Draft diligence notes"],
    needs_person: ["Ship/no-ship technical judgment"],
    prohibited: ["Deploy without policy"],
  },
  {
    id: "regular_reviewer",
    title: "Reviewer",
    purpose: "Normal employee review experience",
    auto: ["Update own work", "Draft internal notes"],
    needs_person: ["Sensitive external send"],
    prohibited: ["Admin hierarchy edits"],
  },
  {
    id: "contractor",
    title: "Contractor",
    purpose: "Bounded project work with expiry",
    auto: ["Work inside assigned projects"],
    needs_person: ["Access extension"],
    prohibited: ["Employee memory access", "Org-wide invites"],
  },
] as const;

export type RelationshipType =
  | "employee"
  | "contractor"
  | "vendor"
  | "customer"
  | "partner"
  | "advisor";

export const RELATIONSHIP_TYPES: Array<{
  id: RelationshipType;
  label: string;
  default_duration: string;
}> = [
  { id: "employee", label: "Employee", default_duration: "Ongoing" },
  { id: "contractor", label: "Contractor", default_duration: "Time-boxed" },
  { id: "vendor", label: "Vendor", default_duration: "Contract term" },
  { id: "customer", label: "Customer", default_duration: "Engagement" },
  { id: "partner", label: "Partner", default_duration: "Agreement" },
  { id: "advisor", label: "Advisor", default_duration: "Advisory term" },
];
