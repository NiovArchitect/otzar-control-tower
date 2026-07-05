// FILE: tests/unit/seed-corpus.test.tsx
// PURPOSE: [CS-5] the Seed organization context flow: boundary-first copy
//          (company-owned, never personal memory, historical = background
//          not current truth, no tasks), confirmation-gated (no write
//          before explicit confirm), the exact POST body, honest non-admin
//          failure, no file input, and overclaim/leak sweeps (no "Otzar
//          understands everything", no "fully trained", no raw enums).
// CONNECTS TO: src/pages/SeedCorpus.tsx, api.otzar.seedDocumentContext.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { SeedCorpusPage } from "@/pages/SeedCorpus";

const API = "http://localhost:3000/api/v1";

function renderPage() {
  return render(
    <MemoryRouter>
      <SeedCorpusPage />
    </MemoryRouter>,
  );
}

describe("[CS-5] Seed organization context — boundary-first, confirmation-gated", () => {
  it("no write before confirm; the review promises render; the POST body is exact; done copy honest", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/otzar/context/seed-document`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, ledger_entry_id: "led-1", meeting_capture_id: "cap-1" },
          { status: 201 },
        );
      }),
    );
    renderPage();
    const boundary = screen.getByTestId("corpus-boundary").textContent ?? "";
    expect(boundary).toContain("company-owned");
    expect(boundary).toContain("never becomes anyone's personal Twin memory");
    expect(boundary).toContain("background, not current truth");
    expect(boundary).toContain("No tasks or follow-ups");
    // [AIX] admins are never context librarians — the promise is on the page.
    expect(boundary).toContain("You don't need to classify");
    expect(boundary).toContain("Otzar manages relevance");
    // No file input exists anywhere.
    expect(document.querySelector('input[type="file"]')).toBeNull();

    await userEvent.click(screen.getByText("Process / SOP"));
    await userEvent.type(screen.getByTestId("corpus-title"), "Support escalation SOP");
    await userEvent.type(screen.getByTestId("corpus-period"), "2025");
    await userEvent.click(screen.getByText("Historical"));
    await userEvent.click(screen.getByTestId("corpus-body"));
    await userEvent.paste("Always respond within one day. David owns escalations.");
    await userEvent.click(screen.getByTestId("corpus-review"));

    const confirm = await screen.findByTestId("corpus-confirm");
    const copy = confirm.textContent ?? "";
    expect(copy).toContain("company-owned reference context");
    expect(copy).toContain("historical background, not current truth");
    expect(copy).toContain("fully lineaged");
    expect(copy).toContain("never becomes anyone's personal Twin memory");
    expect(copy).toContain("not trusted automatically");
    expect(copy).toContain("Retention controls are not configurable in-product yet");
    // Review happened — zero writes so far.
    expect(bodies).toEqual([]);

    await userEvent.click(screen.getByTestId("corpus-confirm-btn"));
    await screen.findByTestId("corpus-done");
    expect(bodies.length).toBe(1);
    expect(bodies[0]).toEqual({
      source_kind: "SOP",
      title: "Support escalation SOP",
      body: "Always respond within one day. David owns escalations.",
      currentness: "historical",
      covering_period: "2025",
    });
    const done = screen.getByTestId("corpus-done-copy").textContent ?? "";
    expect(done).toContain("dated, lineaged, and company-owned");
    expect(done).toContain("doesn't create work or change anyone's access");

    const all = document.body.textContent ?? "";
    expect(all).not.toMatch(/understands everything|fully trained|personal memory enabled|retention configured/i);
    expect(all).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(all).not.toMatch(/DOCUMENT_CONTEXT|seeded_context|VERIFIED/);
  });

  it("a non-admin gets honest copy and nothing-created framing", async () => {
    server.use(
      http.post(`${API}/otzar/context/seed-document`, () =>
        HttpResponse.json(
          { ok: false, code: "OPERATION_NOT_PERMITTED", message: "denied" },
          { status: 403 },
        ),
      ),
    );
    renderPage();
    await userEvent.click(screen.getByText("Policy"));
    await userEvent.type(screen.getByTestId("corpus-title"), "Leave policy");
    await userEvent.click(screen.getByText("Current"));
    await userEvent.click(screen.getByTestId("corpus-body"));
    await userEvent.paste("Everyone gets rest.");
    await userEvent.click(screen.getByTestId("corpus-review"));
    await userEvent.click(await screen.findByTestId("corpus-confirm-btn"));
    const err = await screen.findByTestId("corpus-error");
    expect(err.textContent).toContain("requires admin authority");
  });
});
