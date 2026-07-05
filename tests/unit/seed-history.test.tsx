// FILE: tests/unit/seed-history.test.tsx
// PURPOSE: [CS-2] the Seed organization history flow: confirmation-gated
//          (no write before the explicit confirm), the what-will-happen
//          promises render (context not to-dos, no notifications, external
//          names to review, company-owned), the seeded_context body carries
//          ONLY the covering period (provided_by is server-derived), the
//          non-admin failure reads honestly, and no leaks/overclaims.
// CONNECTS TO: src/pages/SeedHistory.tsx, api.otzar.commsIngest.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { SeedHistoryPage } from "@/pages/SeedHistory";

const API = "http://localhost:3000/api/v1";

function renderPage() {
  return render(
    <MemoryRouter>
      <SeedHistoryPage />
    </MemoryRouter>,
  );
}

describe("[CS-2] Seed organization history — confirmation-gated, honest", () => {
  it("no write before confirm; the what-will-happen promises render; the body carries only the period", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/otzar/comms/ingest`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({
          ok: true,
          result: { work_items: [{ a: 1 }, { a: 2 }], summary: { owned: 2 } },
        });
      }),
    );
    renderPage();
    expect(screen.getByTestId("seed-history-doctrine").textContent).toContain(
      "context, not current work",
    );
    await userEvent.type(screen.getByTestId("seed-history-period"), "2025 Q3");
    await userEvent.click(screen.getByTestId("seed-history-text"));
    await userEvent.paste("Old meeting: David agreed to own repo access.");
    await userEvent.click(screen.getByTestId("seed-history-review"));
    const confirm = await screen.findByTestId("seed-history-confirm");
    const copy = confirm.textContent ?? "";
    expect(copy).toContain("No to-dos are created");
    expect(copy).toContain("history never becomes homework");
    expect(copy).toContain("go to Organization Seeding for review");
    expect(copy).toContain("company-owned");
    expect(copy).toContain('seeded history covering 2025 Q3');
    // Review happened — zero writes so far.
    expect(bodies).toEqual([]);
    await userEvent.click(screen.getByTestId("seed-history-confirm-btn"));
    await screen.findByTestId("seed-history-done");
    expect(bodies.length).toBe(1);
    expect(bodies[0]!.seeded_context).toEqual({ covering_period: "2025 Q3" });
    expect(bodies[0]).not.toHaveProperty("provided_by");
    expect(screen.getByTestId("seed-history-summary").textContent).toContain(
      "2 context records were created",
    );
    expect(screen.getByTestId("seed-history-summary").textContent).toContain(
      "not to-dos",
    );
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(body).not.toMatch(/seeded_context|VERIFIED|OPERATION_NOT_PERMITTED/);
  });

  it("a non-admin gets honest copy and nothing-was-created framing", async () => {
    server.use(
      http.post(`${API}/otzar/comms/ingest`, () =>
        HttpResponse.json(
          { ok: false, code: "OPERATION_NOT_PERMITTED", message: "denied" },
          { status: 403 },
        ),
      ),
    );
    renderPage();
    await userEvent.click(screen.getByTestId("seed-history-text"));
    await userEvent.paste("Old notes.");
    await userEvent.click(screen.getByTestId("seed-history-review"));
    await userEvent.click(await screen.findByTestId("seed-history-confirm-btn"));
    const failed = await screen.findByTestId("seed-history-failed");
    expect(failed.textContent).toContain("Nothing was seeded");
    expect(screen.getByTestId("seed-history-error").textContent).toContain(
      "requires admin authority",
    );
  });
});
