// FILE: WorkArtifactCard.tsx
// PURPOSE: Phase 1267 — the VISIBLE, EDITABLE work artifact. Before
//          this, "Draft a message to David" was hearsay: Otzar said it
//          drafted something but no artifact existed. This card makes
//          every draft / proposed action / meeting proposal a real,
//          on-screen object with a recipient, channel, body, governed
//          status, and Edit / Confirm / Cancel / Open controls.
//
//          It NEVER sends anything itself — Confirm calls back into the
//          governed runtime (which proposes/approval-gates), and Edit
//          revises the local body before re-proposing. If a backend
//          ProposedAction was created, its id + status are shown.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx,
//          tests/unit/work-artifact-card.test.tsx.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Pencil, X, ExternalLink } from "lucide-react";

export interface WorkArtifact {
  /** DRAFT_MESSAGE / SEND_REQUIRES_APPROVAL / SCHEDULE_MEETING. */
  kind: string;
  title: string;
  /** Resolved recipient/participant label, if any. */
  targetLabel?: string;
  /** internal / slack / email / calendar. */
  channel?: string;
  /** The editable draft body / meeting note. */
  body: string;
  /** Governed status badge (Approval required / Draft only / …). */
  status: string;
  /** A preserved prerequisite, e.g. "Requires Samiksha's confirmation". */
  prerequisite?: string;
  /** Backend ProposedAction id, when one was created. */
  actionId?: string;
  /** True once a backend ProposedAction has been created (Confirm). */
  proposed?: boolean;
  /** True for an external channel (Slack/email) — never auto-sent. */
  externalChannel?: boolean;
  /** The original spoken/typed command (shown as source). */
  sourceCommand?: string;
  /** Resolved recipient entity id — lets Confirm propose the action. */
  recipientEntityId?: string;
  /** Where "Open" routes (Action Center / Work Comms / …). */
  route?: string;
  /** Honest note when a backend bridge is missing. */
  runtimeNote?: string;
  /** Phase 1271 — real free/busy availability summary for a meeting
   *  proposal: candidate windows, busy blockers, or a reconnect/blocked
   *  message. Never fabricated; set only from a live free/busy read. */
  availabilityNote?: string;
  /** Phase 1273 — project/goal context label, e.g. "Otzar voice runtime". */
  contextLabel?: string;
  /** Phase 1273 — instruction weight (COMMITMENT / COMMAND / DELEGATION…). */
  weight?: string;
  /** Phase 1273 — authority/policy status from the backend authority
   *  context (e.g. "Manager authority — internal scheduling allowed"). */
  authorityNote?: string;
  /** Phase 1273 — links artifacts that came from one multi-intent plan. */
  planId?: string;
  /** Phase 1274 — explicit proposed time, e.g. "11:00 AM Pacific Time". */
  proposedTime?: string;
  /** Phase 1274/1275 — machine 24h clock ("11:00") when the user gave an
   *  explicit time. Present ⇒ Confirm must NOT treat it as "no time
   *  selected"; full datetime normalization is a separate bridge. */
  explicitTime?: string;
  /** Phase 1274 — timezone interpretation + target local-time note. */
  timezoneNote?: string;
  /** Phase 1278 — which runtime produced the extraction (deterministic
   *  TypeScript vs. Python enrichment). Honest; shown in View/Why. */
  extractionSource?: string;
  /** Phase 1275 — confidence/evidence for inferred fields (shown in
   *  View/Why details only — never noise in the main card). */
  evidence?: Array<{
    field: string;
    value: string;
    confidence: string;
    evidence_type: string;
    source_text?: string;
    note?: string;
    requires_confirmation?: boolean;
  }>;
}

interface Props {
  artifact: WorkArtifact;
  /** Called with the (possibly edited) body when the user Confirms. */
  onConfirm: (body: string) => void;
  /** Called when the user Cancels — dismiss the local artifact. */
  onCancel: () => void;
  /** Called with the edited body on Save (does not submit). */
  onEdit?: (body: string) => void;
  /** Called when the user opens the artifact's destination. */
  onOpen?: (route: string) => void;
}

export function WorkArtifactCard({
  artifact,
  onConfirm,
  onCancel,
  onEdit,
  onOpen,
}: Props): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(artifact.body);
  const [viewing, setViewing] = useState(false);
  const [includeOpen, setIncludeOpen] = useState(false);
  const [includeName, setIncludeName] = useState("");
  const [included, setIncluded] = useState<string[]>([]);

  return (
    <div
      className="rounded-md border border-primary/30 bg-background/80 p-2 text-xs space-y-1.5"
      data-testid="work-artifact-card"
      data-kind={artifact.kind}
      data-action-id={artifact.actionId ?? ""}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground break-words">
          {artifact.title}
        </span>
        <Badge variant="outline" data-testid="work-artifact-status">
          {artifact.status}
        </Badge>
      </div>
      {artifact.targetLabel !== undefined ? (
        <div className="text-muted-foreground">
          To: {artifact.targetLabel}
          {included.length > 0 ? `, ${included.join(", ")}` : ""}
          {artifact.channel !== undefined ? ` · ${artifact.channel}` : ""}
        </div>
      ) : null}

      {includeOpen ? (
        <div className="flex items-center gap-1" data-testid="work-artifact-include">
          <input
            value={includeName}
            onChange={(e) => setIncludeName(e.target.value)}
            placeholder="Add a teammate (name)"
            aria-label="Include another teammate"
            className="flex-1 rounded border border-input bg-card px-1.5 py-1 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            data-testid="work-artifact-include-add"
            disabled={includeName.trim().length === 0}
            onClick={() => {
              const name = includeName.trim();
              setIncluded((prev) => [...prev, name]);
              setIncludeName("");
              setIncludeOpen(false);
            }}
          >
            Add
          </Button>
        </div>
      ) : null}

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-16 w-full rounded border border-input bg-card p-1.5 text-xs"
          data-testid="work-artifact-edit"
          aria-label="Edit draft"
        />
      ) : (
        <div
          className="whitespace-pre-wrap break-words rounded bg-muted/40 p-1.5 text-muted-foreground"
          data-testid="work-artifact-body"
        >
          {draft}
        </div>
      )}

      {artifact.prerequisite !== undefined ? (
        <div
          className="text-amber-600 dark:text-amber-400"
          data-testid="work-artifact-prereq"
        >
          ⏳ {artifact.prerequisite}
        </div>
      ) : null}
      {artifact.proposedTime !== undefined ? (
        <div className="text-[11px] text-foreground" data-testid="work-artifact-proposed-time">
          Proposed time: {artifact.proposedTime}
        </div>
      ) : null}
      {artifact.timezoneNote !== undefined ? (
        <div className="text-[10px] text-muted-foreground" data-testid="work-artifact-timezone">
          {artifact.timezoneNote}
        </div>
      ) : null}
      {artifact.authorityNote !== undefined ? (
        <div
          className="rounded bg-primary/10 p-1.5 text-[11px] text-foreground"
          data-testid="work-artifact-authority"
        >
          {artifact.authorityNote}
        </div>
      ) : null}
      {artifact.contextLabel !== undefined ? (
        <div className="text-[10px] text-muted-foreground" data-testid="work-artifact-context">
          Context: {artifact.contextLabel}
        </div>
      ) : null}
      {artifact.availabilityNote !== undefined ? (
        <div
          className="whitespace-pre-line rounded bg-muted/50 p-1.5 text-[11px] text-foreground"
          data-testid="work-artifact-availability"
        >
          {artifact.availabilityNote}
        </div>
      ) : null}
      {artifact.runtimeNote !== undefined ? (
        <div className="text-[10px] text-muted-foreground">
          {artifact.runtimeNote}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1 pt-0.5">
        {editing ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-6 px-2 text-[11px]"
              data-testid="work-artifact-save"
              onClick={() => {
                setEditing(false);
                onEdit?.(draft);
              }}
            >
              <Check className="mr-1 h-3 w-3" /> Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                setDraft(artifact.body);
                setEditing(false);
              }}
            >
              Discard edit
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-6 px-2 text-[11px]"
              data-testid="work-artifact-confirm"
              onClick={() => onConfirm(draft)}
            >
              <Check className="mr-1 h-3 w-3" /> Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              data-testid="work-artifact-edit-open"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1 h-3 w-3" /> Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              data-testid="work-artifact-include-open"
              onClick={() => setIncludeOpen((v) => !v)}
            >
              Include others
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              data-testid="work-artifact-cancel"
              onClick={onCancel}
            >
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
            {/* View/Open is ALWAYS available (Phase 1273): inspect-only.
                Routes to a detail surface when one exists; otherwise
                toggles an in-place inspector. NEVER confirms/creates/
                sends. */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              data-testid="work-artifact-open"
              onClick={() => {
                if (artifact.route !== undefined) {
                  onOpen?.(artifact.route);
                } else {
                  setViewing((v) => !v);
                }
              }}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              {artifact.route !== undefined ? "Open" : "View"}
            </Button>
          </>
        )}
      </div>
      {viewing && artifact.route === undefined ? (
        <div
          className="mt-1 space-y-0.5 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground"
          data-testid="work-artifact-view-details"
        >
          <div>Status: {artifact.status}</div>
          {artifact.targetLabel !== undefined ? (
            <div>Target: {artifact.targetLabel}</div>
          ) : null}
          {artifact.channel !== undefined ? (
            <div>Channel: {artifact.channel}</div>
          ) : null}
          {artifact.authorityNote !== undefined ? (
            <div>Why: {artifact.authorityNote}</div>
          ) : null}
          {artifact.sourceCommand !== undefined ? (
            <div>Source: “{artifact.sourceCommand}”</div>
          ) : null}
          {artifact.extractionSource !== undefined ? (
            <div data-testid="work-artifact-extraction-source">
              Extraction: {artifact.extractionSource}
            </div>
          ) : null}
          {artifact.evidence !== undefined && artifact.evidence.length > 0 ? (
            <div className="space-y-0.5" data-testid="work-artifact-evidence">
              <div className="font-medium">Evidence</div>
              {artifact.evidence.map((e, i) => (
                <div key={`${e.field}-${i}`}>
                  • {e.field}: {e.value} ({e.confidence}
                  {e.requires_confirmation === true ? " · needs confirmation" : ""})
                </div>
              ))}
            </div>
          ) : null}
          <div className="italic">Inspect only — nothing is sent or created.</div>
        </div>
      ) : null}
    </div>
  );
}
