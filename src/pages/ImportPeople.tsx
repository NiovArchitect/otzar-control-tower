// FILE: ImportPeople.tsx
// PURPOSE: [GAP-U SLICE-2] Guided CSV people import — the first write-path
//          setup slice. Preview-first, confirmation-gated, least-access by
//          construction: NOTHING is written until the admin confirms, and
//          what is written goes ONLY through the existing rails —
//          POST /org/members/bulk (credential-less create, per-row audit) →
//          POST /org/onboarding/invite per person (twin + ONE-TIME
//          activation link, the P0-ONBOARD rail) → POST /org/hierarchy/
//          assign for manager mapping (cycle-safe, audited). No passwords,
//          no admin flags, no tool/data grants, no autonomy overrides —
//          the parser refuses those columns before they reach any state.
//          Role templates preview only (assigned later from AI Teammates).
//          Activation links are revealed ONCE in the results and never
//          claimed to be emailed.
// CONNECTS TO: src/lib/setup/csv-import.ts (pure parse/validate),
//          route /setup/import-people, /setup People card + Users page.

import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleDashed, Copy, Download, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import {
  CSV_TEMPLATE,
  IMPORT_ROW_CAP,
  parsePeopleCsv,
  type ImportRow,
  type ParseResult,
} from "@/lib/setup/csv-import";

type ResultRow = {
  row: ImportRow;
  state: "invited" | "created_no_link" | "failed";
  detail: string;
  activationUrl?: string;
  managerMapped?: boolean;
  /** [ACT-EMAIL] the batch-send target — data only, never rendered. */
  entityId?: string;
};

type Phase =
  | { kind: "input" }
  | { kind: "preview"; parsed: ParseResult; raw: string }
  | { kind: "importing"; done: number; total: number }
  | { kind: "results"; results: ResultRow[] };

export function ImportPeoplePage() {
  const [raw, setRaw] = useState("");
  // [ACT-EMAIL] explicit batch email send from the results phase.
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  async function sendActivationEmails(results: ResultRow[]): Promise<void> {
    const ids = results
      .filter((r) => r.state === "invited" && r.entityId !== undefined)
      .map((r) => r.entityId!);
    if (ids.length === 0 || emailBusy) return;
    setEmailBusy(true);
    const r = await api.org.members.activationEmails(ids);
    setEmailBusy(false);
    if (r.ok && r.data.ok) {
      const allNotConfigured =
        r.data.sent === 0 &&
        r.data.results.every((row) => row.code === "EMAIL_NOT_CONFIGURED");
      setEmailResult(
        allNotConfigured
          ? "Email delivery isn't configured yet — copy the activation links above instead."
          : `${r.data.sent} activation email${r.data.sent === 1 ? "" : "s"} sent — “sent” means our email provider accepted them${r.data.failed > 0 ? `; ${r.data.failed} couldn't be sent — copy those links instead` : ""}.`,
      );
    } else {
      setEmailResult("The emails couldn't be sent. Nothing was delivered — copy the links above instead.");
    }
  }
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [copiedAll, setCopiedAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Existing members — read-only, powers duplicate detection + manager
  // resolution. Nothing else loads on this page.
  const existing = useQuery({
    queryKey: ["org", "entities", "import"],
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      return r.ok ? r.data.items : [];
    },
  });
  const existingByEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of existing.data ?? []) {
      if (p.email != null) m.set(p.email.toLowerCase(), p.entity_id);
    }
    return m;
  }, [existing.data]);

  function preview(text: string): void {
    const parsed = parsePeopleCsv(text, new Set(existingByEmail.keys()));
    setPhase({ kind: "preview", parsed, raw: text });
  }

  async function runImport(parsed: ParseResult): Promise<void> {
    const rows = parsed.rows;
    setPhase({ kind: "importing", done: 0, total: rows.length });

    // 1) Create everyone in ONE bulk call — credential-less, per-row audit,
    //    partial-success (the backend reports exactly what failed).
    const bulk = await api.org.members.bulk(
      rows.map((r) => {
        const [first, ...rest] = r.full_name.split(/\s+/);
        return {
          email: r.email,
          first_name: first ?? r.full_name,
          last_name: rest.join(" "),
          ...(r.title !== undefined ? { role_title: r.title } : {}),
        };
      }),
    );
    if (!bulk.ok) {
      setPhase({
        kind: "results",
        results: rows.map((row) => ({
          row,
          state: "failed",
          detail: "The import couldn't start — nothing was created. Try again in a minute.",
        })),
      });
      return;
    }
    const createdByEmail = new Map(
      bulk.data.created.map((c) => [(c.email ?? "").toLowerCase(), c.entity_id]),
    );

    // 2) Per person: Phase-3 invite (twin + ONE-TIME activation link), then
    //    the manager mapping when resolvable. Sequential — stays inside the
    //    admin rate budget and yields exact per-person outcomes.
    const results: ResultRow[] = [];
    let done = 0;
    for (const row of rows) {
      const entityId = createdByEmail.get(row.email);
      if (entityId === undefined) {
        const failure = bulk.data.failures.find((f) => rows[f.index]?.email === row.email);
        results.push({
          row,
          state: "failed",
          detail:
            failure?.error === "INVALID_MEMBER_INPUT"
              ? "This row was refused by the server. Check the name and email."
              : "This person wasn't created — they may already exist. Check Users.",
        });
        done++;
        setPhase({ kind: "importing", done, total: rows.length });
        continue;
      }
      const invited = await api.org.onboarding.invite(entityId);
      let activationUrl: string | undefined;
      if (invited.ok) {
        activationUrl = `${window.location.origin}/activate?token=${invited.data.activation_token}`;
      }
      let managerMapped: boolean | undefined;
      if (row.manager_email !== undefined) {
        const managerId =
          createdByEmail.get(row.manager_email) ?? existingByEmail.get(row.manager_email);
        if (managerId !== undefined) {
          const assigned = await api.org.hierarchy.assign({
            person_entity_id: entityId,
            manager_entity_id: managerId,
            ...(row.title !== undefined ? { role_title: row.title } : {}),
            ...(row.department !== undefined ? { department: row.department } : {}),
          });
          managerMapped = assigned.ok;
        } else {
          managerMapped = false;
        }
      } else if (row.department !== undefined || row.title !== undefined) {
        await api.org.hierarchy.assign({
          person_entity_id: entityId,
          manager_entity_id: null,
          ...(row.title !== undefined ? { role_title: row.title } : {}),
          ...(row.department !== undefined ? { department: row.department } : {}),
        });
      }
      results.push({
        row,
        state: activationUrl !== undefined ? "invited" : "created_no_link",
        detail:
          activationUrl !== undefined
            ? "Invited with minimum access — share their activation link securely."
            : "Created, but the activation link couldn't be minted. Generate one from Users.",
        ...(activationUrl !== undefined ? { activationUrl } : {}),
        ...(managerMapped !== undefined ? { managerMapped } : {}),
        entityId,
      });
      done++;
      setPhase({ kind: "importing", done, total: rows.length });
    }
    setPhase({ kind: "results", results });
  }

  const blocking = phase.kind === "preview" ? phase.parsed.issues.filter((i) => i.blocking) : [];
  const advisories = phase.kind === "preview" ? phase.parsed.issues.filter((i) => !i.blocking) : [];

  return (
    <div className="space-y-6" data-testid="import-people-page">
      <PageHeader
        title="Import people"
        description="Bring your team into Otzar from a simple CSV — preview first, nothing is created until you confirm."
      />
      <p className="text-xs text-muted-foreground" data-testid="import-least-access">
        New people start with minimum access. You can add roles, manager
        relationships, AI Teammate readiness, and tool access after import —
        authority is never granted from a file.
      </p>

      {phase.kind === "input" && (
        <Card data-testid="import-input">
          <CardHeader>
            <CardTitle className="text-sm">1 · Provide your people</CardTitle>
            <CardDescription>
              Columns: full_name and email (required); title, department,
              manager_email, role_template (optional). Up to {IMPORT_ROW_CAP}{" "}
              people per batch. Passwords and permissions are never imported.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="import-template"
                onClick={() => {
                  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "otzar-people-import.csv";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                <Download className="mr-1 h-3.5 w-3.5" aria-hidden />
                Download template
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="import-upload"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1 h-3.5 w-3.5" aria-hidden />
                Upload CSV
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f === undefined) return;
                  void f.text().then((t) => {
                    setRaw(t);
                    preview(t);
                  });
                }}
              />
            </div>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"full_name,email\nDana Rivera,dana@yourcompany.com"}
              rows={8}
              data-testid="import-paste"
            />
            <Button
              size="sm"
              disabled={raw.trim().length === 0 || existing.isLoading}
              onClick={() => preview(raw)}
              data-testid="import-preview-btn"
            >
              Preview import
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      )}

      {phase.kind === "preview" && (
        <Card data-testid="import-preview">
          <CardHeader>
            <CardTitle className="text-sm">2 · Review before anything is created</CardTitle>
            <CardDescription data-testid="import-preview-summary">
              {phase.parsed.fileIssues.length > 0
                ? "This file needs a fix before Otzar can preview it."
                : `${phase.parsed.rows.length} ${phase.parsed.rows.length === 1 ? "person is" : "people are"} ready to import${blocking.length > 0 ? `. ${blocking.length} ${blocking.length === 1 ? "row needs" : "rows need"} attention — they'll be skipped unless fixed.` : "."}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {phase.parsed.fileIssues.map((m, i) => (
              <p key={i} className="text-xs text-destructive" data-testid="import-file-issue">
                {m}
              </p>
            ))}
            {blocking.map((iss) => (
              <p key={`${iss.line}-b`} className="text-xs text-destructive" data-testid="import-blocking-issue">
                {iss.message}
              </p>
            ))}
            {advisories.map((iss) => (
              <p key={`${iss.line}-a`} className="text-xs text-muted-foreground" data-testid="import-advisory">
                {iss.message}
              </p>
            ))}
            {phase.parsed.notes.map((n, i) => (
              <p key={`n-${i}`} className="text-xs text-muted-foreground" data-testid="import-note">
                {n}
              </p>
            ))}
            {phase.parsed.rows.length > 0 && (
              <ul className="space-y-1" data-testid="import-preview-rows">
                {phase.parsed.rows.map((r) => (
                  <li key={r.email} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    <span>
                      <span className="font-medium">{r.full_name}</span> · {r.email}
                      {r.title !== undefined ? ` · ${r.title}` : ""}
                      {r.manager_email !== undefined ? ` · reports to ${r.manager_email}` : ""}
                      {r.role_template !== undefined ? ` · role planned: ${r.role_template} (assigned after import)` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs" data-testid="import-confirm-copy">
              {phase.parsed.rows.length > 0 ? (
                <>
                  You're about to invite {phase.parsed.rows.length}{" "}
                  {phase.parsed.rows.length === 1 ? "person" : "people"} with{" "}
                  <span className="font-medium">minimum access</span>. They'll
                  need activation before they can use Otzar — you'll get a
                  one-time activation link for each person to share securely.
                  No email is sent.
                  {phase.parsed.rows.some((r) => r.manager_email !== undefined) ? (
                    <> Manager relationships help Otzar route clarifications and team work — they are not broad data permissions.</>
                  ) : null}
                </>
              ) : (
                <>Nothing can be imported yet — fix the rows above and preview again.</>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhase({ kind: "input" })}
                data-testid="import-back"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden />
                Back
              </Button>
              <Button
                size="sm"
                disabled={phase.parsed.rows.length === 0}
                onClick={() => void runImport(phase.parsed)}
                data-testid="import-confirm"
              >
                Invite {phase.parsed.rows.length} {phase.parsed.rows.length === 1 ? "person" : "people"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase.kind === "importing" && (
        <Card data-testid="import-progress">
          <CardHeader>
            <CardTitle className="text-sm">
              Inviting {phase.done} of {phase.total}…
            </CardTitle>
            <CardDescription>
              Creating each person with minimum access and minting their
              one-time activation link.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {phase.kind === "results" && (
        <Card data-testid="import-results">
          <CardHeader>
            <CardTitle className="text-sm">3 · Import result</CardTitle>
            <CardDescription data-testid="import-results-summary">
              {phase.results.filter((r) => r.state === "invited").length} invited ·{" "}
              {phase.results.filter((r) => r.state === "created_no_link").length} need a link from Users ·{" "}
              {phase.results.filter((r) => r.state === "failed").length} failed. Activation links are
              shown once — copy them now and share securely. No email is sent automatically — you
              can send activation emails below, or copy links instead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* [ACT-EMAIL] explicit batch send for the just-invited people.
                Nothing is emailed until this click; the honest
                not-configured result keeps copy-links as the fallback. */}
            {phase.results.some((r) => r.state === "invited" && r.entityId !== undefined) ? (
              <div className="space-y-1" data-testid="import-email-block">
                {emailResult === null ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={emailBusy}
                    data-testid="import-send-emails"
                    onClick={() => void sendActivationEmails(phase.results)}
                  >
                    {emailBusy ? "Sending…" : "Send activation emails now"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground" data-testid="import-email-result">
                    {emailResult}
                  </p>
                )}
              </div>
            ) : null}
            <ul className="space-y-2" data-testid="import-result-rows">
              {phase.results.map((r) => (
                <li key={r.row.email} className="flex items-start gap-2 text-xs">
                  {r.state === "invited" ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="font-medium">{r.row.full_name}</span> · {r.detail}
                    {r.managerMapped === false ? " Manager mapping didn't apply — set it from Users." : ""}
                    {r.activationUrl !== undefined ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-5 px-1.5 text-[11px]"
                        data-testid="import-copy-link"
                        onClick={() => void navigator.clipboard.writeText(r.activationUrl!)}
                      >
                        <Copy className="mr-1 h-3 w-3" aria-hidden />
                        Copy activation link
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            {phase.results.some((r) => r.activationUrl !== undefined) && (
              <Button
                variant="outline"
                size="sm"
                data-testid="import-copy-all"
                onClick={() => {
                  const all = phase.results
                    .filter((r) => r.activationUrl !== undefined)
                    .map((r) => `${r.row.full_name} <${r.row.email}>: ${r.activationUrl}`)
                    .join("\n");
                  void navigator.clipboard.writeText(all);
                  setCopiedAll(true);
                }}
              >
                {copiedAll ? "Copied" : "Copy all activation links"}
              </Button>
            )}
            <div className="flex gap-2">
              <Button asChild size="sm" data-testid="import-back-to-setup">
                <Link to="/setup">
                  Back to Organization Setup
                  <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/users">Open Users</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
