// FILE: tests/unit/csv-import.test.tsx
// PURPOSE: [GAP-U SLICE-2] the CSV people import: the pure parser/validator
//          (failure stories 1–13 of the import matrix) and the guided page
//          (preview-first, NO write before confirmation, least-access copy,
//          one-time activation links, repair-oriented results, no leaks).
// CONNECTS TO: src/lib/setup/csv-import.ts, src/pages/ImportPeople.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ImportPeoplePage } from "@/pages/ImportPeople";
import { parsePeopleCsv, IMPORT_ROW_CAP, CSV_TEMPLATE } from "@/lib/setup/csv-import";

const API = "http://localhost:3000/api/v1";
const NONE = new Set<string>();

describe("[GAP-U SLICE-2] parsePeopleCsv — failure stories", () => {
  it("empty file, missing headers, and headers-only files are refused with repair copy", () => {
    expect(parsePeopleCsv("", NONE).fileIssues[0]).toContain("The file is empty");
    const noEmail = parsePeopleCsv("full_name\nDana", NONE);
    expect(noEmail.fileIssues[0]).toContain('"email" column is required');
    const headersOnly = parsePeopleCsv("full_name,email", NONE);
    expect(headersOnly.fileIssues[0]).toContain("no people");
  });

  it("forbidden authority/credential columns hard-refuse the whole file", () => {
    const r = parsePeopleCsv("full_name,email,password,is_admin\nDana,d@a.com,x,true", NONE);
    expect(r.fileIssues.join(" ")).toContain("never imports passwords, authority, or tool access");
    expect(r.rows.length).toBe(0);
  });

  it("invalid emails, in-file duplicates (case-insensitive), and existing members block per-row", () => {
    const existing = new Set(["already@org.com"]);
    const r = parsePeopleCsv(
      [
        "full_name,email",
        "Bad Email,not-an-email",
        "Dana,dana@a.com",
        "Dana Again,DANA@A.COM",
        "Old Member,already@org.com",
        "Fine Person,fine@a.com",
      ].join("\n"),
      existing,
    );
    expect(r.rows.map((x) => x.email)).toEqual(["dana@a.com", "fine@a.com"]);
    const msgs = r.issues.map((i) => i.message).join(" | ");
    expect(msgs).toContain("doesn't look like an email address");
    expect(msgs).toContain("appears twice in this file");
    expect(msgs).toContain("already a member of your organization");
    expect(r.issues.every((i) => i.blocking)).toBe(true);
  });

  it("manager references resolve against the file AND the org; unresolvable/self managers degrade without blocking", () => {
    const existing = new Set(["boss@org.com"]);
    const r = parsePeopleCsv(
      [
        "full_name,email,manager_email",
        "A One,a@a.com,boss@org.com",
        "B Two,b@a.com,a@a.com",
        "C Three,c@a.com,nobody@nowhere.com",
        "D Four,d@a.com,d@a.com",
      ].join("\n"),
      existing,
    );
    expect(r.rows.length).toBe(4); // nothing blocked
    expect(r.rows[0]!.manager_email).toBe("boss@org.com");
    expect(r.rows[1]!.manager_email).toBe("a@a.com");
    expect(r.rows[2]!.manager_email).toBeUndefined();
    expect(r.rows[3]!.manager_email).toBeUndefined();
    const msgs = r.issues.map((i) => i.message).join(" | ");
    expect(msgs).toContain("isn't in this file or your organization");
    expect(msgs).toContain("can't be their own manager");
  });

  it("unknown role templates advise minimum access; unsupported columns note; row cap refuses honestly", () => {
    const r = parsePeopleCsv(
      "full_name,email,role_template,favorite_color\nDana,d@a.com,Quantum Wzard,blue",
      NONE,
    );
    expect(r.rows.length).toBe(1);
    const advisory = r.issues.find((i) => !i.blocking);
    expect(advisory?.message).toContain("minimum access");
    expect(r.notes.join(" ")).toContain('"favorite_color"');
    const big = ["full_name,email", ...Array.from({ length: IMPORT_ROW_CAP + 1 }, (_, i) => `P ${i},p${i}@a.com`)].join("\n");
    expect(parsePeopleCsv(big, NONE).fileIssues[0]).toContain(`up to ${IMPORT_ROW_CAP} at a time`);
  });

  it("the template itself parses clean", () => {
    const r = parsePeopleCsv(CSV_TEMPLATE, NONE);
    expect(r.fileIssues).toEqual([]);
    expect(r.rows.length).toBe(2);
    expect(r.issues.filter((i) => i.blocking)).toEqual([]);
  });
});

// ── The guided page ─────────────────────────────────────────────────────
function mockOrg(extra: () => void = () => {}) {
  server.use(
    http.get(`${API}/org/entities`, () =>
      HttpResponse.json({ ok: true, items: [], total: 0, skip: 0, take: 250 }),
    ),
  );
  extra();
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ImportPeoplePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("[GAP-U SLICE-2] Import people page — preview-first, confirmation-gated", () => {
  it("NO write fires before explicit confirmation; preview shows repair copy + least-access confirmation", async () => {
    const writes: string[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") writes.push(`${request.method} ${request.url}`);
    });
    mockOrg();
    renderPage();
    await userEvent.type(
      screen.getByTestId("import-paste"),
      "full_name,email\nDana Rivera,dana@a.com\nBad Row,nope",
    );
    await userEvent.click(screen.getByTestId("import-preview-btn"));
    await screen.findByTestId("import-preview");
    expect(screen.getByTestId("import-preview-summary").textContent).toContain(
      "1 person is ready to import",
    );
    expect(screen.getByTestId("import-blocking-issue").textContent).toContain(
      "doesn't look like an email address",
    );
    const confirmCopy = screen.getByTestId("import-confirm-copy").textContent ?? "";
    expect(confirmCopy).toContain("minimum access");
    expect(confirmCopy).toContain("No email is sent");
    // Preview happened — and not one non-GET request has fired.
    expect(writes).toEqual([]);
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(body).not.toMatch(/INVALID_MEMBER_INPUT|activation_pending|EXECUTIVE_OVERRIDE/);
  });

  it("confirmed import walks the existing rails and reveals one-time links; partial failure reads as repair", async () => {
    const bulkBodies: unknown[] = [];
    const invited: string[] = [];
    const assigns: unknown[] = [];
    mockOrg(() => {
      server.use(
        http.post(`${API}/org/members/bulk`, async ({ request }) => {
          const body = (await request.json()) as { members: Array<{ email: string }> };
          bulkBodies.push(body);
          return HttpResponse.json(
            {
              ok: true,
              created_count: 2,
              failure_count: 1,
              created: [
                { entity_id: "e-1", email: "dana@a.com", audit_event_id: "a1" },
                { entity_id: "e-2", email: "alex@a.com", audit_event_id: "a2" },
              ],
              failures: [{ index: 2, error: "EMAIL_ALREADY_EXISTS" }],
            },
            { status: 207 },
          );
        }),
        http.post(`${API}/org/onboarding/invite`, async ({ request }) => {
          const b = (await request.json()) as { entity_id: string };
          invited.push(b.entity_id);
          return HttpResponse.json({
            ok: true,
            org_entity_id: "org",
            entity_id: b.entity_id,
            twin_id: `twin-${b.entity_id}`,
            hive_membership_id: null,
            audit_event_id: "a3",
            activation_token: `tok-${b.entity_id}`,
            activation_expires_at: "2027-01-01T00:00:00.000Z",
          });
        }),
        http.post(`${API}/org/hierarchy/assign`, async ({ request }) => {
          assigns.push(await request.json());
          return HttpResponse.json({ ok: true, membership_id: "m", audit_event_id: "a4" });
        }),
      );
    });
    renderPage();
    await userEvent.click(screen.getByTestId("import-paste"));
    await userEvent.paste(
      "full_name,email,manager_email\nDana Rivera,dana@a.com,alex@a.com\nAlex Kim,alex@a.com,\nDupe Person,dupe@a.com,",
    );
    await userEvent.click(screen.getByTestId("import-preview-btn"));
    await screen.findByTestId("import-preview");
    await userEvent.click(screen.getByTestId("import-confirm"));
    await screen.findByTestId("import-results", undefined, { timeout: 10_000 });

    // The bulk body carries ONLY safe fields — no password/admin keys.
    const sent = (bulkBodies[0] as { members: Array<Record<string, unknown>> }).members;
    for (const m of sent) {
      for (const forbidden of ["password", "is_admin", "hierarchy_level", "clearance_level"]) {
        expect(m).not.toHaveProperty(forbidden);
      }
    }
    // Both created people were invited; the manager edge was assigned.
    expect(invited.sort()).toEqual(["e-1", "e-2"]);
    expect(assigns.length).toBe(1);
    expect((assigns[0] as Record<string, unknown>).manager_entity_id).toBe("e-2");

    const summary = screen.getByTestId("import-results-summary").textContent ?? "";
    expect(summary).toContain("2 invited");
    expect(summary).toContain("1 failed");
    expect(summary).toContain("shown once");
    expect(summary).toContain("No email is sent");
    // One-time links present; failure row reads as repair, not stack trace.
    expect(screen.getAllByTestId("import-copy-link").length).toBe(2);
    const rows = screen.getByTestId("import-result-rows").textContent ?? "";
    expect(rows).toContain("they may already exist. Check Users.");
    expect(rows).not.toContain("EMAIL_ALREADY_EXISTS");
    // Back to setup journey.
    expect(screen.getByTestId("import-back-to-setup")).toBeInTheDocument();
  });
});
