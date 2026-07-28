// FILE: CollaborationReceiptCard.tsx
// PURPOSE: Founder-visible AI collaboration receipt — WHO / WHY / RESULT /
//          TIME / proof link. No raw prompts, traces, or UUIDs in body.
// CONNECTS TO: Collaboration.tsx, collaboration-receipt.ts.

import { Bot, CheckCircle2, Clock, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CollaborationReceiptView } from "@/lib/work-os/collaboration-receipt";

interface CollaborationReceiptCardProps {
  receipt: CollaborationReceiptView;
  /** Compact strip for Today; full card for People / Action Center. */
  compact?: boolean;
}

export function CollaborationReceiptCard({
  receipt,
  compact = false,
}: CollaborationReceiptCardProps): JSX.Element {
  if (compact) {
    return (
      <div
        className="rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5"
        data-testid="collab-receipt-compact"
        data-collaboration-id={receipt.collaboration_id}
        data-state={receipt.state}
      >
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-50">
              {receipt.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-300">
              {receipt.why}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {receipt.result} · {receipt.time_label}
            </p>
          </div>
          <Link
            to={receipt.proof_path}
            className="shrink-0 text-[10px] text-sky-300 underline-offset-2 hover:underline"
            data-testid="collab-receipt-open"
          >
            Open
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Card
      data-testid="collab-receipt-card"
      data-collaboration-id={receipt.collaboration_id}
      data-state={receipt.state}
      data-ai-teammate={receipt.is_ai_teammate ? "true" : "false"}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <Bot className="h-4 w-4" aria-hidden />
          {receipt.title}
          <Badge variant="outline" data-testid="collab-receipt-state">
            {receipt.state === "COMPLETED" ? "Completed" : receipt.state}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <ReceiptLine label="Who collaborated" value={receipt.who_collaborated} />
        <ReceiptLine label="Why" value={receipt.why} />
        <ReceiptLine label="What was used" value={receipt.what_was_used} />
        <ReceiptLine
          label="What was excluded"
          value={receipt.what_was_excluded}
        />
        <div className="flex items-start gap-1.5 text-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Result</p>
            <p className="text-muted-foreground">{receipt.result}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          <span data-testid="collab-receipt-time">{receipt.time_label}</span>
        </div>
        <Link
          to={receipt.proof_path}
          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
          data-testid="collab-receipt-proof-link"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          Open collaboration record
        </Link>
        {/* Technical id only for authorized progressive disclosure — not primary. */}
        <details className="pt-1">
          <summary className="cursor-pointer text-[10px] text-muted-foreground/80">
            Technical reference
          </summary>
          <p
            className="mt-1 break-all font-mono text-[10px] text-muted-foreground/70"
            data-testid="collab-receipt-tech-id"
          >
            {receipt.collaboration_id}
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

function ReceiptLine({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div>
      <p className="font-medium text-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
