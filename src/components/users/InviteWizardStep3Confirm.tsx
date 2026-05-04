// FILE: InviteWizardStep3Confirm.tsx
// PURPOSE: Step 3 of the 3-step Dandelion invite wizard. The
//          audit-aware confirm fires POST /org/onboarding/invite
//          (Phase 3 commit) which mints the twin and writes the
//          ADMIN_ACTION (ONBOARDING_INVITE_ACCEPTED) audit row.
// CONNECTS TO: InviteWizard (parent), AuditAwareButton,
//              api.org.onboarding.invite.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditAwareButton } from "@/components/audit/AuditAwareButton";
import { api } from "@/lib/api";

interface InviteWizardStep3ConfirmProps {
  newEntityId: string;
  newDisplayName: string;
  newEmail: string;
  isAdmin: boolean;
  onCompleted: () => void;
}

export function InviteWizardStep3Confirm({
  newEntityId,
  newDisplayName,
  newEmail,
  isAdmin,
  onCompleted,
}: InviteWizardStep3ConfirmProps) {
  const targetDescription = `${newDisplayName} (${newEmail}) as ${isAdmin ? "an admin" : "a team member"}`;
  const confirmationDescription = `This will activate ${newDisplayName} (${newEmail}) as ${
    isAdmin ? "an admin" : "a team member"
  } in your organization. A Digital Twin will be minted and an activation link will be issued.`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ready to invite</CardTitle>
          <CardDescription>
            Phase 2 analysis is complete. Confirming sends the activation
            link and mints the AI Teammate.
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
            {isAdmin ? "Admin" : "Team member"}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <AuditAwareButton
          variant="primary"
          auditEventType="ADMIN_ACTION"
          auditActionLabel="ONBOARDING_INVITE_ACCEPTED"
          requireConfirmation
          confirmationTitle="Send invite?"
          confirmationDescription={confirmationDescription}
          targetDescription={targetDescription}
          onConfirm={async () => {
            const r = await api.org.onboarding.invite(newEntityId);
            if (!r.ok) {
              return { ok: false, error: r.message };
            }
            onCompleted();
            return { ok: true, audit_event_id: r.data.audit_event_id };
          }}
        >
          Confirm and send invite
        </AuditAwareButton>
      </div>
    </div>
  );
}
