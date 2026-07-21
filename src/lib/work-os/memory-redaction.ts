// FILE: memory-redaction.ts
// PURPOSE: H-02 residual — full redaction stress corpus so raw confidential
//          source never enters reusable portable memory as plain text.
// CONNECTS TO: PortableCoreCard, MemoryRedactionCard, isSafePortablePlain,
//          FOUNDER H-02.

import { isSafePortablePlain } from "@/lib/work-os/portable-core";

export const H02_REDACTION_DOCTRINE =
  "Reusable memory holds how you work — never raw confidential source. " +
  "Secrets, customer substance, credentials, and source excerpts must fail " +
  "the portable-safety check and stay out of the personal core.";

/**
 * Stress corpus: strings that must NEVER pass portable safety.
 * Expand when pressure finds new leak classes (R-02 regress).
 */
export const REDACTION_STRESS_CORPUS: readonly {
  id: string;
  sample: string;
  class: string;
}[] = [
  { id: "customer-secret", sample: "Contains customer secret about Acme deal", class: "customer" },
  { id: "ssn", sample: "Employee SSN 123-45-6789 on file", class: "pii" },
  { id: "salary", sample: "Salary band confidential for eng ladder", class: "hr" },
  { id: "api-key", sample: "Rotate the production API key tonight", class: "credential" },
  { id: "password", sample: "Shared password for the vendor portal", class: "credential" },
  { id: "conf-doc", sample: "Attach the confidential document from Drive", class: "document" },
  { id: "export-twin", sample: "Export twin package and take this with you", class: "false-portability" },
  { id: "portable-today", sample: "Your twin is portable today without consent", class: "false-portability" },
  { id: "nda-body", sample: "Paste full NDA body into memory: confidential document clause 4", class: "legal" },
  { id: "bank-routing", sample: "Wire using bank routing 021000021 and account password", class: "financial" },
  { id: "oauth-token", sample: "Bearer oauth token eyJhbGciOi is an api key residual", class: "credential" },
  { id: "medical", sample: "Patient SSN and diagnosis in customer secret note", class: "pii" },
] as const;

/** Safe method-style preferences that must still pass. */
export const SAFE_PREFERENCE_SAMPLES: readonly string[] = [
  "Prefer bullets in status updates",
  "Lead with decision and impact",
  "Draft before external send",
  "Use calendar holds for deep work",
];

export function stressCorpusAllRejected(
  corpus: readonly { sample: string }[] = REDACTION_STRESS_CORPUS,
): { ok: boolean; leaked: string[] } {
  const leaked: string[] = [];
  for (const row of corpus) {
    if (isSafePortablePlain(row.sample)) leaked.push(row.sample);
  }
  return { ok: leaked.length === 0, leaked };
}

export function safeSamplesAllAccepted(
  samples: readonly string[] = SAFE_PREFERENCE_SAMPLES,
): { ok: boolean; rejected: string[] } {
  const rejected: string[] = [];
  for (const s of samples) {
    if (!isSafePortablePlain(s)) rejected.push(s);
  }
  return { ok: rejected.length === 0, rejected };
}

export type LivePreferenceScan = {
  total: number;
  unsafe: number;
  unsafe_ids: string[];
  clean: boolean;
};

/** Scan classified portable rows for residual confidential plain text. */
export function scanPreferencesForUnsafePlain(
  rows: Array<{ correction_id: string; plain: string; ownership?: string }>,
): LivePreferenceScan {
  const unsafe_ids: string[] = [];
  for (const r of rows) {
    // Org-bound may still be sensitive; portable must be clean.
    if (r.ownership === "org_bound") continue;
    if (!isSafePortablePlain(r.plain)) unsafe_ids.push(r.correction_id);
  }
  return {
    total: rows.length,
    unsafe: unsafe_ids.length,
    unsafe_ids,
    clean: unsafe_ids.length === 0,
  };
}

export const H02_REDACTION_RESIDUAL =
  "Continuous redaction stress expands when new leak classes are found under " +
  "pressure. Core corpus is product-locked; auto-file from production incidents " +
  "remains R-02 process residual.";
