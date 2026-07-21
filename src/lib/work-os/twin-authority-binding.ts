// FILE: twin-authority-binding.ts
// PURPOSE: G-02 — Twin authority comes from Foundation (human, org, team,
//          projects, autonomy policy) — never from the role template alone.
//          Preference proposes behavior; authority is granted and capped.
// CONNECTS TO: TwinAuthorityBindingCard, AITeammates overview, FOUNDER G-02.

export const AUTHORITY_FROM_FOUNDATION =
  "Your AI Teammate's authority comes from you and your organization — " +
  "Foundation enforces human access, org policy, team and project scope, and " +
  "behavior policy. The role template recommends skills and defaults; it never " +
  "grants extra access or bypasses your limits.";

export const PREFERENCE_NEQ_AUTHORITY =
  "Preferences and Teach Otzar learning shape how work is done. " +
  "They never add permissions, widen tools, or raise autonomy on their own.";

export const TEMPLATE_RECOMMENDS_ONLY =
  "Role templates recommend skills and a default behavior posture. " +
  "Org policy can cap that recommendation. Admin adjustments are audited. " +
  "Templates do not replace human authority grants.";

export type AuthorityBindingKind =
  | "human_owner"
  | "organization"
  | "team_projects"
  | "behavior_policy"
  | "grants"
  | "role_template_skills";

export interface AuthorityBindingLine {
  kind: AuthorityBindingKind;
  label: string;
  detail: string;
  /** When true, this line is a recommendation — not a grant of access. */
  is_recommendation_only: boolean;
}

export interface AuthorityBindingView {
  doctrine: string;
  preference_note: string;
  template_note: string;
  lines: AuthorityBindingLine[];
  /** Always false — product never claims template grants authority. */
  template_grants_authority: false;
  /** Always true — authority is Foundation-enforced. */
  foundation_enforced: true;
}

export interface TwinAuthorityBindingInput {
  owner_label?: string | null;
  org_name?: string | null;
  autonomy_label?: string | null;
  role_template_label?: string | null;
  active_grant_count?: number | null;
  active_project_count?: number | null;
  skill_count?: number | null;
}

export function buildAuthorityBindingView(
  input: TwinAuthorityBindingInput = {},
): AuthorityBindingView {
  const owner = (input.owner_label ?? "").trim() || "You (the human owner)";
  const org = (input.org_name ?? "").trim() || "Your organization";
  const autonomy =
    (input.autonomy_label ?? "").trim() || "Behavior policy from org settings";
  const template =
    (input.role_template_label ?? "").trim() || "Not set yet";
  const grants =
    typeof input.active_grant_count === "number"
      ? `${input.active_grant_count} active grant${input.active_grant_count === 1 ? "" : "s"} you control`
      : "Grants you create and can revoke anytime";
  const projects =
    typeof input.active_project_count === "number"
      ? `${input.active_project_count} active project${input.active_project_count === 1 ? "" : "s"} in scope`
      : "Projects and teams you belong to";
  const skills =
    typeof input.skill_count === "number"
      ? `${input.skill_count} skill${input.skill_count === 1 ? "" : "s"} from role template (under policy)`
      : "Skills from role template (under policy — not extra access)";

  const lines: AuthorityBindingLine[] = [
    {
      kind: "human_owner",
      label: "Human owner",
      detail: owner,
      is_recommendation_only: false,
    },
    {
      kind: "organization",
      label: "Organization policy",
      detail: org,
      is_recommendation_only: false,
    },
    {
      kind: "team_projects",
      label: "Team & projects",
      detail: projects,
      is_recommendation_only: false,
    },
    {
      kind: "behavior_policy",
      label: "Behavior policy (autonomy)",
      detail: autonomy,
      is_recommendation_only: false,
    },
    {
      kind: "grants",
      label: "Authority grants",
      detail: grants,
      is_recommendation_only: false,
    },
    {
      kind: "role_template_skills",
      label: "Role template (skills only)",
      detail: `${template} · ${skills}`,
      is_recommendation_only: true,
    },
  ];

  return {
    doctrine: AUTHORITY_FROM_FOUNDATION,
    preference_note: PREFERENCE_NEQ_AUTHORITY,
    template_note: TEMPLATE_RECOMMENDS_ONLY,
    lines,
    template_grants_authority: false,
    foundation_enforced: true,
  };
}

/** Guard: never treat a role template string as an authority grant. */
export function templateGrantsAuthority(_template: string | null | undefined): false {
  return false;
}

/** Banned false-complete authority claims in product copy. */
export const AUTHORITY_FALSE_CLAIMS = [
  /template grants full access/i,
  /role template grants authority/i,
  /skills unlock admin rights/i,
  /preference grants permission/i,
  /learning expands authority/i,
  /bypass (org |)policy via template/i,
] as const;

export function copyClaimsFalseAuthority(text: string): boolean {
  return AUTHORITY_FALSE_CLAIMS.some((re) => re.test(text));
}
