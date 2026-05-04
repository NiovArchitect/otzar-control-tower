// FILE: Users.tsx
// PURPOSE: Customer-facing "Users" admin screen -- humans registered
//          in your org. Wraps Foundation's entity primitives. Real
//          screen lands in 12B.
// CONNECTS TO: src/components/Placeholder.tsx.

import { Placeholder } from "./Placeholder";

export function UsersPage() {
  return (
    <Placeholder
      title="Users"
      description="People in your organization -- their roles, last activity, and access summary."
      arrivingIn="Section 12B"
    />
  );
}
