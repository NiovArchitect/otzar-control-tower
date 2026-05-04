// FILE: Conversations.tsx
// PURPOSE: Customer-facing "Conversations" screen -- Otzar
//          conversations with audit-traceable AI activity. Real
//          screen lands in 12D.
// CONNECTS TO: src/components/Placeholder.tsx.

import { Placeholder } from "./Placeholder";

export function ConversationsPage() {
  return (
    <Placeholder
      title="Conversations"
      description="Otzar conversations -- prompts, responses, knowledge items referenced, and the full audit chain for each turn."
      arrivingIn="Section 12D"
    />
  );
}
