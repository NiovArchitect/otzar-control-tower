// FILE: go-live-readiness.ts
// PURPOSE: [GAP-U SLICE-4] Pure derivation for the Go-Live Readiness Gate —
//          the launch confidence artifact. Consumes the SAME setup facts as
//          the journey page (computeSetupFacts — zero duplicated readiness
//          logic) and returns a deterministic verdict with three readiness
//          levels kept strictly apart:
//            A. Ready to run a first workflow (product truth, checkable)
//            B. Controlled pilot (A + the founder/operator runbook items,
//               which live OUTSIDE this product and are listed, not faked)
//            C. Founder-free self-serve onboarding — NOT complete, said on
//               every render.
//          Blockers block, warnings inform, ready signals give positive
//          proof, founder actions are labeled as founder actions. No raw
//          enums, no launch-certified language, no fake readiness.
// CONNECTS TO: src/lib/setup/setup-journey.ts (computeSetupFacts),
//          src/pages/GoLive.tsx, tests/unit/go-live.test.tsx.

import { computeSetupFacts, type SetupInputs } from "@/lib/setup/setup-journey";

export type GoLiveSeverity = "blocker" | "warning" | "founder_action" | "ready" | "not_available";

export interface GoLiveItem {
  label: string;
  whyItMatters: string;
  severity: GoLiveSeverity;
  repair: { label: string; to: string };
  /** Human source-of-truth label ("live member records", "runbook"). */
  source: string;
}

export interface GoLiveSection {
  key: string;
  title: string;
  items: GoLiveItem[];
}

export type GoLiveVerdict = "not_ready" | "needs_admin_setup" | "ready_first_workflow";

export interface GoLiveReadiness {
  verdict: GoLiveVerdict;
  verdictLabel: string;
  /** The short human paragraph under the verdict. */
  meaning: string;
  nextStep: { title: string; to: string; linkLabel: string };
  sections: GoLiveSection[];
  blockers: GoLiveItem[];
  warnings: GoLiveItem[];
  readySignals: GoLiveItem[];
  founderActions: GoLiveItem[];
  /** Always rendered: level C is not claimable. */
  limitation: string;
}

// The founder/operator runbook items live outside this product's API truth —
// they are standing pilot actions from OTZAR_PILOT_OPS_RUNBOOK.md §8, listed
// honestly as founder actions, never as customer blockers.
const FOUNDER_ACTIONS: GoLiveItem[] = [
  {
    label: "Dedicated smoke organization not created yet",
    whyItMatters:
      "Until it exists, operator test runs share this organization behind per-run identities with cleanup rails.",
    severity: "founder_action",
    repair: { label: "Pilot ops runbook", to: "/setup" },
    source: "Pilot ops runbook (operator-managed, outside this product)",
  },
  {
    label: "Phase-0 bootstrap rehearsal pending",
    whyItMatters: "One rehearsed org-creation dry run keeps day-one setup to an hour.",
    severity: "founder_action",
    repair: { label: "Pilot ops runbook", to: "/setup" },
    source: "Pilot ops runbook (operator-managed, outside this product)",
  },
];

export function deriveGoLiveReadiness(inputs: SetupInputs): GoLiveReadiness {
  const f = computeSetupFacts(inputs);
  const blockers: GoLiveItem[] = [];
  const warnings: GoLiveItem[] = [];
  const readySignals: GoLiveItem[] = [];
  const sections: GoLiveSection[] = [];
  const activeCount = f.active.length;
  const pendingCount = f.waiting + f.expired + f.invitedOnly;

  // ── People ────────────────────────────────────────────────────────────
  const people: GoLiveItem[] = [];
  if (!f.peopleLoaded) {
    people.push({
      label: "Couldn't check people right now",
      whyItMatters: "Refresh to re-check — the gate never guesses.",
      severity: "not_available",
      repair: { label: "Open Users", to: "/users" },
      source: "live member records",
    });
  } else if (activeCount === 0) {
    people.push({
      label: "Nobody can sign in yet",
      whyItMatters: "A first workflow needs at least one activated person.",
      severity: "blocker",
      repair: { label: "Import people (CSV)", to: "/setup/import-people" },
      source: "live member records",
    });
  } else {
    people.push({
      label: `${activeCount} ${activeCount === 1 ? "person" : "people"} active — enough to begin`,
      whyItMatters: "Work can be owned and reviewed by real, activated people.",
      severity: "ready",
      repair: { label: "Open Users", to: "/users" },
      source: "live member records",
    });
    if (pendingCount > 0) {
      people.push({
        label: `${pendingCount} ${pendingCount === 1 ? "person" : "people"} still need activation`,
        whyItMatters:
          "They can join later — activation isn't blocking while at least one active person can pilot.",
        severity: "warning",
        repair: { label: "Open Users", to: "/users" },
        source: "live member records",
      });
    }
  }
  if (f.adminCount > 0) {
    people.push({
      label: `${f.adminCount} ${f.adminCount === 1 ? "person holds" : "people hold"} admin-level authority`,
      whyItMatters: "Keep this limited to trusted operators.",
      severity: f.adminCount > 3 ? "warning" : "ready",
      repair: { label: "Open Users", to: "/users" },
      source: "live membership records",
    });
  }
  sections.push({ key: "people", title: "People", items: people });

  // ── Roles & hierarchy ─────────────────────────────────────────────────
  const roles: GoLiveItem[] = [];
  if (f.peopleLoaded && f.twinsLoaded) {
    if (f.missingRole > 0) {
      roles.push({
        label: `${f.missingRole} active ${f.missingRole === 1 ? "person needs" : "people need"} a role`,
        whyItMatters:
          "A first workflow can run without roles, but routing gets confident once roles exist.",
        severity: f.missingRole === activeCount && activeCount > 0 ? "warning" : "warning",
        repair: { label: "Open AI Teammates", to: "/ai-teammates" },
        source: "live role templates",
      });
    } else if (activeCount > 0) {
      roles.push({
        label: "Every active person has a role",
        whyItMatters: "Otzar can route work with confidence.",
        severity: "ready",
        repair: { label: "Open AI Teammates", to: "/ai-teammates" },
        source: "live role templates",
      });
    }
    if (f.missingManager > 0) {
      roles.push({
        label: `${f.missingManager} ${f.missingManager === 1 ? "person has" : "people have"} no manager mapped`,
        whyItMatters:
          "Clarifications and escalations work better with managers mapped. Hierarchy is not permission.",
        severity: "warning",
        repair: { label: "Open Users", to: "/users" },
        source: "live reporting structure",
      });
    }
  }
  sections.push({ key: "roles", title: "Roles & hierarchy", items: roles });

  // ── AI Teammates ──────────────────────────────────────────────────────
  const twins: GoLiveItem[] = [];
  if (f.twinsLoaded) {
    if (f.twinsReady > 0) {
      twins.push({
        label: `${f.twinsReady} AI ${f.twinsReady === 1 ? "Teammate is" : "Teammates are"} ready for governed work`,
        whyItMatters: "Draft-first assistance with approval rules is available.",
        severity: "ready",
        repair: { label: "Open AI Teammates", to: "/ai-teammates" },
        source: "live teammate readiness",
      });
    }
    const notReady = f.twinsNeedSetup + f.twinsNotConfigured;
    if (notReady > 0) {
      twins.push({
        label: `${notReady} AI ${notReady === 1 ? "Teammate" : "Teammates"} still need setup`,
        whyItMatters:
          "A first workflow doesn't depend on them — people can run it while teammates finish setup. No teammate is called ready until its own readiness says so.",
        severity: "warning",
        repair: { label: "Open AI Teammates", to: "/ai-teammates" },
        source: "live teammate readiness",
      });
    }
  }
  sections.push({ key: "twins", title: "AI Teammates", items: twins });

  // ── Tools & data ──────────────────────────────────────────────────────
  const tools: GoLiveItem[] = [
    {
      label: "Manual communications route is available now",
      whyItMatters:
        "Pasted transcripts and meeting uploads become governed work today — a first workflow never waits on a connector.",
      severity: "ready",
      repair: { label: "How your data flows", to: "/setup/data-flow" },
      source: "product capability",
    },
  ];
  if (f.connectorsLoaded && f.connectedTools > 0) {
    tools.push({
      label: `${f.connectedTools} ${f.connectedTools === 1 ? "tool is" : "tools are"} connected`,
      whyItMatters: "Connected is not the same as ingesting — the data-flow panel states each tool's truth.",
      severity: "ready",
      repair: { label: "How your data flows", to: "/setup/data-flow" },
      source: "live connections",
    });
  } else if (f.connectorsLoaded) {
    tools.push({
      label: "No tools connected yet",
      whyItMatters: "Fine for a first workflow — manual communications carry it.",
      severity: "warning",
      repair: { label: "Open Tools & Connections", to: "/tools-connections" },
      source: "live connections",
    });
  }
  sections.push({ key: "tools", title: "Tools & data", items: tools });

  // ── Governance & trust ────────────────────────────────────────────────
  const governance: GoLiveItem[] = [];
  if (f.settingsLoaded) {
    governance.push({
      label:
        f.approvalOn === false
          ? "Human approval for sensitive AI actions is OFF"
          : "Sensitive AI actions require human approval",
      whyItMatters:
        f.approvalOn === false
          ? "Most pilots keep approval on — review this before going live."
          : "The approval boundary is the pilot's safety rail.",
      severity: f.approvalOn === false ? "warning" : "ready",
      repair: { label: "Open Data & Knowledge", to: "/data-knowledge" },
      source: "live organization policy",
    });
    governance.push({
      label: f.auditOn === false ? "AI activity auditing is OFF" : "Every AI action is audited",
      whyItMatters: "The audit trail is the proof layer your pilot relies on.",
      severity: f.auditOn === false ? "warning" : "ready",
      repair: { label: "Open Data & Knowledge", to: "/data-knowledge" },
      source: "live organization policy",
    });
  }
  governance.push({
    label: "Retention controls are not configurable in-product yet",
    whyItMatters: "Keep this visible during pilot planning.",
    severity: "not_available",
    repair: { label: "Retention & lifecycle", to: "/retention" },
    source: "product capability",
  });
  governance.push({
    label: "Data boundaries are visible per source",
    whyItMatters:
      "Company-owned work data, governed external context, and the personal-memory boundary are stated on the data-flow panel.",
    severity: "ready",
    repair: { label: "How your data flows", to: "/setup/data-flow" },
    source: "product capability",
  });
  sections.push({ key: "governance", title: "Governance & trust", items: governance });

  // ── First workflow ────────────────────────────────────────────────────
  const workflow: GoLiveItem[] = [];
  if (f.workHasFlowed) {
    workflow.push({
      label: "Work is already flowing",
      whyItMatters: "Real communication has become owned, governed work — the loop is proven here.",
      severity: "ready",
      repair: { label: "Open Organization Seeding", to: "/organization-seeding" },
      source: "live work records",
    });
    if (f.openSeeds > 0) {
      workflow.push({
        label: `${f.openSeeds} ${f.openSeeds === 1 ? "suggestion is" : "suggestions are"} waiting for review`,
        whyItMatters: "Reviewing them keeps the setup signal clean — nothing applies without you.",
        severity: "warning",
        repair: { label: "Open Organization Seeding", to: "/organization-seeding" },
        source: "live review queue",
      });
    }
  } else if (activeCount > 0) {
    workflow.push({
      label: "Ready to run the first workflow",
      whyItMatters:
        "Paste a meeting transcript in Comms — Otzar finds the commitments, owners, and follow-ups inside it, and that becomes your first work truth.",
      severity: "ready",
      repair: { label: "Open Comms", to: "/app/comms" },
      source: "live work records",
    });
  }
  sections.push({ key: "workflow", title: "First workflow", items: workflow });

  // ── Founder/operator actions (outside product truth; listed honestly) ─
  sections.push({ key: "founder", title: "Founder & operator actions", items: FOUNDER_ACTIONS });

  // Classify.
  for (const s of sections) {
    for (const item of s.items) {
      if (item.severity === "blocker") blockers.push(item);
      else if (item.severity === "warning") warnings.push(item);
      else if (item.severity === "ready") readySignals.push(item);
    }
  }

  // Verdict: blockers gate; activation-shaped blockers read as admin setup.
  let verdict: GoLiveVerdict;
  if (!f.peopleLoaded) verdict = "not_ready";
  else if (blockers.length > 0) {
    verdict = pendingCount > 0 ? "needs_admin_setup" : "not_ready";
  } else verdict = "ready_first_workflow";

  const verdictLabel =
    verdict === "ready_first_workflow"
      ? "Ready to run a first workflow"
      : verdict === "needs_admin_setup"
        ? "Needs admin setup"
        : "Not ready yet";
  const meaning =
    verdict === "ready_first_workflow"
      ? `Your team can begin: ${activeCount} active ${activeCount === 1 ? "person" : "people"}, a working communication route, and visible boundaries. ${warnings.length > 0 ? `${warnings.length} ${warnings.length === 1 ? "item is" : "items are"} worth tidying as you go — none of them block the first workflow.` : "Nothing is blocking."} Controlled pilot readiness also depends on the founder/operator actions listed below.`
      : verdict === "needs_admin_setup"
        ? "People are invited but nobody can sign in yet. Finish activation and this gate re-checks instantly."
        : "The basics aren't in place yet — start with the step below and this gate re-checks as you go.";

  const nextStep =
    verdict !== "ready_first_workflow"
      ? activeCount === 0 && pendingCount === 0
        ? { title: "Invite your first team members", to: "/setup/import-people", linkLabel: "Import people (CSV)" }
        : { title: "Help invited people finish activation", to: "/users", linkLabel: "Open Users" }
      : f.workHasFlowed
        ? f.openSeeds > 0
          ? { title: "Review the waiting suggestions", to: "/organization-seeding", linkLabel: "Open Organization Seeding" }
          : { title: "Keep the loop running", to: "/", linkLabel: "Open Home" }
        : { title: "Run the first workflow", to: "/app/comms", linkLabel: "Open Comms" };

  return {
    verdict,
    verdictLabel,
    meaning,
    nextStep,
    sections,
    blockers,
    warnings,
    readySignals,
    founderActions: FOUNDER_ACTIONS,
    limitation:
      "This gate checks first-workflow and pilot readiness from live truth. It does not mean founder-free self-serve onboarding is complete — organization creation, email invites, and retention controls still involve the Otzar team.",
  };
}
