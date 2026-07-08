// FILE: RoleScopeProfilePanel.tsx
// PURPOSE: Calm, premium, employee-facing panel for the My Twin
//          role-scope profile (ADR-0053 Wave 2A). Helps the employee
//          understand that their Twin is a SCOPED extension of them --
//          aligned to their role and access, observing permissioned
//          work context (NOT surveillance), and grounded in governed
//          scope to prevent drift. Renders only friendly labels +
//          counts. NEVER renders raw twin ids, role-template body,
//          capability flags, bridge ids, clearance, or memory/vector
//          data, and NEVER uses monitoring/policing/surveillance framing
//          (the only "surveillance" reference is the anti-surveillance
//          assurance).
// CONNECTS TO: src/pages/app/MyTwin.tsx, role-scope label helpers,
//              conversation autonomy label.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labelAutonomyMode } from "@/lib/labels/conversation";
import {
  labelConfigStatus,
  labelObservationMode,
  labelSensitiveActions,
} from "@/lib/labels/roleScope";
import type { MyTwinRoleScopeProfile } from "@/lib/types/foundation";

interface RoleScopeProfilePanelProps {
  profile?: MyTwinRoleScopeProfile | null;
}

export function RoleScopeProfilePanel({ profile }: RoleScopeProfilePanelProps) {
  if (!profile) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="role-scope-empty"
      >
        Role-scope profile is not available yet.
      </p>
    );
  }

  const { role, scope_summary, assistance_profile, governance, continuity } =
    profile;

  return (
    <Card data-testid="role-scope-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Your AI Teammate works within your role and access
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          It supports your work using governed organization knowledge within
          your permitted scope.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Section title="Role alignment">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {role.role_title && <Field label="Role" value={role.role_title} />}
            {role.job_title && (
              <Field label="Job title" value={role.job_title} />
            )}
            {role.department && (
              <Field label="Department" value={role.department} />
            )}
          </dl>
        </Section>

        <Section title="Scope and access">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Scope" value={scope_summary.scope_label} />
            <Field
              label="Access rules"
              value={scope_summary.permission_posture}
            />
            <Field label="Approvals" value={scope_summary.approval_posture} />
            {scope_summary.has_department_scope && (
              <Field
                label="Departments in scope"
                value={String(scope_summary.department_count)}
              />
            )}
          </dl>
        </Section>

        <Section title="How your AI Teammate helps">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Behavior mode"
              value={labelAutonomyMode(assistance_profile.autonomy_mode)}
            />
            <Field
              label="Role template"
              value={labelConfigStatus(assistance_profile.role_template_status)}
            />
            <Field
              label="Skills"
              value={labelConfigStatus(assistance_profile.skills_status)}
            />
          </dl>
          {assistance_profile.current_assistance_boundaries.length > 0 && (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {assistance_profile.current_assistance_boundaries.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Governance">
          <p className="text-sm" data-testid="observation-mode">
            {labelObservationMode(governance.observation_mode)}
          </p>
          <p className="text-sm text-muted-foreground">
            Sensitive actions still require{" "}
            {labelSensitiveActions(governance.sensitive_actions_require)}.
          </p>
          {governance.approver && (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Approver" value={governance.approver.display_name} />
            </dl>
          )}
        </Section>

        <Section title="Continuity and drift prevention">
          <p className="text-sm text-muted-foreground">
            Your AI Teammate helps prevent drift from stale or incomplete context,
            grounded in your governed scope.
          </p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Recent conversations"
              value={String(continuity.recent_conversation_count)}
            />
            <Field
              label="Corrections you've given"
              value={String(continuity.recent_correction_count)}
            />
            <Field
              label="Learning summaries"
              value={String(continuity.recent_learning_summary_count)}
            />
          </dl>
        </Section>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
