// FILE: decision-domains.ts
// PURPOSE: [BLOCK-3A] Single source of truth mapping Foundation's
//          DecisionDomain vocabulary to customer-facing labels for the
//          decision-rights surfaces. Raw enum tokens ("strategic",
//          "deadline") never reach customer copy.
// CONNECTS TO: CompanyProfile.tsx (admin rights editor),
//              WorkSchedule.tsx (employee posture),
//              src/lib/types/foundation.ts (DecisionDomain).

import type { DecisionDomain } from "@/lib/types/foundation";

export const DECISION_DOMAIN_LABELS: Record<DecisionDomain, string> = {
  strategic: "Strategy",
  technical: "Technical",
  product: "Product",
  design: "Design",
  security: "Security",
  legal: "Legal",
  finance: "Finance",
  people: "People",
  customer: "Customers",
  execution: "Execution",
  architecture: "Architecture",
  deadline: "Timelines",
} as const;

export const DECISION_DOMAINS = Object.keys(DECISION_DOMAIN_LABELS) as DecisionDomain[];

export function decisionDomainLabel(domain: DecisionDomain): string {
  return DECISION_DOMAIN_LABELS[domain] ?? domain;
}
