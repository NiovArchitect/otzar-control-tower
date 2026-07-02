// FILE: invite-wizard-schemas.ts
// PURPOSE: Co-located zod schemas and inferred value types for the
//          3-step Dandelion invite wizard. Lives in its own file so
//          the wizard component files satisfy react-refresh's
//          "components-only export" rule.
// CONNECTS TO: InviteWizardStep1Capture, InviteWizard.

import { z } from "zod";

export const captureSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  role_title: z.string().min(1, "Title is required"),
  // PROD-MODEL-P2 — place the person in the org at creation time.
  // Department is free text ("Engineering", "Marketing"); manager is a
  // STABLE entity id chosen from a name+email select (duplicate display
  // names can never mis-assign). Both optional — a top-level hire has
  // neither.
  department: z.string(),
  manager_entity_id: z.string(),
  is_admin: z.boolean(),
});

export type CaptureValues = z.infer<typeof captureSchema>;
