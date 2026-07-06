// FILE: tests/unit/retention-lifecycle.test.tsx
// PURPOSE: [RETENTION] the governed lifecycle on /retention: the new
//          category rows render (seeded context retireable with audit
//          preserved; reviewed work follows work lifecycle; personal
//          calibration is employee-revocable, never admin-owned); the
//          lifecycle card lists documents with state; RETIRE requires a
//          two-step confirm and posts exactly one lifecycle change;
//          restore posts active; cancel writes nothing; non-admins get
//          honest copy; overclaim sweep (no delete forever / purge /
//          compliance ready / retention configured / erase).
// CONNECTS TO: src/pages/Retention.tsx, api.workOs.contextDocuments,
//          api.workOs.setContextLifecycle, FND context-lifecycle rail.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import Retention from "@/pages/Retention";

const API = "http://localhost:3000/api/v1";

function docsHandler(state: string) {
  return http.get(`${API}/work-os/context/documents`, () =>
    HttpResponse.json({
      ok: true,
      documents: [
        {
          ledger_entry_id: "led-doc-1",
          title_label: "Support escalation SOP",
          origin_label: "Seeded document context · Process / SOP",
          currentness_label: "Historical",
          covering_period_label: "Covers 2025",
          seeded_on: "2026-07-05",
          lifecycle_state_label: state,
        },
      ],
    }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Retention />
    </MemoryRouter>,
  );
}

describe("[RETENTION] governed seeded-context lifecycle on /retention", () => {
  it("category rows + lifecycle copy render; retire is two-step and posts exactly one change; cancel writes nothing", async () => {
    const writes: Array<{ id: string; body: Record<string, unknown> }> = [];
    server.use(
      docsHandler("Active"),
      http.post(`${API}/work-os/ledger/:id/context-lifecycle`, async ({ params, request }) => {
        writes.push({
          id: String(params.id),
          body: (await request.json()) as Record<string, unknown>,
        });
        return HttpResponse.json({ ok: true, entry: {} });
      }),
    );
    renderPage();

    // The new lifecycle category rows.
    const rows = screen.getAllByTestId("retention-row").map((r) => r.textContent ?? "");
    expect(rows.some((t) => t.includes("Seeded history & documents") && t.includes("Nothing is deleted"))).toBe(true);
    expect(rows.some((t) => t.includes("Reviewed extracted work") && t.includes("work lifecycle, not document lifecycle"))).toBe(true);
    expect(rows.some((t) => t.includes("revocable by the employee") && t.includes("not controlled by admins"))).toBe(true);

    // The lifecycle card copy: governed, preserving, honest about limits.
    const copy = (await screen.findByTestId("retention-lifecycle-copy")).textContent ?? "";
    expect(copy).toContain("becoming governed lifecycle controls");
    expect(copy).toContain("preserving audit and source lineage");
    expect(copy).toContain(
      "Hard delete, compliance purge, retention windows, and automated expiry are not available yet",
    );

    // Document row renders with state.
    const doc = await screen.findByTestId("retention-lifecycle-doc");
    expect(doc.textContent).toContain("Support escalation SOP");
    expect(screen.getByTestId("retention-lifecycle-state").textContent).toBe("Active");

    // Step 1 shows the consequence copy; NOTHING has posted yet.
    await userEvent.click(screen.getByTestId("retention-retire"));
    expect(screen.getByTestId("retention-retire-confirm-copy").textContent).toContain(
      "Nothing is deleted",
    );
    expect(writes).toEqual([]);
    // Cancel: still nothing.
    await userEvent.click(screen.getByTestId("retention-retire-cancel"));
    expect(writes).toEqual([]);
    // Retire for real: exactly one POST with the exact payload.
    await userEvent.click(screen.getByTestId("retention-retire"));
    await userEvent.click(screen.getByTestId("retention-retire-confirm"));
    const notice = await screen.findByTestId("retention-lifecycle-notice");
    expect(writes).toEqual([{ id: "led-doc-1", body: { state: "retired" } }]);
    expect(notice.textContent).toContain("Retired from active use");
    expect(notice.textContent).toContain("nothing was deleted");

    // Overclaim sweep — pre-existing future-marked copy aside, no new
    // deletion/compliance claims anywhere.
    const all = document.body.textContent ?? "";
    expect(all).not.toMatch(/delete forever|compliance ready|retention configured|erase all traces/i);
    // "purge" may appear ONLY inside the honest negation.
    expect(all).not.toMatch(/(?<!compliance )purge/i);
    expect(all).not.toMatch(/purge(?!,? (retention windows, and automated expiry )?are not available yet)/i);
    expect(all).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(all).not.toMatch(/DOCUMENT_CONTEXT|seeded_context|context_lifecycle|admin_lifecycle/);
  });

  it("a retired document offers restore (posts active); non-admins get honest copy", async () => {
    const writes: Array<Record<string, unknown>> = [];
    server.use(
      docsHandler("Retired from active context"),
      http.post(`${API}/work-os/ledger/:id/context-lifecycle`, async ({ request }) => {
        writes.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: {} });
      }),
    );
    renderPage();
    const state = await screen.findByTestId("retention-lifecycle-state");
    expect(state.textContent).toBe("Retired from active context");
    await userEvent.click(screen.getByTestId("retention-restore"));
    await screen.findByTestId("retention-lifecycle-notice");
    expect(writes).toEqual([{ state: "active" }]);
  });

  it("non-admins see the boundary copy, no list, no controls", async () => {
    server.use(
      http.get(`${API}/work-os/context/documents`, () =>
        HttpResponse.json(
          { ok: false, code: "OPERATION_NOT_PERMITTED", message: "admin view" },
          { status: 403 },
        ),
      ),
    );
    renderPage();
    const denied = await screen.findByTestId("retention-lifecycle-denied");
    expect(denied.textContent).toContain("governed by org admins");
    expect(screen.queryByTestId("retention-retire")).toBeNull();
    expect(screen.queryByTestId("retention-lifecycle-doc")).toBeNull();
  });
});
