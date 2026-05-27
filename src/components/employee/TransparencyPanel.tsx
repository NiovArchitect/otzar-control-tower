// FILE: TransparencyPanel.tsx
// PURPOSE: Calm, premium, collapsed-by-default panel that surfaces the
//          COE-governed transparency + context-provenance metadata for
//          one chat turn (ADR-0051, Wave 1). It renders ONLY the
//          backend's pre-sanitized projection -- counts, friendly
//          statuses, scope labels, and a product-safe reason. It never
//          shows raw context content, prompts, chain-of-thought,
//          vectors, denied counts, bridge ids, capability flags, or any
//          raw id (context_id is a render key only).
// CONNECTS TO: src/pages/app/Chat.tsx, transparency label helpers.

import {
  labelRetrievalStatus,
  labelScope,
  labelSourceType,
  labelVerificationStatus,
} from "@/lib/labels/transparency";
import type {
  ChatTransparency,
  ContextProvenanceItem,
} from "@/lib/types/foundation";

interface TransparencyPanelProps {
  transparency?: ChatTransparency | null;
  provenance?: ContextProvenanceItem[];
}

export function TransparencyPanel({
  transparency,
  provenance,
}: TransparencyPanelProps) {
  const t = transparency ?? null;
  const items = provenance ?? [];

  if (t === null && items.length === 0) {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-testid="transparency-empty"
      >
        No context details available yet.
      </p>
    );
  }

  const summaryCount = t?.context_items_used ?? items.length;

  return (
    <section
      className="rounded-md border border-border bg-muted/20 text-sm"
      data-testid="transparency-panel"
    >
      <p className="px-4 py-2 text-xs font-medium text-muted-foreground">
        How Otzar answered · {summaryCount} context item
        {summaryCount === 1 ? "" : "s"} used
      </p>

      <div className="space-y-4 px-4 pb-4 pt-1">
        {t && (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Row
              label="Context"
              value={labelRetrievalStatus(t.retrieval_status)}
            />
            <Row label="Source" value="Governed context layer" />
            {t.retrieval_reason && (
              <Row label="Why" value={t.retrieval_reason} wide />
            )}
            {t.items_skipped_low_relevance > 0 && (
              <Row
                label="Filtered out as not relevant"
                value={String(t.items_skipped_low_relevance)}
              />
            )}
            {t.items_skipped_budget > 0 && (
              <Row
                label="Held back to keep the response focused"
                value={String(t.items_skipped_budget)}
              />
            )}
            <Row
              label="Memory"
              value={
                t.memory_updated
                  ? "Memory updated"
                  : "Memory update not recorded in this step"
              }
            />
            <Row
              label="Approval"
              value={t.approval_required ? "Required" : "Not required"}
            />
            <Row label="Tools" value="Not active yet" />
            <Row
              label="Verification"
              value={labelVerificationStatus(t.verification_status)}
            />
          </dl>
        )}

        {t?.access_limited && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="access-limited"
          >
            Some context was excluded by your organization's access rules.
          </p>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Knowledge used
            </p>
            <ul className="space-y-2" data-testid="provenance-list">
              {items.map((c) => (
                <li
                  key={c.context_id}
                  className="rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {c.title ?? "Untitled context"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {labelSourceType(c.source_type)} · {labelScope(c.scope)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Content available: {c.content_available ? "Yes" : "No"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "space-y-0.5 sm:col-span-2" : "space-y-0.5"}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
