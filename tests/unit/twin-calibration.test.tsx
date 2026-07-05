// FILE: tests/unit/twin-calibration.test.tsx
// PURPOSE: [CS-3] the Calibrate My AI Twin page: boundary copy renders
//          FIRST and always; all seven approved fields exist (four
//          enumerated + three text); NO file input exists anywhere; no
//          write fires before explicit save; the save posts only trimmed,
//          capped plain-text fields; the done state explains the consent
//          gate (approve in Action Center, revocable); failure is honest;
//          leak + overclaim sweeps pass.
// CONNECTS TO: src/pages/app/TwinCalibration.tsx, api.otzar.twinCalibration.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { TwinCalibrationPage } from "@/pages/app/TwinCalibration";

const API = "http://localhost:3000/api/v1";

function renderPage() {
  return render(
    <MemoryRouter>
      <TwinCalibrationPage />
    </MemoryRouter>,
  );
}

describe("[CS-3] Calibrate My AI Twin — boundary-first, consent-gated", () => {
  it("boundary copy renders first; all fields exist; no file input; nothing posts before save", async () => {
    const posts: unknown[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") posts.push(request.url);
    });
    renderPage();
    const boundary = screen.getByTestId("calibration-boundary").textContent ?? "";
    expect(boundary).toContain("learn the shape of how you work");
    expect(boundary).toContain("cannot take ownership of company work");
    expect(boundary).toContain("Do not paste confidential company documents");
    expect(boundary).toContain("stay governed by your organization");
    expect(boundary).toContain("Your organization's policies still apply");
    // All seven approved fields.
    for (const key of [
      "summary_preference", "tone_preference", "reminder_preference",
      "decision_support_preference", "writing_style_text", "current_focus_text", "do_not_do_text",
    ]) {
      expect(screen.getByTestId(`calibration-${key}`)).toBeInTheDocument();
    }
    // NO file upload anywhere; no authority/secret fields.
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/upload|password|token|admin authority|permission/i);
    // Save disabled until something is provided; nothing posted yet.
    expect(screen.getByTestId("calibration-save")).toBeDisabled();
    await userEvent.click(screen.getByText("Warm and direct"));
    expect(posts).toEqual([]);
  });

  it("save posts only the chosen fields; done state explains approval + revocation; overclaim sweep", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/otzar/twin/calibration`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, action: { action_id: "a", status: "PROPOSED" } }, { status: 201 });
      }),
    );
    renderPage();
    await userEvent.click(screen.getByText("Concise bullets"));
    await userEvent.click(screen.getByText("Ask before acting"));
    await userEvent.type(
      screen.getByTestId("calibration-do_not_do_text"),
      "Do not send anything without asking.  ",
    );
    await userEvent.click(screen.getByTestId("calibration-save"));
    await screen.findByTestId("calibration-done");
    expect(bodies.length).toBe(1);
    expect(bodies[0]).toEqual({
      summary_preference: "Concise bullets",
      decision_support_preference: "Ask before acting",
      do_not_do_text: "Do not send anything without asking.",
    });
    const done = screen.getByTestId("calibration-done-copy").textContent ?? "";
    expect(done).toContain("Nothing is remembered without you");
    expect(done).toContain("approve the proposed memory");
    expect(done).toContain("revoke it any time");
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/portable company data|owns your work|learns all company|permissions changed|tools granted/i);
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(body).not.toMatch(/RECORD_CAPSULE|PREFERENCE|PROPOSED/);
  });

  it("failure reads honestly — nothing stored", async () => {
    server.use(
      http.post(`${API}/otzar/twin/calibration`, () =>
        HttpResponse.json({ ok: false, code: "NOTHING_TO_REMEMBER" }, { status: 422 }),
      ),
    );
    renderPage();
    await userEvent.click(screen.getByText("Remind me early"));
    await userEvent.click(screen.getByTestId("calibration-save"));
    const err = await screen.findByTestId("calibration-error");
    expect(err.textContent).toContain("Nothing was stored");
  });
});
