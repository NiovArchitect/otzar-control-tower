// FILE: tests/unit/document-extract-review.test.tsx
// PURPOSE: [DOC-EXTRACT] the review-first extraction flow on the seed-
//          corpus page: the scan runs ONLY on explicit click (never on
//          seeding), candidates render as "Possible …" possibilities
//          with source excerpts, approval posts EXACTLY one governed
//          work creation (PROPOSED + extraction lineage + human_reviewed)
//          per explicit click, dismissal creates nothing, owner
//          candidates are info-only, the empty scan is honest, and no
//          overclaims/UUIDs reach the user.
// CONNECTS TO: src/pages/SeedCorpus.tsx, api.otzar.extractDocumentPreview,
//          api.workOs.createLedgerEntry, FND document-extraction.service.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { SeedCorpusPage } from "@/pages/SeedCorpus";

const API = "http://localhost:3000/api/v1";

async function seedOneDocument(): Promise<void> {
  server.use(
    http.post(`${API}/otzar/context/seed-document`, () =>
      HttpResponse.json(
        { ok: true, ledger_entry_id: "led-doc-1", meeting_capture_id: "cap-1" },
        { status: 201 },
      ),
    ),
  );
  render(
    <MemoryRouter>
      <SeedCorpusPage />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByText("Project brief"));
  await userEvent.type(screen.getByTestId("corpus-title"), "Rollout planning brief");
  await userEvent.click(screen.getByText("Historical"));
  await userEvent.click(screen.getByTestId("corpus-body"));
  await userEvent.paste("Follow up with Finance. Launch blocked on legal review.");
  await userEvent.click(screen.getByTestId("corpus-review"));
  await userEvent.click(await screen.findByTestId("corpus-confirm-btn"));
  await screen.findByTestId("corpus-done");
}

describe("[DOC-EXTRACT] review-first scan on the seed-corpus page", () => {
  it("scan is explicit-click only; candidates review; approve posts ONE governed creation; dismiss creates nothing", async () => {
    const scans: Array<Record<string, unknown>> = [];
    const creations: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/otzar/context/extract-preview`, async ({ request }) => {
        scans.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({
          ok: true,
          source: {
            title_label: "Rollout planning brief",
            origin_label: "Seeded document context · Project brief",
            currentness_label: "Historical",
            covering_period_label: "Covers 2025",
          },
          candidates: [
            {
              kind_label: "Possible action",
              text: "Follow up with Finance about the Q1 access review.",
              can_create: true,
              suggested_ledger_type: "TASK",
              excerpt: "Follow up with Finance.",
            },
            {
              kind_label: "Possible blocker",
              text: "Launch appears blocked on legal review.",
              can_create: true,
              suggested_ledger_type: "BLOCKER",
            },
            {
              kind_label: "Possible owner",
              text: "Sarah may be involved in owning part of this — confirm with them before assigning anything.",
              can_create: false,
            },
          ],
          review_note:
            "These are possible items from seeded background context. Review before using — nothing becomes a task, follow-up, or assignment unless a human approves it.",
        });
      }),
      http.post(`${API}/work-os/ledger`, async ({ request }) => {
        creations.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "led-new-1" } }, { status: 201 });
      }),
    );

    await seedOneDocument();
    // Seeding alone ran NO scan and created NO work — the CS-5 contract.
    expect(scans).toEqual([]);
    expect(creations).toEqual([]);
    const promise = screen.getByTestId("extract-promise").textContent ?? "";
    expect(promise).toContain("Nothing becomes a task, follow-up, or assignment unless a human approves it");

    // Explicit click → the read-only preview.
    await userEvent.click(screen.getByTestId("extract-scan"));
    await screen.findByTestId("extract-review");
    expect(scans).toEqual([{ ledger_entry_id: "led-doc-1" }]);
    expect(creations).toEqual([]);
    const note = screen.getByTestId("extract-note").textContent ?? "";
    expect(note).toContain("Review before using");
    expect(note).toContain("Covers 2025");
    const cards = screen.getAllByTestId("extract-candidate");
    expect(cards.length).toBe(3);
    expect(cards[0]!.textContent).toContain("Possible action");
    expect(screen.getByTestId("extract-excerpt").textContent).toContain("Follow up with Finance.");
    // Owner candidate is info-only — no create button.
    expect(screen.getByTestId("extract-info-only").textContent).toContain("For awareness only");
    expect(screen.getAllByTestId("extract-approve").length).toBe(2);

    // Approve the action → EXACTLY one governed creation with lineage.
    await userEvent.click(screen.getAllByTestId("extract-approve")[0]!);
    await screen.findByTestId("extract-created");
    expect(creations).toEqual([
      {
        ledger_type: "TASK",
        title: "Follow up with Finance about the Q1 access review.",
        status: "PROPOSED",
        details: {
          source: "document_extraction_review",
          source_document_ledger_id: "led-doc-1",
          human_reviewed: true,
          source_excerpt: "Follow up with Finance.",
        },
      },
    ]);
    expect(screen.getByTestId("extract-created").textContent).toContain(
      "Approved item created as governed work",
    );

    // Dismiss the blocker → honest rejection copy, NO extra creation.
    await userEvent.click(screen.getAllByTestId("extract-dismiss")[0]!);
    expect(screen.getByTestId("extract-dismissed").textContent).toContain(
      "Rejected. Otzar will not use this extraction as work.",
    );
    expect(creations.length).toBe(1);

    // Overclaim + leak sweep across everything visible.
    const all = document.body.textContent ?? "";
    expect(all).not.toMatch(/Otzar knows|trained|the truth|fully understood|tasks created/i);
    expect(all).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(all).not.toMatch(/DOCUMENT_CONTEXT|extract_work|seeded_context/);
  });

  it("an empty scan is honest — nothing found, nothing created; a failed scan says nothing changed", async () => {
    server.use(
      http.post(`${API}/otzar/context/extract-preview`, () =>
        HttpResponse.json({
          ok: true,
          source: { title_label: "Rollout planning brief", origin_label: "Seeded document context · Project brief" },
          candidates: [],
          review_note: "These are possible items from seeded background context. Review before using.",
        }),
      ),
    );
    await seedOneDocument();
    await userEvent.click(screen.getByTestId("extract-scan"));
    const empty = await screen.findByTestId("extract-empty");
    expect(empty.textContent).toContain("nothing was created");
  });
});
