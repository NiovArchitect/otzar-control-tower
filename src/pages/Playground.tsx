// FILE: Playground.tsx
// PURPOSE: Customer-facing "Playground" -- the patent-claim demo
//          surface. Operators can stage a NEGOTIATE request, watch
//          the COSMP gates fire in real time, and see exactly which
//          capsules the COE assembled and why. This is the screen
//          that turns the patent claims into something a buyer can
//          touch. Real screen lands in 12C.
// CONNECTS TO: src/components/Placeholder.tsx.

import { Placeholder } from "./Placeholder";

export function PlaygroundPage() {
  return (
    <Placeholder
      title="Playground"
      description="Stage a NEGOTIATE request and watch the COSMP gates fire end to end -- the patent claims, made tangible. Build any capsule, share with any teammate, see the audit trail update live."
      arrivingIn="Section 12C"
    />
  );
}
