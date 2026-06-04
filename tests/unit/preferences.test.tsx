// FILE: tests/unit/preferences.test.tsx
// PURPOSE: Phase 4C — page tests for the Preferences employee surface
//          (EDX-5 TwinCorrectionMemory consumer).
// CONNECTS TO: src/pages/app/Preferences.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Preferences } from "@/pages/app/Preferences";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: false,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Preferences />
    </QueryClientProvider>,
  );
}

const CORRECTION_FIXTURE = {
  correction_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  scope_type: "PERSONAL" as const,
  scope_id: null,
  correction_type: "TONE_PREFERENCE" as const,
  state: "ACTIVE" as const,
  sensitivity_class: "MODERATE" as const,
  retention_class: "STANDARD" as const,
  safe_summary: "Use direct, concise language when summarizing reports.",
  effective_from: new Date().toISOString(),
  expires_at: null,
  revoked_at: null,
  superseded_by_id: null,
  revocable: true,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  setAuth();
});

describe("Preferences page (EDX-5)", () => {
  it("renders friendly header + howitworks + form + active list", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: true, corrections: [CORRECTION_FIXTURE] }),
      ),
    );
    renderPage();
    expect(await screen.findByText("Teach your Twin")).toBeInTheDocument();
    // "Personal items stay personal" appears in both the header copy
    // and the bullet list; assert at least one match.
    expect(
      screen.getAllByText(/Personal items stay personal/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/This is not a performance record\./),
    ).toBeInTheDocument();
    expect(screen.getByTestId("create-preference-form")).toBeInTheDocument();
    expect(
      await screen.findByText(/Use direct, concise language/),
    ).toBeInTheDocument();
  });

  it("create form exposes all 14 correction types + 6 scope types", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: true, corrections: [] }),
      ),
    );
    renderPage();
    const typeSel = await screen.findByTestId("pref-type");
    const scopeSel = screen.getByTestId("pref-scope");
    expect(within(typeSel).getAllByRole("option")).toHaveLength(14);
    expect(within(scopeSel).getAllByRole("option")).toHaveLength(6);
  });

  it("renders Remove button when revocable=true; not when revocable=false", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({
          ok: true,
          corrections: [
            { ...CORRECTION_FIXTURE, safe_summary: "Active — can remove" },
            {
              ...CORRECTION_FIXTURE,
              correction_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
              state: "REVOKED",
              revocable: false,
              safe_summary: "Already removed",
            },
          ],
        }),
      ),
    );
    renderPage();
    await screen.findByText("Active — can remove");
    expect(
      screen.getByTestId(`pref-revoke-${CORRECTION_FIXTURE.correction_id}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        "pref-revoke-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      ),
    ).not.toBeInTheDocument();
  });

  it("never includes performance / score / monitoring / mistake / surveillance copy", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: true, corrections: [CORRECTION_FIXTURE] }),
      ),
    );
    const { container } = renderPage();
    await screen.findByText(/Use direct, concise language/);
    const text = container.textContent ?? "";
    // We DO want the phrase "This is not a performance record." which
    // contains the word "performance" — so we exclude that single match.
    const without = text.replace(/This is not a performance record\./g, "");
    expect(without).not.toMatch(/performance/i);
    expect(text).not.toMatch(/employee score/i);
    expect(text).not.toMatch(/productivity score/i);
    expect(text).not.toMatch(/surveillance/i);
    expect(text).not.toMatch(/mistake dashboard/i);
    expect(text).not.toMatch(/monitor/i);
  });

  it("submitting clears the summary on success", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: true, corrections: [] }),
      ),
      http.post(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json(
          { ok: true, correction: CORRECTION_FIXTURE },
          { status: 201 },
        ),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    const summary = await screen.findByTestId("pref-summary");
    await user.type(summary, "Use last name only for customer feedback");
    await user.click(screen.getByTestId("pref-submit"));
    await screen.findByTestId("pref-summary");
    expect((summary as HTMLTextAreaElement).value).toBe("");
  });
});
