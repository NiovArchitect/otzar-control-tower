// FILE: csv-import.ts
// PURPOSE: [GAP-U SLICE-2] Pure CSV parsing + validation for the guided
//          people import. LEAST ACCESS BY CONSTRUCTION: the only columns
//          that can ever reach the wire are full_name, email, title,
//          department, and manager_email. Forbidden columns (password,
//          admin, permissions, tools, autonomy, scopes) are DETECTED and
//          refused with calm copy — they are never parsed into row data,
//          so no code path can submit them. role_template is parsed for
//          PREVIEW ONLY in this slice (validated against the role
//          archetypes; assigned later from AI Teammates — no write).
//          Every validation message is repair-oriented human copy.
// CONNECTS TO: src/pages/ImportPeople.tsx (the guided flow),
//          src/lib/role-archetypes.ts (role_template preview validation),
//          tests/unit/csv-import.test.ts.

import { resolveRoleArchetype } from "@/lib/role-archetypes";

/** Hard cap per batch — keeps one import inside the admin rate budget
 *  (1 bulk call + ≤N invites + ≤N manager mappings per minute). */
export const IMPORT_ROW_CAP = 20;

export const REQUIRED_HEADERS = ["full_name", "email"] as const;
export const OPTIONAL_HEADERS = ["title", "department", "manager_email", "role_template"] as const;

/** Columns that must NEVER import — authority, credentials, scopes. */
const FORBIDDEN_HEADERS = new Set([
  "password", "admin", "is_admin", "authority", "permissions", "permission",
  "tools", "tool_access", "autonomy", "autonomy_level", "data_scope",
  "clearance", "clearance_level", "connector", "wallet",
]);

export const CSV_TEMPLATE =
  "full_name,email,title,department,manager_email,role_template\n" +
  "Dana Rivera,dana@yourcompany.com,Customer Success Lead,Customer Success,alex@yourcompany.com,\n" +
  "Alex Kim,alex@yourcompany.com,VP Operations,Operations,,\n";

export interface ImportRow {
  line: number;
  full_name: string;
  email: string;
  title?: string | undefined;
  department?: string | undefined;
  manager_email?: string | undefined;
  /** Preview-only in this slice — never written at import time. */
  role_template?: string | undefined;
}

export interface RowIssue {
  line: number;
  /** Calm, repair-oriented sentence. */
  message: string;
  blocking: boolean;
}

export interface ParseResult {
  rows: ImportRow[];
  issues: RowIssue[];
  /** File-level problems (headers, caps, forbidden columns). */
  fileIssues: string[];
  /** Non-blocking notes ("role templates preview only", ignored columns). */
  notes: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimal RFC-ish CSV line splitter with double-quote support. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export function parsePeopleCsv(text: string, existingEmails: Set<string>): ParseResult {
  const fileIssues: string[] = [];
  const notes: string[] = [];
  const issues: RowIssue[] = [];
  const rows: ImportRow[] = [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows, issues, notes, fileIssues: ["The file is empty. Download the template to see the expected columns."] };
  }

  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      fileIssues.push(`The "${required}" column is required. Add it (see the template) and try again.`);
    }
  }
  const forbidden = headers.filter((h) => FORBIDDEN_HEADERS.has(h));
  if (forbidden.length > 0) {
    fileIssues.push(
      `This file includes ${forbidden.map((f) => `"${f}"`).join(", ")} — Otzar never imports passwords, authority, or tool access from a file. Remove ${forbidden.length === 1 ? "that column" : "those columns"} to continue. Everyone starts with minimum access.`,
    );
  }
  const known = new Set<string>([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);
  const ignored = headers.filter((h) => !known.has(h) && !FORBIDDEN_HEADERS.has(h));
  if (ignored.length > 0) {
    notes.push(
      `${ignored.map((c) => `"${c}"`).join(", ")} ${ignored.length === 1 ? "isn't" : "aren't"} supported yet and will be ignored.`,
    );
  }
  if (fileIssues.length > 0) return { rows, issues, notes, fileIssues };

  const dataLines = lines.slice(1);
  if (dataLines.length === 0) {
    return { rows, issues, notes, fileIssues: ["The file has headers but no people. Add at least one row."] };
  }
  if (dataLines.length > IMPORT_ROW_CAP) {
    return {
      rows, issues, notes,
      fileIssues: [
        `This file has ${dataLines.length} people. Import up to ${IMPORT_ROW_CAP} at a time — split the file and run another batch right after.`,
      ],
    };
  }

  const col = (name: string) => headers.indexOf(name);
  const seenEmails = new Map<string, number>();

  for (let i = 0; i < dataLines.length; i++) {
    const line = i + 2; // 1-based + header
    const cells = splitCsvLine(dataLines[i]!);
    const get = (name: string): string | undefined => {
      const idx = col(name);
      const v = idx >= 0 ? (cells[idx] ?? "").trim() : "";
      return v.length > 0 ? v : undefined;
    };
    const fullName = get("full_name");
    const emailRaw = get("email");
    const email = emailRaw?.toLowerCase();

    if (fullName === undefined && email === undefined) continue; // blank-ish row
    if (fullName === undefined) {
      issues.push({ line, blocking: true, message: `Row ${line}: the name is missing. Every person needs a full name.` });
      continue;
    }
    if (email === undefined || !EMAIL_RE.test(email)) {
      issues.push({
        line, blocking: true,
        message: `Row ${line} (${fullName}): "${emailRaw ?? ""}" doesn't look like an email address. Fix it before importing.`,
      });
      continue;
    }
    const firstSeen = seenEmails.get(email);
    if (firstSeen !== undefined) {
      issues.push({
        line, blocking: true,
        message: `Row ${line}: ${email} appears twice in this file (also row ${firstSeen}). Keep one row before importing.`,
      });
      continue;
    }
    seenEmails.set(email, line);
    if (existingEmails.has(email)) {
      issues.push({
        line, blocking: true,
        message: `Row ${line}: ${email} is already a member of your organization — this row will be skipped. Manage them from Users.`,
      });
      continue;
    }
    const roleTemplate = get("role_template");
    if (roleTemplate !== undefined && resolveRoleArchetype(roleTemplate) === null) {
      issues.push({
        line, blocking: false,
        message: `Row ${line} (${fullName}): the role template "${roleTemplate}" isn't available yet. They'll be imported with minimum access — assign a role from AI Teammates afterwards.`,
      });
    }
    rows.push({
      line,
      full_name: fullName,
      email,
      ...(get("title") !== undefined ? { title: get("title") } : {}),
      ...(get("department") !== undefined ? { department: get("department") } : {}),
      ...(get("manager_email") !== undefined
        ? { manager_email: get("manager_email")!.toLowerCase() }
        : {}),
      ...(roleTemplate !== undefined ? { role_template: roleTemplate } : {}),
    });
  }

  // Manager references must resolve to someone in the file or the org.
  const fileEmails = new Set(rows.map((r) => r.email));
  for (const r of rows) {
    if (r.manager_email === undefined) continue;
    if (r.manager_email === r.email) {
      issues.push({
        line: r.line, blocking: false,
        message: `Row ${r.line} (${r.full_name}): a person can't be their own manager. The manager mapping will be skipped.`,
      });
      delete r.manager_email;
      continue;
    }
    if (!fileEmails.has(r.manager_email) && !existingEmails.has(r.manager_email)) {
      issues.push({
        line: r.line, blocking: false,
        message: `Row ${r.line} (${r.full_name}): the manager ${r.manager_email} isn't in this file or your organization. They'll be imported without a manager — map one later from Users.`,
      });
      delete r.manager_email;
    }
  }

  if (rows.some((r) => r.role_template !== undefined)) {
    notes.push(
      "Role templates in this file are shown for planning only — they're assigned after import from AI Teammates, and they never grant admin-level authority.",
    );
  }
  return { rows, issues, notes, fileIssues };
}
