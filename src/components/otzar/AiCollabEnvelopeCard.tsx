// FILE: AiCollabEnvelopeCard.tsx
// PURPOSE: L-01 — product surface for governed AI↔AI collaboration
//          envelope: fail closed, audited, policy-gated.
// CONNECTS TO: Collaboration.tsx, ai-collab-envelope.ts.

import { ShieldAlert, Bot, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AI_COLLAB_ENVELOPE_DOCTRINE,
  AI_COLLAB_FAIL_CLOSED,
  AI_COLLAB_NEVER,
} from "@/lib/work-os/ai-collab-envelope";

export function AiCollabEnvelopeCard(): JSX.Element {
  return (
    <Card
      data-testid="ai-collab-envelope-card"
      data-l01="true"
      data-fail-closed="true"
      data-silent-ai-ai="false"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4" aria-hidden />
          AI Teammate collaboration envelope
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="l01-doctrine" data-l01-doctrine="true">
          {AI_COLLAB_ENVELOPE_DOCTRINE}
        </p>
        <p
          className="flex items-start gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
          data-testid="l01-fail-closed"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{AI_COLLAB_FAIL_CLOSED}</span>
        </p>
        <div data-testid="l01-never">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            What never happens
          </p>
          <ul className="mt-1 list-inside list-disc">
            {AI_COLLAB_NEVER.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
        <p className="text-[11px]" data-testid="l01-audit-note">
          Ask for help creates a durable collaboration request. AI-initiated or
          twin-targeted requests stay inside the same envelope — accept, reject,
          cancel, and complete are recorded.
        </p>
      </CardContent>
    </Card>
  );
}
