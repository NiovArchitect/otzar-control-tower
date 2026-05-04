// FILE: Documentation.tsx
// PURPOSE: Customer-facing "Documentation" screen -- in-product docs
//          and runbooks. Real screen lands in 12F.
// CONNECTS TO: src/components/Placeholder.tsx.

import { Placeholder } from "./Placeholder";

export function DocumentationPage() {
  return (
    <Placeholder
      title="Documentation"
      description="In-product documentation, runbooks, and API references -- searchable, scoped to your org's enabled features."
      arrivingIn="Section 12F"
    />
  );
}
