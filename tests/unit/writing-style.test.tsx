// FILE: tests/unit/writing-style.test.tsx
// PURPOSE: [CS-4] the writing-style flow: the raw sample NEVER leaves the
//          browser (the POST carries only guidance + structure — asserted
//          byte-level); deterministic guardrails refuse risky/transcript-
//          like/too-long samples with repair copy; the mechanical mirror
//          reflects structure only; consent checkbox gates the save; the
//          preview shows exactly what will be proposed; boundary copy
//          first; no file input; overclaim/leak sweeps.
// CONNECTS TO: src/lib/twin/style-mirror.ts, src/pages/app/WritingStyle.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { WritingStylePage } from "@/pages/app/WritingStyle";
import {
  SAMPLE_MAX_CHARS,
  checkSample,
  composeStyleGuidance,
  mirrorStructure,
} from "@/lib/twin/style-mirror";

const API = "http://localhost:3000/api/v1";

describe("[CS-4] style-mirror — deterministic guardrails + mechanical mirror", () => {
  it("refuses risky tokens, transcript-shape, and document-length with repair copy; accepts a normal sample", () => {
    expect(checkSample("").ok).toBe(false);
    const risky = checkSample("Quick note — the CONFIDENTIAL roadmap says…");
    expect(risky.ok).toBe(false);
    if (risky.ok === false) expect(risky.message).toContain("company or sensitive content");
    const transcript = checkSample("Alice: hi\nBob: hello there\nCarol: notes from standup\nDave: ok");
    expect(transcript.ok).toBe(false);
    const long = checkSample("word ".repeat(SAMPLE_MAX_CHARS));
    expect(long.ok).toBe(false);
    if (long.ok === false) expect(long.message).toContain(`${SAMPLE_MAX_CHARS}`);
    expect(checkSample("Hey team — quick update. Rollout went well. Next: docs.").ok).toBe(true);
  });

  it("the mirror reflects ONLY mechanical structure; guidance composes own words + structure, capped", () => {
    const structure = mirrorStructure(
      "Hey team — quick one!\n\n- ship it\n- test it\n\nAny blockers? Ping me! Thanks",
    );
    expect(structure).toContain("uses bullet lists");
    expect(structure.join(" ")).not.toMatch(/warm|professional|smart|confident/i); // counts, not judgments
    const guidance = composeStyleGuidance("Warm but direct.", structure);
    expect(guidance).toContain("Warm but direct.");
    expect(guidance).toContain("Observed structure:");
    expect(composeStyleGuidance("x".repeat(1000), []).length).toBeLessThanOrEqual(600);
  });
});

describe("[CS-4] WritingStyle page — sample never transmitted, consent-gated", () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <WritingStylePage />
      </MemoryRouter>,
    );
  }

  it("boundary-first; risky sample blocked at reflect; no file input; nothing posted", async () => {
    const posts: string[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") posts.push(request.url);
    });
    renderPage();
    const boundary = screen.getByTestId("style-boundary").textContent ?? "";
    expect(boundary).toContain("cannot take ownership of company work");
    expect(boundary).toContain("learn style, not facts");
    expect(boundary).toContain("never leaves this page");
    expect(document.querySelector('input[type="file"]')).toBeNull();
    await userEvent.click(screen.getByTestId("style-sample-text"));
    await userEvent.paste("Our NDA and contract details: …");
    await userEvent.click(screen.getByTestId("style-reflect"));
    expect((screen.getByTestId("style-guard").textContent ?? "")).toContain(
      "company or sensitive content",
    );
    expect(posts).toEqual([]);
  });

  it("the POST carries ONLY guidance + structure — never the sample; consent gates; done state honest", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/otzar/twin/calibration`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, action: { action_id: "a", status: "PROPOSED" } }, { status: 201 });
      }),
    );
    renderPage();
    const SAMPLE = "Hey team — quick update! Rollout went well. Any blockers? Ping me. Thanks";
    await userEvent.click(screen.getByTestId("style-sample-text"));
    await userEvent.paste(SAMPLE);
    await userEvent.click(screen.getByTestId("style-reflect"));
    await screen.findByTestId("style-mirror");
    await userEvent.type(screen.getByTestId("style-own-words"), "Warm but direct.");
    // Preview shows exactly what will be proposed.
    const preview = screen.getByTestId("style-proposed").textContent ?? "";
    expect(preview).toContain("Warm but direct.");
    expect(preview).not.toContain("Rollout went well");
    // Consent gates the save.
    expect(screen.getByTestId("style-save")).toBeDisabled();
    await userEvent.click(screen.getByTestId("style-consent-box"));
    await userEvent.click(screen.getByTestId("style-save"));
    await screen.findByTestId("style-done");
    expect(bodies.length).toBe(1);
    const sent = JSON.stringify(bodies[0]);
    expect(bodies[0]).toHaveProperty("writing_style_text");
    expect(Object.keys(bodies[0]!)).toEqual(["writing_style_text"]);
    // THE proof: the raw sample text is nowhere in the request.
    expect(sent).not.toContain("Rollout went well");
    expect(sent).not.toContain(SAMPLE);
    expect(sent).toContain("Warm but direct.");
    const done = screen.getByTestId("style-done-copy").textContent ?? "";
    expect(done).toContain("Nothing is remembered until you approve");
    expect(done).toContain("Your sample was not saved or sent anywhere");
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/portable company data|owns your work|company docs learned|permissions|tools granted/i);
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(body).not.toMatch(/RECORD_CAPSULE|seeded_context|source_lineage/);
  });
});
