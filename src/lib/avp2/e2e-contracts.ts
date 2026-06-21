// FILE: src/lib/avp2/e2e-contracts.ts
// PURPOSE: OTZAR-E2E-1 — the Otzar-side mirror of the AVP² end-to-end contracts
//          (AVP2_END_TO_END_INTENT / AVP2_END_TO_END_RESULT) that niov-avp's
//          `e2e:otzar-avp2` runner emits and Federation Cloud's /avp2/e2e consumes.
//          Otzar is the user/work interface: it CREATES a governed-access intent and
//          DISPLAYS a result — it performs no external writes, calls no hosted network,
//          uses no real payment, and claims live proof ONLY when a result's provenance
//          is LIVE_LOCAL_RUN. Field names match the runner/Federation Cloud verbatim so
//          the projection is shared. Pure, local, read-only.
//
//          AVP² = Agent Verification & Payment Protocol.
//          The agent does not scrape the website. The agent asks for a quote.
// CONNECTS TO: src/lib/avp2/e2e-display.ts, src/lib/connectors/avp2-governed-access.ts,
//          src/components/otzar/Avp2GovernedAccessCard.tsx, niov-avp
//          apps/publisher-gateway/src/avp2-e2e-runner.ts.

export const E2E_INTENT_SCHEMA = "AVP2_END_TO_END_INTENT";
export const E2E_INTENT_VERSION = "0.1";
export const E2E_RESULT_SCHEMA = "AVP2_END_TO_END_RESULT";
export const E2E_RESULT_VERSION = "0.1";

export type ResourceType = "CONTENT_FRAGMENT" | "ACTION";
export type StepStatus = "PASS" | "SKIP" | "FAIL";
export type OverallStatus = "PASS" | "SKIP" | "FAIL";
// Union of the runner (niov-avp) and Federation Cloud provenances.
export type Provenance =
  | "LIVE_LOCAL_RUN" | "DRY_RUN" | "SKIP_NO_LOCAL_FOUNDATION" | "FAIL"
  | "EVIDENCE_DERIVED" | "REHEARSAL";

export const ALLOWED_PROVENANCES: readonly Provenance[] = [
  "LIVE_LOCAL_RUN", "DRY_RUN", "SKIP_NO_LOCAL_FOUNDATION", "FAIL", "EVIDENCE_DERIVED", "REHEARSAL",
];

export interface E2ERequestedResource {
  gateway_id: string;
  resource_id: string;
  resource_type: ResourceType;
  selector: string;
}
export interface E2EGovernance {
  foundation_backed: boolean;
  quote_required: boolean;
  proof_required: boolean;
  real_payment: boolean;
  public_listing: boolean;
  production_data: boolean;
  private_user_data?: boolean;
}
export interface E2EIntent {
  intent_schema: string;
  intent_schema_version: string;
  origin: "otzar";
  intent_type: "REQUEST_GOVERNED_ACCESS";
  requested_resource: E2ERequestedResource;
  governance: E2EGovernance;
}

export interface E2EResultSteps {
  intent_created: StepStatus;
  foundation_seed_or_existing_listing: StepStatus;
  discover: StepStatus;
  quote: StepStatus;
  accept: StepStatus;
  access_receipt: StepStatus;
  proof: StepStatus;
  evidence_pack: StepStatus;
  federation_cloud_visible: StepStatus;
}
export interface E2EResultSummary {
  discovered: boolean;
  quoted: boolean;
  accepted: boolean;
  accessed: boolean;
  proof_resolved: boolean;
  delivered: boolean;
}
export interface E2EFederationCloud {
  evidence_route: string;
  timeline_route: string;
  registry_route: string;
  e2e_route?: string;
}
export interface E2EOtzarDisplay { title: string; message: string; next_action: string }

export interface E2EResult {
  result_schema: string;
  result_schema_version: string;
  origin: "otzar";
  status: OverallStatus;
  provenance: Provenance;
  proof_level: string | null;
  steps: E2EResultSteps;
  summary: E2EResultSummary;
  federation_cloud: E2EFederationCloud;
  otzar_display: E2EOtzarDisplay;
}

export interface Issue { code: string; message: string }
export interface Validation { ok: boolean; errors: Issue[]; warnings: Issue[] }

// Lowercased secret markers that must never appear in an intent or a result.
export const E2E_FORBIDDEN_MARKERS = [
  "authorization:", "bearer ", "access_token", "token_hash", "private_key", "sk_live", "sk_test",
  "wallet_private_key", "content body", "proof body", "raw foundation response",
] as const;

export function e2eMarkerHits(text: string): string[] {
  const lower = text.toLowerCase();
  return E2E_FORBIDDEN_MARKERS.filter((m) => lower.includes(m)).map((m) => m.trim());
}

export const FC_DEFAULT_ROUTES: E2EFederationCloud = {
  evidence_route: "/avp2/evidence",
  timeline_route: "/avp2/evidence/timeline",
  registry_route: "/avp2/registry",
  e2e_route: "/avp2/e2e",
};

// ── Intent ───────────────────────────────────────────────────────────────────

export interface CreateIntentInput {
  gateway_id?: string;
  resource_id?: string;
  resource_type?: ResourceType;
  selector?: string;
}

// WHAT: build a safe governed-access intent (defaults match the niov-avp demo
//       fixture). Governance is locked safe: foundation-backed + quote + proof
//       required; no real payment / public listing / production / private data.
export function createAvp2GovernedAccessIntent(input: CreateIntentInput = {}): E2EIntent {
  return {
    intent_schema: E2E_INTENT_SCHEMA,
    intent_schema_version: E2E_INTENT_VERSION,
    origin: "otzar",
    intent_type: "REQUEST_GOVERNED_ACCESS",
    requested_resource: {
      gateway_id: input.gateway_id ?? "demo-publisher-gateway",
      resource_id: input.resource_id ?? "demo-content-fragment",
      resource_type: input.resource_type ?? "CONTENT_FRAGMENT",
      selector: input.selector ?? "paragraph_range:12-15",
    },
    governance: {
      foundation_backed: true,
      quote_required: true,
      proof_required: true,
      real_payment: false,
      public_listing: false,
      production_data: false,
      private_user_data: false,
    },
  };
}

// WHAT: validate a governed-access intent — safe governance + no secret markers.
export function validateAvp2EndToEndIntent(input: unknown): Validation {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    errors.push({ code: "INTENT_NOT_OBJECT", message: "Intent is not a JSON object." });
    return { ok: false, errors, warnings };
  }
  const i = input as Partial<E2EIntent>;
  if (i.intent_schema !== E2E_INTENT_SCHEMA) errors.push({ code: "WRONG_SCHEMA", message: `Expected intent_schema ${E2E_INTENT_SCHEMA}.` });
  if (i.intent_schema_version !== E2E_INTENT_VERSION) warnings.push({ code: "UNSUPPORTED_VERSION", message: `Expected version ${E2E_INTENT_VERSION}.` });
  if (i.origin !== "otzar") warnings.push({ code: "UNEXPECTED_ORIGIN", message: "origin should be 'otzar'." });
  if (i.intent_type !== "REQUEST_GOVERNED_ACCESS") errors.push({ code: "UNSUPPORTED_INTENT_TYPE", message: "intent_type must be REQUEST_GOVERNED_ACCESS." });

  const r = (typeof i.requested_resource === "object" && i.requested_resource !== null ? i.requested_resource : {}) as Partial<E2ERequestedResource>;
  if (typeof r.gateway_id !== "string" || r.gateway_id.length === 0) errors.push({ code: "MISSING_GATEWAY_ID", message: "requested_resource.gateway_id is required." });
  if (typeof r.resource_id !== "string" || r.resource_id.length === 0) errors.push({ code: "MISSING_RESOURCE_ID", message: "requested_resource.resource_id is required." });
  if (r.resource_type !== "CONTENT_FRAGMENT" && r.resource_type !== "ACTION") errors.push({ code: "BAD_RESOURCE_TYPE", message: "resource_type must be CONTENT_FRAGMENT or ACTION." });

  const g = (typeof i.governance === "object" && i.governance !== null ? i.governance : {}) as Partial<E2EGovernance>;
  if (g.foundation_backed !== true) errors.push({ code: "NOT_FOUNDATION_BACKED", message: "governance.foundation_backed must be true." });
  if (g.quote_required !== true) errors.push({ code: "QUOTE_NOT_REQUIRED", message: "governance.quote_required must be true." });
  if (g.proof_required !== true) errors.push({ code: "PROOF_NOT_REQUIRED", message: "governance.proof_required must be true." });
  if (g.real_payment === true) errors.push({ code: "REAL_PAYMENT_TRUE", message: "governance.real_payment must be false." });
  if (g.public_listing === true) errors.push({ code: "PUBLIC_LISTING_TRUE", message: "governance.public_listing must be false." });
  if (g.production_data === true) errors.push({ code: "PRODUCTION_DATA_TRUE", message: "governance.production_data must be false." });
  if (g.private_user_data === true) errors.push({ code: "PRIVATE_USER_DATA_TRUE", message: "governance.private_user_data must be false." });

  for (const m of e2eMarkerHits(safeStringify(input))) errors.push({ code: "UNSAFE_MARKER", message: `Forbidden marker present: ${m}` });
  return { ok: errors.length === 0, errors, warnings };
}

// ── Result ───────────────────────────────────────────────────────────────────

function safeStringify(v: unknown): string { try { return JSON.stringify(v); } catch { return ""; } }

// WHAT: recursively detect a key set to `true` anywhere in an object (used to refuse
//       any embedded real_payment / public_listing / production_data / private_user_data).
function hasTrueKey(node: unknown, keys: readonly string[]): boolean {
  if (Array.isArray(node)) return node.some((v) => hasTrueKey(v, keys));
  if (typeof node === "object" && node !== null) {
    for (const [k, v] of Object.entries(node)) {
      if (keys.includes(k) && v === true) return true;
      if (hasTrueKey(v, keys)) return true;
    }
  }
  return false;
}

// WHAT: validate a runner result. Refuses production proof, real payment, public
//       listing, production/private data, unknown provenance, and secret markers.
//       Never trusts the result — it is re-validated every time it is loaded.
export function validateAvp2EndToEndResult(input: unknown): Validation {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    errors.push({ code: "RESULT_NOT_OBJECT", message: "Result is not a JSON object." });
    return { ok: false, errors, warnings };
  }
  const r = input as Partial<E2EResult> & Record<string, unknown>;
  if (r.result_schema !== E2E_RESULT_SCHEMA) errors.push({ code: "WRONG_SCHEMA", message: `Expected result_schema ${E2E_RESULT_SCHEMA}.` });
  if (r.result_schema_version !== E2E_RESULT_VERSION) warnings.push({ code: "UNSUPPORTED_VERSION", message: `Expected version ${E2E_RESULT_VERSION}.` });
  if (r.status !== "PASS" && r.status !== "SKIP" && r.status !== "FAIL") errors.push({ code: "BAD_STATUS", message: "status must be PASS | SKIP | FAIL." });
  if (typeof r.provenance !== "string" || !ALLOWED_PROVENANCES.includes(r.provenance as Provenance)) errors.push({ code: "BAD_PROVENANCE", message: "provenance is not a known value." });

  if (r.proof_level === "PRODUCTION_LIVE") errors.push({ code: "PRODUCTION_PROOF_REFUSED", message: "proof_level PRODUCTION_LIVE is never accepted." });
  if (hasTrueKey(r, ["production_live_pass", "public_certification"])) errors.push({ code: "PRODUCTION_CLAIM_REFUSED", message: "Production/certification claims are refused." });
  if (hasTrueKey(r, ["real_payment"])) errors.push({ code: "REAL_PAYMENT_REFUSED", message: "real_payment true is refused." });
  if (hasTrueKey(r, ["public_listing"])) errors.push({ code: "PUBLIC_LISTING_REFUSED", message: "public_listing true is refused." });
  if (hasTrueKey(r, ["production_data"])) errors.push({ code: "PRODUCTION_DATA_REFUSED", message: "production_data true is refused." });
  if (hasTrueKey(r, ["private_user_data"])) errors.push({ code: "PRIVATE_USER_DATA_REFUSED", message: "private_user_data true is refused." });

  const sec = r.security as Record<string, unknown> | undefined;
  if (sec !== undefined && sec.secrets_redacted === false) errors.push({ code: "SECRETS_NOT_REDACTED", message: "Result reports secrets were not redacted." });

  for (const m of e2eMarkerHits(safeStringify(input))) errors.push({ code: "UNSAFE_MARKER", message: `Forbidden marker present: ${m}` });
  return { ok: errors.length === 0, errors, warnings };
}

export function serializeIntent(intent: E2EIntent): string { return JSON.stringify(intent, null, 2); }
