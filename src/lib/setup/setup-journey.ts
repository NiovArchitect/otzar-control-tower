// FILE: setup-journey.ts
// PURPOSE: [GAP-U SLICE-1] Pure derivation for the Organization Setup page —
//          composes EXISTING read-only projections (people + hierarchy +
//          twins + connectors + seeds + analytics + settings) into a calm,
//          repair-oriented setup journey: seven sections, honest states,
//          and ONE deterministic next best step. No new truth is invented
//          here: every count traces to a backend projection, and anything
//          the product cannot do yet is said plainly ("not available yet"),
//          never faked. Least-access spine: minimum access first — add
//          capability by role, scope by data, authority by policy, action
//          by approval.
// CONNECTS TO: src/pages/OrgSetup.tsx (the rendering), the seven source
//          endpoints via src/lib/api.ts, tests/unit/setup-journey.test.ts.

import type {
  AITeammateListItem,
  Entity,
  EntityMembership,
  OAuthStatusRow,
  OrgAnalytics,
  OrgSeed,
} from "@/lib/types/foundation";

// ── Inputs: the raw projections the page fetches (all GET). Every field is
//    optional-tolerant — a failed fetch renders honest "couldn't load"
//    silence for that section, never invented state. ──────────────────────
export interface SetupInputs {
  people: Entity[] | null;
  memberships: EntityMembership[] | null;
  orgEntityId: string | null;
  twins: AITeammateListItem[] | null;
  twinAutonomyCeiling: string | null;
  connectors: OAuthStatusRow[] | null;
  seeds: OrgSeed[] | null;
  analytics: OrgAnalytics | null;
  settings: {
    require_human_approval?: boolean;
    audit_ai_actions?: boolean;
    twin_autonomy_ceiling?: string;
    default_jurisdiction?: string | null;
    industry?: string | null;
  } | null;
}

export type SectionState = "ready" | "needs_attention" | "blocked" | "unknown";

export interface SetupLine {
  /** Calm, human sentence — what is true and what to do. Never a raw enum. */
  text: string;
  /** Whether this line represents something needing action. */
  kind: "ok" | "action" | "limit";
}

export interface SetupSection {
  key: string;
  title: string;
  whyItMatters: string;
  state: SectionState;
  /** Human state label — "Ready" / "Needs setup" / "Waiting on you" etc. */
  stateLabel: string;
  lines: SetupLine[];
  /** ONE primary link to the existing real fix surface. */
  action: { label: string; to: string };
  /** Optional second door (used sparingly — e.g. the People card's CSV import). */
  secondaryAction?: { label: string; to: string };
}

export interface NextBestStep {
  title: string;
  detail: string;
  to: string;
  linkLabel: string;
}

export interface SetupJourney {
  /** Plain-language top summary. */
  summary: string;
  summaryState: SectionState;
  nextStep: NextBestStep;
  sections: SetupSection[];
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

// Human labels for the P0-ONBOARD activation projection — the raw values
// never render.
const ACTIVATION_LABEL: Record<string, string> = {
  active: "Active",
  activation_pending: "Waiting on activation",
  expired: "Link expired",
  invited: "Invited",
};
void ACTIVATION_LABEL;

/** Twin authority ceiling → human words (never raw autonomy tokens). */
export function ceilingLabel(ceiling: string | null | undefined): string {
  switch (ceiling) {
    case "OBSERVE_ONLY":
      return "Observe only";
    case "EXECUTIVE_OVERRIDE":
      return "Admin-level authority";
    case "APPROVAL_REQUIRED":
    default:
      return "Approval required";
  }
}

/** Connector status → the honest customer distinction. Connected ≠ usable ≠
 *  ingesting — the copy keeps those apart. */
export function connectorLine(row: OAuthStatusRow): SetupLine {
  const name = row.display_name;
  switch (row.status) {
    case "VERIFIED":
    case "CONNECTED_UNVERIFIED": {
      if (row.slug === "zoom") {
        return {
          kind: "ok",
          text: `${name} is connected for the organization. Recordings are ingested when you choose them; ambient ingestion is not automatic yet.`,
        };
      }
      if (row.slug === "slack") {
        return {
          kind: "limit",
          text: `${name} is connected for reading and setup. Message ingestion is not wired into the product flow yet.`,
        };
      }
      return {
        kind: "limit",
        text: `${name} is connected. What Otzar can do with it is still limited — check Tools & Connections for the honest state.`,
      };
    }
    case "READY_FOR_CONSENT":
      return {
        kind: "action",
        text: `${name} is ready to connect — an organization admin authorizes it from Tools & Connections.`,
      };
    case "ERROR_NEEDS_RECONNECT":
      return {
        kind: "action",
        text: `${name} needs to be reconnected before Otzar can use it.`,
      };
    case "REVOKED":
      return { kind: "limit", text: `${name} was disconnected.` };
    case "APP_CREDENTIALS_MISSING":
    default:
      return {
        kind: "limit",
        text: `${name} is not available yet — it requires operator setup before your organization can connect it.`,
      };
  }
}

/** The whole journey, derived from truth. Pure — no fetching, no writes. */
export function deriveSetupJourney(inputs: SetupInputs): SetupJourney {
  const sections: SetupSection[] = [];

  // ── People & access ──────────────────────────────────────────────────
  const people = inputs.people ?? [];
  const active = people.filter((p) => p.activation_status === "active" && p.status === "ACTIVE");
  const waiting = people.filter((p) => p.activation_status === "activation_pending");
  const expired = people.filter((p) => p.activation_status === "expired");
  const invitedOnly = people.filter((p) => p.activation_status === "invited");
  const memberships = inputs.memberships ?? [];
  const org = inputs.orgEntityId;
  const orgEdges = memberships.filter((m) => m.parent_id === org && m.is_active);
  const adminCount = orgEdges.filter((m) => m.is_admin).length;

  const peopleLines: SetupLine[] = [];
  if (inputs.people === null) {
    peopleLines.push({ kind: "limit", text: "Couldn't load people right now." });
  } else {
    peopleLines.push({
      kind: "ok",
      text: `${plural(active.length, "person", "people")} can use Otzar today. New members always start with minimum access.`,
    });
    if (waiting.length > 0) {
      peopleLines.push({
        kind: "action",
        text: `${plural(waiting.length, "person is", "people are")} waiting on activation — they can't use Otzar yet. Open Users to copy their activation links.`,
      });
    }
    if (expired.length > 0) {
      peopleLines.push({
        kind: "action",
        text: `${plural(expired.length, "activation link has", "activation links have")} expired. Generate a fresh link from Users.`,
      });
    }
    if (invitedOnly.length > 0) {
      peopleLines.push({
        kind: "action",
        text: `${plural(invitedOnly.length, "person was", "people were")} added but never got an activation link. Finish their invite from Users.`,
      });
    }
    if (adminCount > 0) {
      peopleLines.push({
        kind: "limit",
        text: `${plural(adminCount, "person has", "people have")} admin-level authority. Keep this limited to trusted operators.`,
      });
    }
    peopleLines.push({
      kind: "ok",
      text: "Adding many people at once? Import them from a CSV — everyone arrives with minimum access and their own activation link.",
    });
  }
  const peopleBlocked = waiting.length + expired.length + invitedOnly.length;
  sections.push({
    key: "people",
    title: "People & access",
    whyItMatters:
      "Otzar can only route work to people who can sign in. Everyone starts with minimum access — capability is added by role, not by default.",
    state: inputs.people === null ? "unknown" : peopleBlocked > 0 ? "needs_attention" : "ready",
    stateLabel:
      inputs.people === null
        ? "Couldn't check"
        : peopleBlocked > 0
          ? `${peopleBlocked} waiting`
          : "Ready",
    lines: peopleLines,
    action: { label: "Open Users", to: "/users" },
    secondaryAction: { label: "Import people (CSV)", to: "/setup/import-people" },
  });

  // ── Roles & hierarchy ────────────────────────────────────────────────
  const twins = inputs.twins ?? [];
  const twinByOwner = new Map(
    twins.filter((t) => t.owner_entity_id != null).map((t) => [t.owner_entity_id as string, t]),
  );
  const activeIds = new Set(active.map((p) => p.entity_id));
  const missingRole = active.filter((p) => {
    const t = twinByOwner.get(p.entity_id);
    return t === undefined || t.config?.role_template == null;
  });
  const managerEdges = memberships.filter(
    (m) => m.parent_id !== org && m.is_active && activeIds.has(m.child_id),
  );
  const managed = new Set(managerEdges.map((m) => m.child_id));
  const missingManager = active.filter((p) => !managed.has(p.entity_id));

  const rolesLines: SetupLine[] = [];
  if (inputs.people === null || inputs.twins === null) {
    rolesLines.push({ kind: "limit", text: "Couldn't load role assignments right now." });
  } else {
    if (missingRole.length > 0) {
      rolesLines.push({
        kind: "action",
        text: `${plural(missingRole.length, "active person needs", "active people need")} a role assignment before Otzar can route work to them confidently.`,
      });
    } else if (active.length > 0) {
      rolesLines.push({ kind: "ok", text: "Every active person has a role template guiding their work." });
    }
    if (missingManager.length > 0) {
      rolesLines.push({
        kind: "action",
        text: `${plural(missingManager.length, "person has", "people have")} no manager mapped. Clarifications and escalations need to know who to ask.`,
      });
    } else if (active.length > 0) {
      rolesLines.push({ kind: "ok", text: "Manager relationships are mapped." });
    }
    rolesLines.push({
      kind: "limit",
      text: "Hierarchy is who manages whom — it is not permission. Data and tool access stay scoped by role and policy.",
    });
  }
  sections.push({
    key: "roles",
    title: "Roles & hierarchy",
    whyItMatters:
      "Roles tell Otzar what each person's work looks like. Managers tell Otzar who can clarify and approve. Neither grants broad data access by itself.",
    state:
      inputs.people === null
        ? "unknown"
        : missingRole.length + missingManager.length > 0
          ? "needs_attention"
          : "ready",
    stateLabel:
      inputs.people === null
        ? "Couldn't check"
        : missingRole.length + missingManager.length > 0
          ? `${missingRole.length + missingManager.length} to assign`
          : "Ready",
    lines: rolesLines,
    action: { label: "Open Users", to: "/users" },
  });

  // ── AI Teammates ─────────────────────────────────────────────────────
  const readiness = (t: AITeammateListItem) => t.tool_readiness?.status ?? "unknown";
  const twinsReady = twins.filter((t) => readiness(t) === "ready");
  const twinsNeedSetup = twins.filter((t) => readiness(t) === "needs_setup");
  const twinsNotConfigured = twins.filter(
    (t) => readiness(t) === "not_configured" || readiness(t) === "unknown",
  );
  const twinLines: SetupLine[] = [];
  if (inputs.twins === null) {
    twinLines.push({ kind: "limit", text: "Couldn't load AI Teammates right now." });
  } else {
    if (twinsReady.length > 0) {
      twinLines.push({
        kind: "ok",
        text: `${plural(twinsReady.length, "AI Teammate is", "AI Teammates are")} ready for governed work.`,
      });
    }
    if (twinsNeedSetup.length > 0) {
      twinLines.push({
        kind: "action",
        text: `${plural(twinsNeedSetup.length, "AI Teammate needs", "AI Teammates need")} tool access before they can help with real work.`,
      });
    }
    if (twinsNotConfigured.length > 0) {
      twinLines.push({
        kind: "action",
        text: `${plural(twinsNotConfigured.length, "AI Teammate still needs", "AI Teammates still need")} setup before Otzar can call them ready — most are waiting on a role template.`,
      });
    }
    twinLines.push({
      kind: "limit",
      text: `An AI Teammate's authority is separate from its person's title. Today every teammate works draft-first: proposals need human approval (organization ceiling: ${ceilingLabel(inputs.twinAutonomyCeiling)}).`,
    });
  }
  sections.push({
    key: "twins",
    title: "AI Teammates",
    whyItMatters:
      "Each person gets an AI Teammate that drafts, routes, and remembers — under approval rules. A teammate is only useful once it has a role and its tools.",
    state:
      inputs.twins === null
        ? "unknown"
        : twinsNeedSetup.length + twinsNotConfigured.length > 0
          ? "needs_attention"
          : twins.length > 0
            ? "ready"
            : "needs_attention",
    stateLabel:
      inputs.twins === null
        ? "Couldn't check"
        : twinsNeedSetup.length + twinsNotConfigured.length > 0
          ? `${twinsNeedSetup.length + twinsNotConfigured.length} need setup`
          : twins.length > 0
            ? "Ready"
            : "None yet",
    lines: twinLines,
    action: { label: "Open AI Teammates", to: "/ai-teammates" },
  });

  // ── Tools & data ─────────────────────────────────────────────────────
  const connectors = inputs.connectors ?? [];
  const connected = connectors.filter(
    (c) => c.status === "VERIFIED" || c.status === "CONNECTED_UNVERIFIED",
  );
  const toolLines: SetupLine[] =
    inputs.connectors === null
      ? [{ kind: "limit", text: "Couldn't load tool connections right now." }]
      : connectors.length === 0
        ? [{ kind: "limit", text: "No tool connections are available yet." }]
        : connectors.map(connectorLine);
  if (inputs.connectors !== null && connected.length === 0 && connectors.length > 0) {
    toolLines.unshift({
      kind: "action",
      text: "No tools are connected yet. Until one is, work reaches Otzar through pasted transcripts and meeting uploads — which works today.",
    });
  }
  toolLines.push({
    kind: "limit",
    text: "Connections are organization-level and read-scoped. Nothing acts in an external tool without approval.",
  });
  sections.push({
    key: "tools",
    title: "Tools & data",
    whyItMatters:
      "Tools bring your team's real communication into Otzar. Connected is not the same as ingesting — this page always says which one is true.",
    state:
      inputs.connectors === null ? "unknown" : connected.length > 0 ? "ready" : "needs_attention",
    stateLabel:
      inputs.connectors === null
        ? "Couldn't check"
        : connected.length > 0
          ? `${connected.length} connected`
          : "None connected",
    lines: toolLines,
    action: { label: "Open Tools & Connections", to: "/tools-connections" },
  });

  // ── Governance & data boundary ───────────────────────────────────────
  const s = inputs.settings;
  const govLines: SetupLine[] = [];
  if (s === null) {
    govLines.push({ kind: "limit", text: "Couldn't load policy settings right now." });
  } else {
    govLines.push({
      kind: s.require_human_approval === false ? "action" : "ok",
      text:
        s.require_human_approval === false
          ? "Human approval for sensitive AI actions is currently OFF. Most pilots keep it on."
          : "Sensitive AI actions require human approval.",
    });
    govLines.push({
      kind: s.audit_ai_actions === false ? "action" : "ok",
      text:
        s.audit_ai_actions === false
          ? "AI activity auditing is currently OFF."
          : "Every AI action is recorded in the audit trail.",
    });
    govLines.push({
      kind: "ok",
      text: "Company work data stays company-owned. Personal memory stays personal. Client and vendor data never becomes portable personal memory.",
    });
    govLines.push({
      kind: "limit",
      text: "Retention controls are not configurable in-product yet. Keep this visible during pilot planning.",
    });
  }
  sections.push({
    key: "governance",
    title: "Governance & data boundary",
    whyItMatters:
      "Trust comes from boundaries: what needs approval, what is audited, what is company-owned, and what is never portable.",
    state:
      s === null
        ? "unknown"
        : s.require_human_approval === false || s.audit_ai_actions === false
          ? "needs_attention"
          : "ready",
    stateLabel:
      s === null
        ? "Couldn't check"
        : s.require_human_approval === false || s.audit_ai_actions === false
          ? "Review policies"
          : "Safe defaults",
    lines: govLines,
    action: { label: "Open Data & Knowledge", to: "/data-knowledge" },
  });

  // ── First workflows ──────────────────────────────────────────────────
  const analytics = inputs.analytics;
  const seeds = inputs.seeds ?? [];
  const openSeeds = seeds.filter(
    (x) => x.status === "SEED_NEEDS_REVIEW" || x.status === "SEED_PROPOSED",
  ).length;
  const workHasFlowed =
    analytics !== null && (analytics.decision_count > 0 || analytics.capsule_count > 0 || seeds.length > 0);
  const flowLines: SetupLine[] = [];
  if (analytics === null && inputs.seeds === null) {
    flowLines.push({ kind: "limit", text: "Couldn't check work activity right now." });
  } else if (!workHasFlowed) {
    flowLines.push({
      kind: "action",
      text: "No work has flowed into Otzar yet. Start by pasting a meeting transcript in Comms or uploading a meeting capture — Otzar finds the commitments, owners, and follow-ups inside it.",
    });
  } else {
    flowLines.push({
      kind: "ok",
      text: "Work is flowing: Otzar has found real decisions and follow-ups from your team's communication.",
    });
    if (openSeeds > 0) {
      flowLines.push({
        kind: "action",
        text: `${plural(openSeeds, "suggestion is", "suggestions are")} waiting for review in Organization Seeding — each one is something Otzar noticed your organization may need.`,
      });
    }
  }
  sections.push({
    key: "workflows",
    title: "First workflows",
    whyItMatters:
      "Otzar earns its keep when real communication becomes owned, routed, governed work. The first ingested conversation is where that starts.",
    state:
      analytics === null && inputs.seeds === null
        ? "unknown"
        : workHasFlowed
          ? "ready"
          : "needs_attention",
    stateLabel:
      analytics === null && inputs.seeds === null
        ? "Couldn't check"
        : workHasFlowed
          ? "Flowing"
          : "Not started",
    lines: flowLines,
    action: { label: "Open Organization Seeding", to: "/organization-seeding" },
  });

  // ── Foundation (rendered first; derived last so it can summarize) ────
  const foundationLines: SetupLine[] = [
    {
      kind: "ok",
      text: "Your organization exists and an admin account is active — the foundation is in place.",
    },
    {
      kind: "ok",
      text: "Otzar starts safely: minimum access first, then capability by role, scope by data, authority by policy, and action by approval.",
    },
  ];
  if (s?.industry == null && s !== null) {
    foundationLines.push({
      kind: "limit",
      text: "Industry and jurisdiction aren't set yet — optional, but they help Otzar frame policies.",
    });
  }
  sections.unshift({
    key: "foundation",
    title: "Foundation",
    whyItMatters:
      "The organization, its first admin, and its safety defaults — everything else builds on this.",
    state: "ready",
    stateLabel: "In place",
    lines: foundationLines,
    action: { label: "Open Settings", to: "/settings" },
  });

  // ── Next best step (deterministic; only truth-checkable steps) ───────
  let nextStep: NextBestStep;
  if (inputs.people !== null && active.length === 0) {
    nextStep = {
      title: "Invite your first team members",
      detail:
        "Nobody can use Otzar until someone activates. Invite people from Users and share their activation links securely.",
      to: "/users",
      linkLabel: "Open Users",
    };
  } else if (peopleBlocked > 0) {
    nextStep = {
      title: `Help ${plural(peopleBlocked, "person", "people")} finish activation`,
      detail:
        "They've been invited but can't use Otzar yet. Copy fresh activation links from Users and share them securely.",
      to: "/users",
      linkLabel: "Open Users",
    };
  } else if (missingRole.length > 0) {
    nextStep = {
      title: `Assign roles to ${plural(missingRole.length, "person", "people")}`,
      detail:
        "Roles tell Otzar how to route each person's work and what their AI Teammate should focus on.",
      to: "/ai-teammates",
      linkLabel: "Open AI Teammates",
    };
  } else if (missingManager.length > 0) {
    nextStep = {
      title: `Map managers for ${plural(missingManager.length, "person", "people")}`,
      detail: "Clarifications and approvals need to know who to ask.",
      to: "/users",
      linkLabel: "Open Users",
    };
  } else if (inputs.connectors !== null && connected.length === 0) {
    nextStep = {
      title: "Connect your first tool",
      detail:
        "Zoom is the strongest connector today. Until a tool is connected, pasted transcripts work fine.",
      to: "/tools-connections",
      linkLabel: "Open Tools & Connections",
    };
  } else if (twinsNeedSetup.length + twinsNotConfigured.length > 0) {
    nextStep = {
      title: "Finish AI Teammate setup",
      detail:
        "Some teammates still need roles or tools before Otzar can call them ready.",
      to: "/ai-teammates",
      linkLabel: "Open AI Teammates",
    };
  } else if (!workHasFlowed) {
    nextStep = {
      title: "Ingest your first conversation",
      detail:
        "Paste a meeting transcript or ingest a Zoom recording — Otzar turns it into owned, governed work.",
      to: "/organization-seeding",
      linkLabel: "Open Organization Seeding",
    };
  } else if (openSeeds > 0) {
    nextStep = {
      title: `Review ${plural(openSeeds, "suggestion", "suggestions")} in Organization Seeding`,
      detail: "Otzar noticed things your organization may need — nothing applies without your review.",
      to: "/organization-seeding",
      linkLabel: "Open Organization Seeding",
    };
  } else {
    nextStep = {
      title: "You're in good shape",
      detail:
        "People are active, roles are assigned, and work is flowing. Keep an eye on this page as your team grows.",
      to: "/",
      linkLabel: "Open Home",
    };
  }

  // ── Top summary ──────────────────────────────────────────────────────
  const attention = sections.filter((x) => x.state === "needs_attention").length;
  const unknown = sections.filter((x) => x.state === "unknown").length;
  const summaryState: SectionState =
    unknown === sections.length ? "unknown" : attention > 0 ? "needs_attention" : "ready";
  const summary =
    summaryState === "ready"
      ? "Your organization is set up for its first real workflows."
      : summaryState === "needs_attention"
        ? `${plural(attention, "area needs", "areas need")} attention before your team gets the full experience — start with the step below.`
        : "Otzar couldn't check your setup right now. Refresh to try again.";

  return { summary, summaryState, nextStep, sections };
}
