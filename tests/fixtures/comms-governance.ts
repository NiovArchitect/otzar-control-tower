// FILE: tests/fixtures/comms-governance.ts
// PURPOSE: [SECTION-12-WORKGRAPH] Shared test fixtures for the recipient-
//          governance proof path + responsibility graph added to the comms
//          extraction contract, so test data stays DRY and type-complete.

import type {
  RecipientGovernance,
  CommsResponsibilityGraph,
} from "@/lib/types/foundation";

export function mkRecipientGovernance(
  over: Partial<RecipientGovernance> = {},
): RecipientGovernance {
  return {
    entity_id: "e-1",
    display_name: "Test User",
    email: null,
    role: null,
    participantStatus: "unknown",
    mentionStatus: "explicitly_mentioned",
    workConnectionType: "transcript_assignee",
    evidence: {
      quote: null,
      source: "explicit_mention",
      matchedToken: null,
      alternativeCandidates: [],
    },
    roleMatch: "unknown",
    hierarchyConnection: "unknown",
    projectConnection: "unknown",
    policyStatus: "allowed",
    sensitivity: "internal",
    confidence: "high",
    recipientSafety: "confirmed",
    autonomyEligibility: "draft_only",
    ...over,
  };
}

export const emptyResponsibilityGraph: CommsResponsibilityGraph = {
  lead: null,
  founderAuthority: null,
  nodes: [],
};
