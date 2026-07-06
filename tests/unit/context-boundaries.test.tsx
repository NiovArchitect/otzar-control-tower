// FILE: tests/unit/context-boundaries.test.tsx
// PURPOSE: [CTX-BOUNDARY] the Context Boundaries admin page: all seven
//          boundary groups render with can/cannot copy, counts land only
//          on the three projected groups, recent documents render labels
//          only, the retention limitation is stated honestly with the
//          /retention link, the page is READ-ONLY (GET only, no writes),
//          non-admins get honest copy, and no raw internals/overclaims
//          leak. It is a boundary view — the words "classify", "tag",
//          "cleanup", and "queue" must not appear as asks.
// CONNECTS TO: src/pages/ContextBoundaries.tsx,
//          api.workOs.contextBoundaries, FND context-boundaries.service.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ContextBoundariesPage } from "@/pages/ContextBoundaries";

const API = "http://localhost:3000/api/v1";

function renderPage() {
  return render(
    <MemoryRouter>
      <ContextBoundariesPage />
    </MemoryRouter>,
  );
}

describe("[CTX-BOUNDARY] Context Boundaries — a boundary view, never a librarian queue", () => {
  it("groups render with can/cannot copy; counts on the three projected groups; recent docs label-only; retention honest; READ-ONLY", async () => {
    const mutations: string[] = [];
    server.events.removeAllListeners();
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") mutations.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    server.use(
      http.get(`${API}/work-os/context/boundaries`, () =>
        HttpResponse.json({
          ok: true,
          boundaries: {
            seeded_history_count: 12,
            seeded_document_count: 4,
            extracted_reviewed_count: 2,
            retired_context_count: 1,
            recent_documents: [
              {
                title_label: "Support escalation SOP",
                origin_label: "Seeded document context · Process / SOP",
                currentness_label: "Historical",
                covering_period_label: "Covers 2025",
                seeded_on: "2026-07-05",
              },
            ],
          },
        }),
      ),
    );
    renderPage();

    // Doctrine line — admins govern boundaries, never curate relevance.
    const doctrine = screen.getByTestId("boundaries-doctrine").textContent ?? "";
    expect(doctrine).toContain("you never need to classify, tag, or clean up sources");

    // All seven groups with their boundary copy.
    const history = await screen.findByTestId("boundary-seeded-history");
    expect(history.textContent).toContain("Company-owned background context");
    expect(history.textContent).toContain("live work wins");
    expect(history.textContent).toContain("Cannot:");
    expect(screen.getByTestId("boundary-count-seeded-history").textContent).toContain("12");
    const docs = screen.getByTestId("boundary-seeded-documents");
    expect(docs.textContent).toContain("Work extraction is off by default");
    expect(docs.textContent).toContain("Create work unless a human approves an item");
    expect(screen.getByTestId("boundary-count-seeded-documents").textContent).toContain("4");
    const extracted = screen.getByTestId("boundary-extracted-work");
    expect(extracted.textContent).toContain("human-reviewed");
    expect(screen.getByTestId("boundary-count-extracted-work").textContent).toContain("2");
    // Copy-only groups carry NO count (no safe projection — on purpose).
    for (const key of ["twin-calibration", "writing-style", "live-work", "external-context"]) {
      expect(screen.getByTestId(`boundary-${key}`)).toBeTruthy();
      expect(screen.queryByTestId(`boundary-count-${key}`)).toBeNull();
    }
    expect(screen.getByTestId("boundary-twin-calibration").textContent).toContain("personal");
    expect(screen.getByTestId("boundary-writing-style").textContent).toContain(
      "raw sample never leaves their browser",
    );
    expect(screen.getByTestId("boundary-live-work").textContent).toContain(
      "outranks all seeded background",
    );
    expect(screen.getByTestId("boundary-external-context").textContent).toContain(
      "never auto-trusted",
    );

    // Recent documents: labels only.
    const recent = screen.getByTestId("boundaries-recent-doc").textContent ?? "";
    expect(recent).toContain("Support escalation SOP");
    expect(recent).toContain("Historical");
    expect(recent).toContain("seeded 2026-07-05");

    // Retention: governed lifecycle framing, retired count, honest limits.
    const retention = screen.getByTestId("boundaries-retention-copy").textContent ?? "";
    expect(retention).toContain("becoming governed lifecycle controls");
    expect(retention).toContain("audit trail, and source lineage are preserved");
    expect(retention).toContain("1 record is currently retired");
    expect(retention).toContain("Hard delete and compliance purge are not available yet");
    expect(retention).toContain("nothing here deletes sources");

    // READ-ONLY: loading the page issued zero non-GET requests.
    expect(mutations).toEqual([]);

    // Leak + overclaim + no-librarian sweep.
    const all = document.body.textContent ?? "";
    expect(all).not.toMatch(/DOCUMENT_CONTEXT|seeded_context|source_lineage|VERIFIED|PROPOSED\b/);
    expect(all).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(all).not.toMatch(/trained|AI learned|delete forever|vector|embedding|corpus cleanup|relevance queue/i);
    // "purge" may appear ONLY inside the honest negation ("Hard delete and
    // compliance purge are not available yet").
    expect(all).not.toMatch(/(?<!compliance )purge/i);
    expect(all).not.toMatch(/purge(?! are not available yet)/i);
    expect(all).not.toMatch(/retention configured/i);
    // "current truth" may appear ONLY as the negated boundary ("cannot
    // become current truth…") — never as a claim about seeded context.
    expect(all).not.toMatch(/is current truth|becomes current truth|current truth from/i);
    expect(all).toContain("Become current truth without confirmation");
  });

  it("non-admins get honest copy — the groups still teach the boundaries, but no counts or titles load", async () => {
    server.use(
      http.get(`${API}/work-os/context/boundaries`, () =>
        HttpResponse.json(
          { ok: false, code: "OPERATION_NOT_PERMITTED", message: "admin view" },
          { status: 403 },
        ),
      ),
    );
    renderPage();
    const denied = await screen.findByTestId("boundaries-denied");
    expect(denied.textContent).toContain("Context boundaries are an admin view.");
    expect(screen.queryByTestId("boundary-count-seeded-history")).toBeNull();
    expect(screen.queryByTestId("boundaries-recent")).toBeNull();
    // The boundary doctrine still renders — the copy itself is public truth.
    expect(screen.getByTestId("boundary-seeded-history")).toBeTruthy();
  });
});
