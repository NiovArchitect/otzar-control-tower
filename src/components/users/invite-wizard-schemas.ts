// FILE: invite-wizard-schemas.ts
// PURPOSE: Co-located zod schemas and inferred value types for the
//          3-step Dandelion invite wizard. Lives in its own file so
//          the wizard component files satisfy react-refresh's
//          "components-only export" rule.
// CONNECTS TO: InviteWizardStep1Capture, InviteWizard.

import { z } from "zod";

export const relationshipTypeSchema = z.enum([
  "employee",
  "contractor",
  "consultant",
  "external_collaborator",
]);

export type RelationshipType = z.infer<typeof relationshipTypeSchema>;

export const captureSchema = z.object({
  email: z.string().email("Enter a valid work email"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  role_title: z.string().min(1, "Title is required"),
  // Who is joining: employee / contractor / consultant / external.
  relationship_type: relationshipTypeSchema,
  // Place in the org: team (department) + manager or sponsor.
  department: z.string(),
  manager_entity_id: z.string(),
  is_admin: z.boolean(),
});

export type CaptureValues = z.infer<typeof captureSchema>;
