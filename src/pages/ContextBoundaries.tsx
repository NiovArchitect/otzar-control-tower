// FILE: ContextBoundaries.tsx
// PURPOSE: [CTX-BOUNDARY] "Context Boundaries" at /setup/context-boundaries
//          — the admin's calm boundary view: what company context Otzar
//          has been given, what each kind is allowed to do, what it is
//          NOT allowed to do, and what is honestly not configurable yet.
//          A boundary view, NOT a relevance-management view: no tagging,
//          no classifying, no retiring, no corpus cleanup — Otzar manages
//          relevance; employees and workflows validate nuance. Counts and
//          recent-document labels come from the read-only FND projection;
//          groups without a safe projection carry boundary copy only.
//          Read-only end to end: opening this page writes nothing.
// CONNECTS TO: api.workOs.contextBoundaries (admin-gated server-side),
//          /setup (journey), /setup/data-flow, /retention, the AIX model
//          doc, tests/unit/context-boundaries.test.tsx.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { ContextBoundariesView } from "@/lib/types/foundation";

// The boundary groups — copy is the product. Each group states what the
// context IS, what it CAN do, and what it CANNOT do. No raw internals.
const GROUPS: Array<{
  key: string;
  title: string;
  is: string;
  can: string[];
  cannot: string[];
}> = [
  {
    key: "seeded-history",
    title: "Seeded history",
    is: "Company-owned background context from past meetings and messages, dated and lineaged.",
    can: [
      "Inform answers with attribution — live work wins",
      "Be confirmed or corrected where the work is (View/Why)",
    ],
    cannot: ["Create work automatically", "Become current truth without confirmation", "Become anyone's personal Twin memory"],
  },
  {
    key: "seeded-documents",
    title: "Seeded documents",
    is: "Company-owned reference documents (briefs, SOPs, policies), dated and lineaged. Work extraction is off by default.",
    can: [
      "Inform answers as background with attribution",
      "Be scanned for possible work — an explicit, preview-only scan",
    ],
    cannot: ["Create work unless a human approves an item", "Change anyone's access", "Become personal Twin memory"],
  },
  {
    key: "extracted-work",
    title: "Reviewed extracted work",
    is: "Items a human approved from a document scan — now normal governed work.",
    can: ["Appear in My Work as proposed work, owned by the approver, with its source document recorded"],
    cannot: ["Be created by Otzar alone — every item was human-reviewed first"],
  },
  {
    key: "twin-calibration",
    title: "Employee Twin calibration",
    is: "Each employee's own working preferences — consent-gated, revocable, personal.",
    can: ["Shape how their own AI teammate works with them"],
    cannot: ["Contain company documents or project facts", "Own or change company work", "Be read by other employees"],
  },
  {
    key: "writing-style",
    title: "Writing style",
    is: "Style guidance an employee approved about their own writing. The raw sample never leaves their browser.",
    can: ["Guide tone in drafts the employee reviews"],
    cannot: ["Carry company documents, customers, or project facts", "Send anything on its own"],
  },
  {
    key: "live-work",
    title: "Live work",
    is: "The current operational truth — commitments, decisions, and blockers as they happen.",
    can: ["Drive workflows, approvals, and answers — it outranks all seeded background"],
    cannot: ["Be overridden by seeded history or documents"],
  },
  {
    key: "external-context",
    title: "External & customer context",
    is: "Observed context about people outside your organization — governed, never auto-trusted.",
    can: ["Be reviewed and explicitly tracked by your team"],
    cannot: ["Gain access or trust automatically", "Leave with an employee — client work is company-owned"],
  },
];

export function ContextBoundariesPage() {
  const [boundaries, setBoundaries] = useState<ContextBoundariesView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await api.workOs.contextBoundaries();
      if (!alive) return;
      if (r.ok) {
        setBoundaries(r.data.boundaries);
        setState("ready");
      } else {
        setState(r.code === "OPERATION_NOT_PERMITTED" ? "denied" : "failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const countFor = (key: string): number | null => {
    if (boundaries === null) return null;
    switch (key) {
      case "seeded-history":
        return boundaries.seeded_history_count;
      case "seeded-documents":
        return boundaries.seeded_document_count;
      case "extracted-work":
        return boundaries.extracted_reviewed_count;
      default:
        return null; // no safe projection — copy-only, on purpose
    }
  };

  return (
    <div className="space-y-6" data-testid="context-boundaries-page">
      <PageHeader
        title="Context Boundaries"
        description="See what company context Otzar has been given and how it is governed."
      />
      <p className="text-xs text-muted-foreground" data-testid="boundaries-doctrine">
        You govern the boundaries below. Otzar manages relevance inside them —
        you never need to classify, tag, or clean up sources. Your team
        confirms what matters where the work already is.
      </p>

      {state === "denied" ? (
        <p className="text-xs text-amber-600" data-testid="boundaries-denied">
          Context boundaries are an admin view.
        </p>
      ) : null}
      {state === "failed" ? (
        <p className="text-xs text-amber-600" data-testid="boundaries-failed">
          The boundary view couldn't load right now. Nothing changed — try again.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {GROUPS.map((g) => {
          const count = state === "ready" ? countFor(g.key) : null;
          return (
            <Card key={g.key} data-testid={`boundary-${g.key}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {g.title}
                  {count !== null ? (
                    <span
                      className="ml-auto text-xs font-normal text-muted-foreground"
                      data-testid={`boundary-count-${g.key}`}
                    >
                      {count} {count === 1 ? "record" : "records"}
                    </span>
                  ) : null}
                </CardTitle>
                <CardDescription className="text-xs">{g.is}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {g.can.map((line) => (
                  <div key={line} className="text-muted-foreground">
                    <span className="text-emerald-700">Can:</span> {line}
                  </div>
                ))}
                {g.cannot.map((line) => (
                  <div key={line} className="text-muted-foreground">
                    <span className="text-amber-700">Cannot:</span> {line}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {state === "ready" && boundaries !== null && boundaries.recent_documents.length > 0 ? (
        <Card data-testid="boundaries-recent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recently seeded documents</CardTitle>
            <CardDescription className="text-xs">
              Titles and boundaries only — Otzar manages what they relate to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            {boundaries.recent_documents.map((d) => (
              <div key={`${d.title_label}-${d.seeded_on}`} data-testid="boundaries-recent-doc">
                “{d.title_label}” — {d.origin_label}
                {d.currentness_label !== undefined ? ` · ${d.currentness_label}` : ""}
                {d.covering_period_label !== undefined ? ` · ${d.covering_period_label}` : ""}
                {` · seeded ${d.seeded_on}`}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="boundaries-retention">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Retention</CardTitle>
          <CardDescription className="text-xs" data-testid="boundaries-retention-copy">
            Retention controls are becoming governed lifecycle controls:
            admins can retire seeded context from active use — Otzar stops
            using it as background while the record, audit trail, and source
            lineage are preserved.
            {state === "ready" && boundaries !== null && boundaries.retired_context_count > 0
              ? ` ${boundaries.retired_context_count} ${boundaries.retired_context_count === 1 ? "record is" : "records are"} currently retired.`
              : ""}{" "}
            Hard delete and compliance purge are not available yet; nothing
            here deletes sources.{" "}
            <Link to="/retention" className="font-medium text-foreground underline underline-offset-2">
              Manage the seeded context lifecycle
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
