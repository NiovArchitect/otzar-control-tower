// FILE: WalletProvenanceBadge.tsx
// PURPOSE: Customer-facing pill that names which wallet a row's data
//          lives in and the portability semantics of that wallet.
//          The portability story made visible in the UI.
// CONNECTS TO: Access Control matrix rows (12B.4), Data & Knowledge
//              browser rows (12D), any list that shows capsule
//              provenance.
//
// DERIVATION TABLE (per Q3, 12B.1 -- encapsulated here so consumers
// pass raw (walletType, entityType) and never re-implement the
// mapping):
//
//   walletType === "ENTERPRISE"
//     → "Enterprise wallet — stays with company"  (blue)
//   walletType === "PERSONAL" && entityType === "AI_AGENT"
//     → "AI Teammate wallet — travels with employee"  (teal)
//   walletType === "PERSONAL" && entityType === "PERSON"
//     → "Personal wallet — travels with employee"  (purple)
//   walletType === "DEVICE"
//     → "Device wallet — bound to hardware"  (gray)
//   any other combination
//     → fallback "{walletType} wallet"  (muted)
//
// IMPORTANT: Foundation has no AI_AGENT WalletType. AI agents
// (twins) get wallet_type="PERSONAL" at the schema level
// (apps/api/src/services/governance/twin.service.ts:191). This
// component is the canonical place that maps the Foundation
// reality to customer vocabulary.

import { ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EntityType, WalletType } from "@/lib/types/foundation";

interface WalletProvenanceBadgeProps {
  walletType: WalletType;
  entityType: EntityType;
  className?: string;
}

interface ResolvedVariant {
  label: string;
  tone: string;
  tooltip: string;
}

function resolveVariant(
  walletType: WalletType,
  entityType: EntityType,
): ResolvedVariant {
  if (walletType === "ENTERPRISE") {
    return {
      label: "Enterprise wallet — stays with company",
      tone: "border-blue-200 bg-blue-50 text-blue-800",
      tooltip:
        "Held in your organization's enterprise wallet. Data remains with the company when an employee leaves.",
    };
  }
  if (walletType === "DEVICE") {
    return {
      label: "Device wallet — bound to hardware",
      tone: "border-gray-300 bg-gray-50 text-gray-800",
      tooltip:
        "Held in a device-bound wallet. Data does not propagate beyond the registered device.",
    };
  }
  if (walletType === "PERSONAL" && entityType === "AI_AGENT") {
    return {
      label: "AI Teammate wallet — travels with employee",
      tone: "border-teal-300 bg-teal-50 text-teal-800",
      tooltip:
        "Held in an AI Teammate's personal wallet. Travels with the human owner if they leave the organization.",
    };
  }
  if (walletType === "PERSONAL" && entityType === "PERSON") {
    return {
      label: "Personal wallet — travels with employee",
      tone: "border-purple-300 bg-purple-50 text-purple-800",
      tooltip:
        "Held in the employee's personal wallet. Travels with the employee if they leave the organization.",
    };
  }
  return {
    label: `${walletType} wallet`,
    tone: "border-border bg-muted text-muted-foreground",
    tooltip: `Held in a ${walletType.toLowerCase()} wallet.`,
  };
}

export function WalletProvenanceBadge({
  walletType,
  entityType,
  className,
}: WalletProvenanceBadgeProps) {
  const variant = resolveVariant(walletType, entityType);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="note"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs",
            variant.tone,
            className,
          )}
        >
          <ShieldCheck className="h-3 w-3" aria-hidden />
          <span>{variant.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {variant.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
