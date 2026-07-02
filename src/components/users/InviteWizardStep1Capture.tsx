// FILE: InviteWizardStep1Capture.tsx
// PURPOSE: Step 1 of the 3-step Dandelion invite wizard. Captures
//          email + names + role + admin flag and creates the pending
//          member entity via POST /org/members. The audit-aware
//          submit is the moment the org_member_added audit row is
//          written.
// CONNECTS TO: InviteWizard (parent orchestrator), AuditAwareForm,
//              api.org.members.create.
//
// PASSWORD POSTURE (decision #21):
// No password field is rendered. api.org.members.create injects a
// random 32-char placeholder via generateRandomPassword(). The
// invitee never sees that value -- their real onboarding path is
// Phase3Result.activation_credential delivered by Phase 3.

import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { AuditAwareForm } from "@/components/audit/AuditAwareForm";
import { resolveRoleArchetype } from "@/lib/role-archetypes";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import {
  captureSchema,
  type CaptureValues,
} from "./invite-wizard-schemas";

interface InviteWizardStep1CaptureProps {
  defaultValues: CaptureValues;
  onCaptured: (values: CaptureValues, entity_id: string) => void;
}

function CaptureFields() {
  const form = useFormContext<CaptureValues>();
  // Manager options: name + email labels over STABLE entity ids (duplicate
  // display names can never mis-assign). Same source Members uses.
  const peopleQuery = useQuery({
    queryKey: ["org", "entities", { type: "PERSON", take: 250 }],
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      if (!r.ok) throw new Error(r.message);
      return r.data.items;
    },
  });
  const people = peopleQuery.data ?? [];
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" autoComplete="off" {...field} />
            </FormControl>
            <FormDescription>
              The new member receives an activation link at this address.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="role_title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormDescription>
              The member's title (e.g., "Marketing Manager"). Otzar uses it
              to prepare their AI teammate with the matching role behavior.
              {resolveRoleArchetype(field.value) !== null ? (
                <span className="block text-foreground" data-testid="invite-role-template-preview">
                  Role template: {resolveRoleArchetype(field.value)!.display_name}
                </span>
              ) : null}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* PROD-MODEL-P2 — place the person in the org at creation time. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department / team</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Engineering" {...field} data-testid="invite-department" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="manager_entity_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reports to</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={field.value}
                  onChange={field.onChange}
                  data-testid="invite-manager-select"
                >
                  <option value="">No manager (top level)</option>
                  {people.map((p) => (
                    <option key={p.entity_id} value={p.entity_id}>
                      {p.display_name}
                      {p.email ? ` (${p.email})` : ""}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="is_admin"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Grant admin capabilities</FormLabel>
              <FormDescription>
                Admins can manage members, AI teammates, and access
                control. Their AI teammate gets executive-override
                autonomy by default.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}

export function InviteWizardStep1Capture({
  defaultValues,
  onCaptured,
}: InviteWizardStep1CaptureProps) {
  return (
    <AuditAwareForm
      variant="primary"
      auditEventType="ADMIN_ACTION"
      auditActionLabel="ORG_MEMBER_ADDED"
      formSchema={captureSchema}
      defaultValues={defaultValues}
      submitLabel="Continue to review"
      onSubmit={async (values) => {
        const r = await api.org.members.create({
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          role_title: values.role_title,
          is_admin: values.is_admin,
        });
        if (!r.ok) {
          return { ok: false, error: r.message };
        }
        // PROD-MODEL-P2 — place the person in the org at creation time
        // through the SAME governed assign rail the Reporting editor uses
        // (audited; cycle-safe; stable ids). A failure here is surfaced
        // honestly — the member exists, so the admin finishes placement
        // in "Reporting structure" rather than retrying the invite.
        if (values.manager_entity_id.length > 0 || values.department.trim().length > 0) {
          const h = await api.org.hierarchy.assign({
            person_entity_id: r.data.entity_id,
            manager_entity_id:
              values.manager_entity_id.length > 0 ? values.manager_entity_id : null,
            role_title: values.role_title,
            ...(values.department.trim().length > 0
              ? { department: values.department.trim() }
              : {}),
          });
          if (!h.ok) {
            onCaptured(values, r.data.entity_id);
            return {
              ok: false,
              error:
                "The member was created, but their reporting placement couldn't be saved. Continue the invite, then set it from the Reporting structure card on Members.",
            };
          }
        }
        // Pull the entity_id forward to wizard state so Step 2 can
        // locate it inside the Phase 2 propagation_order response.
        onCaptured(values, r.data.entity_id);
        return { ok: true, audit_event_id: r.data.audit_event_id };
      }}
    >
      <CaptureFields />
    </AuditAwareForm>
  );
}
