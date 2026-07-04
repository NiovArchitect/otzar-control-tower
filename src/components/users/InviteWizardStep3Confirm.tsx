// FILE: InviteWizardStep3Confirm.tsx
// PURPOSE: Step 3 of the 3-step Dandelion invite wizard. The
//          audit-aware confirm fires POST /org/onboarding/invite
//          (Phase 3 commit) which mints the twin and writes the
//          ADMIN_ACTION (ONBOARDING_INVITE_ACCEPTED) audit row.
// CONNECTS TO: InviteWizard (parent), AuditAwareButton,
//              api.org.onboarding.invite.

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditAwareButton } from "@/components/audit/AuditAwareButton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

import { resolveRoleArchetype } from "@/lib/role-archetypes";
import type { CaptureValues } from "./invite-wizard-schemas";

interface InviteWizardStep3ConfirmProps {
  /** PROD-MODEL-P2 — the captured placement, shown before confirm. */
  captured: CaptureValues | null;
  newEntityId: string;
  newDisplayName: string;
  newEmail: string;
  isAdmin: boolean;
  onCompleted: () => void;
}

export function InviteWizardStep3Confirm({
  captured,
  newEntityId,
  newDisplayName,
  newEmail,
  isAdmin,
  onCompleted,
}: InviteWizardStep3ConfirmProps) {
  // [P0-ONBOARD] the one-time activation link. Held in state ONLY until the
  // admin clicks Done — never persisted, never re-displayable.
  const [activation, setActivation] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const targetDescription = `${newDisplayName} (${newEmail}) as ${isAdmin ? "an admin" : "a team member"}`;
  const confirmationDescription = `This will invite ${newDisplayName} (${newEmail}) as ${
    isAdmin ? "an admin" : "a team member"
  }. A Digital Twin is minted and a one-time activation link is issued for you to share securely — no email is sent.`;

  if (activation !== null) {
    return (
      <div className="space-y-4" data-testid="invite-activation-reveal">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {newDisplayName} is invited — share their activation link
            </CardTitle>
            <CardDescription>
              Share this securely with the invitee. This link expires{" "}
              {new Date(activation.expiresAt).toLocaleDateString()} and can
              only be used once. It won&apos;t be shown again — you can
              generate a new one from the Users list if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p
              className="break-all rounded-md border border-border bg-muted p-2 font-mono text-xs"
              data-testid="invite-activation-link"
            >
              {activation.url}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                data-testid="invite-activation-copy"
                onClick={() => {
                  void navigator.clipboard.writeText(activation.url);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy activation link"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                data-testid="invite-activation-done"
                onClick={() => onCompleted()}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ready to invite</CardTitle>
          <CardDescription>
            Confirming mints the AI Teammate and creates a one-time
            activation link you can copy and share securely — no email is
            sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Member: </span>
            {newDisplayName}
          </p>
          <p>
            <span className="font-medium">Email: </span>
            {newEmail}
          </p>
          <p>
            <span className="font-medium">Role: </span>
            {isAdmin ? "Organization admin" : "Team member"}
          </p>
          {/* PROD-MODEL-P2 — the placement this invite prepared. */}
          {captured !== null ? (
            <div className="space-y-1" data-testid="invite-placement-summary">
              <p>
                <span className="font-medium">Title: </span>
                {captured.role_title}
              </p>
              {captured.department.trim().length > 0 ? (
                <p>
                  <span className="font-medium">Department: </span>
                  {captured.department}
                </p>
              ) : null}
              {resolveRoleArchetype(captured.role_title) !== null ? (
                <p data-testid="invite-role-template-line">
                  <span className="font-medium">Role template: </span>
                  {resolveRoleArchetype(captured.role_title)!.display_name}
                </p>
              ) : null}
              <p className="text-muted-foreground">
                Their AI teammate is prepared with this role when the invite
                is confirmed, and every step is recorded in the audit trail.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <AuditAwareButton
          variant="primary"
          auditEventType="ADMIN_ACTION"
          auditActionLabel="ONBOARDING_INVITE_ACCEPTED"
          requireConfirmation
          confirmationTitle="Invite this member?"
          confirmationDescription={confirmationDescription}
          targetDescription={targetDescription}
          onConfirm={async () => {
            const r = await api.org.onboarding.invite(newEntityId);
            if (!r.ok) {
              return { ok: false, error: r.message };
            }
            // [P0-ONBOARD] hold the one-time link for the reveal card below;
            // the wizard closes only when the admin clicks Done.
            setActivation({
              url: `${window.location.origin}/activate?token=${r.data.activation_token}`,
              expiresAt: r.data.activation_expires_at,
            });
            return { ok: true, audit_event_id: r.data.audit_event_id };
          }}
        >
          Confirm and invite
        </AuditAwareButton>
      </div>
    </div>
  );
}
