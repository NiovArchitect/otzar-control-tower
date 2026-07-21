// FILE: person-type-taxonomy.ts
// PURPOSE: E-03 — distinguish employee / contractor / vendor / customer;
//          observed participation ≠ authority. Pure classification for
//          product badges + deep smoke.
// CONNECTS TO: Users, PeopleDirectory, relationship-edges, FOUNDER E-03.

export type PersonTypeId =
  | "employee"
  | "contractor"
  | "vendor"
  | "customer";

export interface PersonTypeDef {
  id: PersonTypeId;
  label: string;
  plain: string;
  /** True when this type typically holds org employment authority baseline. */
  org_member_default: boolean;
}

export const PERSON_TYPES: readonly PersonTypeDef[] = [
  {
    id: "employee",
    label: "Employee",
    plain: "Org member. Participation still does not expand permissions by itself.",
    org_member_default: true,
  },
  {
    id: "contractor",
    label: "Contractor",
    plain: "Engaged under contract. Needs a sponsor; no automatic full employee authority.",
    org_member_default: true,
  },
  {
    id: "vendor",
    label: "Vendor",
    plain: "External supplier / partner entity person. Tracked carefully; not org authority.",
    org_member_default: false,
  },
  {
    id: "customer",
    label: "Customer",
    plain: "Customer-side contact. Collaboration is governed; never grants internal access.",
    org_member_default: false,
  },
] as const;

export const PARTICIPATION_NEQ_AUTHORITY =
  "Observed participation is not authority. Showing up in a meeting, project, " +
  "or collaboration does not grant permissions, decision rights, tools, or hierarchy power. " +
  "Person type helps Otzar treat people correctly — it never expands what they can do.";

export const E03_DOCTRINE =
  "Otzar distinguishes employees, contractors, vendors, and customers. " +
  "Type is inferred from role and department labels when Foundation has not " +
  "yet shipped a dedicated person-type field. Authority always stays on Access Control, grants, and policy.";

const CONTRACTOR_RE =
  /\b(contractor|contract|consultant|freelance|temp|interim|gig)\b/i;
const VENDOR_RE =
  /\b(vendor|supplier|partner firm|agency|outsource|third[-\s]?party)\b/i;
const CUSTOMER_RE =
  /\b(customer|client|buyer|account contact|external customer)\b/i;

export function classifyPersonType(input: {
  role_title?: string | null;
  department?: string | null;
  job_title?: string | null;
  title?: string | null;
}): PersonTypeId {
  const blob = [
    input.role_title ?? "",
    input.department ?? "",
    input.job_title ?? "",
    input.title ?? "",
  ]
    .join(" ")
    .trim();
  if (blob.length === 0) return "employee";
  // More specific external types first
  if (CUSTOMER_RE.test(blob)) return "customer";
  if (VENDOR_RE.test(blob)) return "vendor";
  if (CONTRACTOR_RE.test(blob)) return "contractor";
  return "employee";
}

export function personTypeLabel(id: PersonTypeId): string {
  return PERSON_TYPES.find((t) => t.id === id)?.label ?? id;
}

export interface PersonTypeInput {
  entity_id: string;
  display_name: string;
  role_title?: string | null;
  department?: string | null;
  job_title?: string | null;
  title?: string | null;
}

export interface PersonTypeView {
  entity_id: string;
  display_name: string;
  person_type: PersonTypeId;
  person_type_label: string;
}

export function classifyPerson(p: PersonTypeInput): PersonTypeView {
  const person_type = classifyPersonType(p);
  return {
    entity_id: p.entity_id,
    display_name: p.display_name,
    person_type,
    person_type_label: personTypeLabel(person_type),
  };
}

export interface PersonTypeInventory {
  total: number;
  by_type: Record<PersonTypeId, number>;
  types_present: PersonTypeId[];
  multi_type: boolean;
}

export function inventoryPersonTypes(
  people: PersonTypeInput[],
): PersonTypeInventory {
  const by_type: Record<PersonTypeId, number> = {
    employee: 0,
    contractor: 0,
    vendor: 0,
    customer: 0,
  };
  for (const p of people) {
    by_type[classifyPersonType(p)] += 1;
  }
  const types_present = (Object.keys(by_type) as PersonTypeId[]).filter(
    (k) => by_type[k] > 0,
  );
  return {
    total: people.length,
    by_type,
    types_present,
    multi_type: types_present.length >= 2,
  };
}

/** Participation signals must never be treated as authority grants. */
export function participationImpliesAuthority(): false {
  return false;
}
