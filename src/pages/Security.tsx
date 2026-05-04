// FILE: Security.tsx
// PURPOSE: Customer-facing "Security & Audit" screen -- the immutable
//          audit log plus session-level security events. Wraps
//          Foundation's audit_events + sessions primitives. Real
//          screen lands in 12D.
// CONNECTS TO: src/components/Placeholder.tsx.

import { Placeholder } from "./Placeholder";

export function SecurityPage() {
  return (
    <Placeholder
      title="Security & Audit"
      description="Immutable record of every action that touched data, plus session-level security events -- newest first, end to end auditable."
      arrivingIn="Section 12D"
    />
  );
}
