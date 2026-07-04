// FILE: tests/unit/activate-page.test.tsx
// PURPOSE: [P0-ONBOARD] the public activation/reset page: sets a password
//          through POST /auth/activate exactly as typed, blocks weak /
//          mismatched passwords client-side, renders honest human copy for
//          expired/used links (never a raw code), and success routes to
//          sign-in. The token comes from the URL and is never rendered.
// CONNECTS TO: src/pages/Activate.tsx, api.auth.activate.

import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ActivatePage } from "@/pages/Activate";

const API = "http://localhost:3000/api/v1";

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/login" element={<div data-testid="login-stub" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("[P0-ONBOARD] /activate page", () => {
  it("sets the password once and offers sign-in; the token never renders", async () => {
    const posted: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/auth/activate`, async ({ request }) => {
        posted.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, purpose: "ACTIVATION" });
      }),
    );
    renderAt("/activate?token=tok-secret-abc123456");
    await userEvent.type(screen.getByTestId("activate-password"), "brand-new-password-1");
    await userEvent.type(screen.getByTestId("activate-confirm"), "brand-new-password-1");
    expect(document.body.textContent).not.toContain("tok-secret-abc123456");
    await userEvent.click(screen.getByTestId("activate-submit"));
    await screen.findByTestId("activate-success");
    expect(posted).toEqual([
      { token: "tok-secret-abc123456", password: "brand-new-password-1" },
    ]);
    expect(screen.getByTestId("activate-go-login")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("tok-secret-abc123456");
  });

  it("weak or mismatched passwords never submit", async () => {
    renderAt("/activate?token=tok-x-abcdefghijk");
    await userEvent.type(screen.getByTestId("activate-password"), "short");
    await userEvent.type(screen.getByTestId("activate-confirm"), "short");
    expect(screen.getByTestId("activate-submit")).toBeDisabled();
    await userEvent.clear(screen.getByTestId("activate-password"));
    await userEvent.clear(screen.getByTestId("activate-confirm"));
    await userEvent.type(screen.getByTestId("activate-password"), "long-enough-password");
    await userEvent.type(screen.getByTestId("activate-confirm"), "different-password-1");
    expect(screen.getByTestId("activate-submit")).toBeDisabled();
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
  });

  it("expired/used links get honest human copy — no raw codes, no reset-email claim", async () => {
    server.use(
      http.post(`${API}/auth/activate`, () =>
        HttpResponse.json(
          { ok: false, code: "TOKEN_EXPIRED", message: "This link has expired." },
          { status: 410 },
        ),
      ),
    );
    renderAt("/activate?token=tok-old-abcdefghijk");
    await userEvent.type(screen.getByTestId("activate-password"), "long-enough-password");
    await userEvent.type(screen.getByTestId("activate-confirm"), "long-enough-password");
    await userEvent.click(screen.getByTestId("activate-submit"));
    const dead = await screen.findByTestId("activate-dead");
    expect(dead.textContent).toContain("expired or was already used");
    expect(dead.textContent).toContain("Ask your administrator");
    const all = document.body.textContent ?? "";
    expect(all).not.toContain("TOKEN_EXPIRED");
    expect(all).not.toMatch(/email sent|reset email/i);
  });

  it("without a token the form explains what's needed and cannot submit", async () => {
    renderAt("/activate");
    expect(document.body.textContent).toContain(
      "needs the activation link your administrator shared",
    );
    await userEvent.type(screen.getByTestId("activate-password"), "long-enough-password");
    await userEvent.type(screen.getByTestId("activate-confirm"), "long-enough-password");
    await waitFor(() => expect(screen.getByTestId("activate-submit")).toBeDisabled());
  });
});
