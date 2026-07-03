// FILE: role-template.ts
// PURPOSE: [GAP-H] One honest label for a twin's STORED role template
//          (TwinConfig.role_template — the slug Foundation actually applied
//          at provisioning and reads for the twin's conduct persona). The
//          AI Teammates surface must render this stored truth, never a
//          client-side guess from the owner's job title (the page-invents-
//          its-own-truth failure the role-template audit exposed).
// CONNECTS TO: src/pages/AITeammates.tsx, Foundation TwinConfig.role_template.

/** "account-executive" -> "Account Executive"; null/empty -> honest state. */
export function roleTemplateLabel(roleTemplate: string | null | undefined): string {
  if (typeof roleTemplate !== "string" || roleTemplate.trim().length === 0) {
    return "Not set yet";
  }
  return roleTemplate
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}
