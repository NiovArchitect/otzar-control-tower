// FILE: data-flow.ts
// PURPOSE: [GAP-U SLICE-3] Pure derivation for the per-source data-flow
//          trust panel. Each row = LIVE connection status (from the OAuth
//          projection) merged with a STATIC capability matrix that states
//          only what the product actually does today — what Otzar can pull,
//          what it can push (nothing without approval), where data lands,
//          who owns it, who can see it, and what happens to it. Nothing is
//          inferred beyond evidence: a connector whose product flow isn't
//          wired says so ("Connected, not ingesting automatically"), and
//          capabilities that don't exist say "Not available yet" — never
//          "synced", never "ambient", never "retention configured".
//          Standing doctrine on every render: the employee can take the
//          SHAPE of how they work; they cannot take the company's work.
// CONNECTS TO: src/pages/DataFlow.tsx, api.otzar.oauthStatus (the only
//          live input), tests/unit/data-flow.test.tsx.

import type { OAuthStatusRow } from "@/lib/types/foundation";

export interface DataFlowRow {
  key: string;
  name: string;
  /** Human connection/capability state — never a raw enum. */
  status: string;
  statusKind: "active" | "attention" | "unavailable";
  pulls: string;
  pushes: string;
  lands: string;
  ownership: string;
  visibility: string;
  retention: string;
  repair: { label: string; to: string };
}

const RETENTION_HONEST =
  "Retention is governed lifecycle: seeded context can be retired from active use (audit preserved). Retention windows and deletion are not configurable yet — see the Retention page.";

/** Static product-capability truth per connector slug. States ONLY what is
 *  wired today; anything else is "not available yet". */
const CONNECTOR_CAPABILITY: Record<
  string,
  { pulls: string; pushes: string; lands: string; connectedStatus: string }
> = {
  zoom: {
    connectedStatus: "Connected — manual ingest available",
    pulls:
      "Cloud recording transcripts — only the recordings you choose to ingest. Ambient ingestion is not automatic yet.",
    pushes: "Nothing. Otzar does not write to Zoom.",
    lands:
      "Chosen transcripts become governed work (commitments, follow-ups, decisions) with source lineage and audit records.",
  },
  slack: {
    connectedStatus: "Connected — not ingesting automatically",
    pulls:
      "Nothing flows into the product yet — Slack message ingestion is not wired into the product flow. The connection covers reading and setup only.",
    pushes:
      "Nothing today. A governed send capability exists in the platform but is switched off and approval-gated.",
    lands: "No Slack data lands anywhere yet.",
  },
  google: {
    connectedStatus: "Connected — no product flow yet",
    pulls:
      "Nothing flows into the product yet — Gmail, Drive, and Calendar ingestion aren't wired into a product flow.",
    pushes: "Nothing. Otzar does not write to Google Workspace.",
    lands: "No Google Workspace data lands anywhere yet.",
  },
  microsoft: {
    connectedStatus: "Connected — no product flow yet",
    pulls: "Nothing flows into the product yet — Microsoft 365 ingestion isn't wired into a product flow.",
    pushes: "Nothing. Otzar does not write to Microsoft 365.",
    lands: "No Microsoft 365 data lands anywhere yet.",
  },
};

const COMPANY_OWNED =
  "Company-owned. Never stored in anyone's personal wallet, never portable with an employee.";

function connectorRow(row: OAuthStatusRow): DataFlowRow {
  const cap = CONNECTOR_CAPABILITY[row.slug];
  const connected = row.status === "VERIFIED" || row.status === "CONNECTED_UNVERIFIED";
  let status: string;
  let statusKind: DataFlowRow["statusKind"];
  if (connected) {
    status = cap?.connectedStatus ?? "Connected — capabilities limited";
    statusKind = "active";
  } else if (row.status === "READY_FOR_CONSENT") {
    status = "Ready to connect";
    statusKind = "attention";
  } else if (row.status === "ERROR_NEEDS_RECONNECT") {
    status = "Needs reconnecting";
    statusKind = "attention";
  } else if (row.status === "REVOKED") {
    status = "Disconnected";
    statusKind = "unavailable";
  } else {
    status = "Not available yet — requires operator setup";
    statusKind = "unavailable";
  }
  return {
    key: row.slug,
    name: row.display_name,
    status,
    statusKind,
    pulls: cap?.pulls ?? "Nothing flows into the product yet.",
    pushes: cap?.pushes ?? "Nothing.",
    lands: connected
      ? (cap?.lands ?? "No data lands anywhere yet.")
      : "Nothing — the source isn't connected.",
    ownership: COMPANY_OWNED,
    visibility:
      "Work created from this source follows normal work visibility — owners, their managers for team patterns, and admins for audit. Never broad by default.",
    retention: RETENTION_HONEST,
    repair: { label: "Open Tools & Connections", to: "/tools-connections" },
  };
}

/** The full panel: live connectors + the always-true non-connector rows. */
export function deriveDataFlows(connectors: OAuthStatusRow[] | null): DataFlowRow[] {
  const rows: DataFlowRow[] = [];

  // Manual communications — the strongest route today, always available.
  rows.push({
    key: "manual_comms",
    name: "Meeting transcripts & pasted communication",
    status: "Available now — manual import",
    statusKind: "active",
    pulls:
      "Whatever you paste or upload: meeting transcripts, conversation notes. Nothing is captured without you providing it.",
    pushes: "Nothing. Drafted follow-ups are delivered inside Otzar and always need review.",
    lands:
      "Trusted text becomes governed work — owned commitments, follow-ups, and decisions — with source lineage and audit records. Noisy text is quarantined and creates nothing.",
    ownership: COMPANY_OWNED,
    visibility:
      "The work goes to its owners and their team surfaces. Source excerpts appear only as proof on the work they support.",
    retention: RETENTION_HONEST,
    repair: { label: "Open Organization Seeding", to: "/organization-seeding" },
  });

  for (const c of connectors ?? []) rows.push(connectorRow(c));

  // External & client context — the T-1→T-4 governed rail.
  rows.push({
    key: "external_context",
    name: "External & client context",
    status: "Governed — review before trust",
    statusKind: "active",
    pulls:
      "When your team's communication involves an external person, Otzar notices — but an observed mention is never trusted automatically. An admin reviews before anyone is tracked.",
    pushes: "Nothing. Otzar never contacts external parties.",
    lands:
      "Reviewed external collaborators become calm work context (\"For Acme\") and manager exception patterns. Client and vendor data stays governed by your organization.",
    ownership:
      "Company-governed. External and client data never becomes portable personal memory — not for any employee, ever.",
    visibility:
      "Employees see calm context on their own work. Managers see account-level patterns, never private source data. Admins review external parties in Organization Seeding.",
    retention: RETENTION_HONEST,
    repair: { label: "Open Data & Knowledge", to: "/data-knowledge" },
  });

  // Memory & AI Teammate learning — the wallet boundary.
  rows.push({
    key: "memory_boundary",
    name: "Memory & AI Teammate learning",
    status: "Boundary enforced",
    statusKind: "active",
    pulls:
      "AI Teammates remember corrections and preferences their person gives them, and read them back to work better.",
    pushes: "Nothing leaves the organization.",
    lands:
      "Company work stays in company records. Personal work-style learning stays personal. The two never mix: an employee can take the shape of how they work — they cannot take the company's work.",
    ownership:
      "Split by design: company records are company-owned; personal work-style memory belongs to the person. Company source data never becomes portable personal memory.",
    visibility:
      "Personal memory is self-scoped. Company records follow work visibility and audit rules.",
    retention: RETENTION_HONEST,
    repair: { label: "Open Data & Knowledge", to: "/data-knowledge" },
  });

  return rows;
}
