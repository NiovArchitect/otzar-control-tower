// FILE: Onboarding.tsx
// PURPOSE: Customer-facing "Onboarding" screen -- guided setup for
//          new admins. Real screen lands in 12F.
// CONNECTS TO: src/components/Placeholder.tsx.

import { Placeholder } from "./Placeholder";

export function OnboardingPage() {
  return (
    <Placeholder
      title="Onboarding"
      description="Guided setup for new org admins -- invite users, register AI teammates, configure access policies, run your first NEGOTIATE."
      arrivingIn="Section 12F"
    />
  );
}
