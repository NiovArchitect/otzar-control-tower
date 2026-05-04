// FILE: Approvals.tsx
// PURPOSE: Approvals queue. Reached via the badge below the main
//          sidebar nav, NOT by being one of the 16 main entries.
//          Real queue lands in 12E.
// CONNECTS TO: src/components/Placeholder.tsx.

import { Placeholder } from "./Placeholder";

export function ApprovalsPage() {
  return (
    <Placeholder
      title="Pending Approvals"
      description="NEGOTIATE-derived requests awaiting org admin sign-off -- approve, deny, or escalate with full audit attribution."
      arrivingIn="Section 12E"
    />
  );
}
