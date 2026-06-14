// FILE: person-cockpit.test.tsx
// PURPOSE: Phase 1285 slice 2 — People & Collaboration person cards are
//          clickable and open a relationship cockpit that shows the REAL
//          direct thread and can message the person via the governed
//          human-authority path. No manual target-id as primary UX.
// CONNECTS TO: src/components/otzar/PeopleDirectory.tsx + PersonCockpit.tsx

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { PeopleDirectory } from "@/components/otzar/PeopleDirectory";

const API = "http://localhost:3000/api/v1";

function mockRoster() {
  server.use(
    http.get(`${API}/otzar/my-twin/context-health`, () =>
      HttpResponse.json({
        phase: "READY",
        identity: {
          org: { org_id: "o-1", name: "NIOV Labs", domain: "niovlabs.com" },
          org_roster: [
            {
              entity_id: "ent-david",
              display_name: "David Odie",
              title: "TECH LEAD",
              shared_project_count: 3,
              recent_collab_count: 1,
            },
          ],
        },
      }),
    ),
  );
}

describe("People & Collaboration person cockpit", () => {
  it("opens a cockpit on click and shows the real direct thread", async () => {
    mockRoster();
    server.use(
      http.get(`${API}/work-os/threads/with/:id`, () =>
        HttpResponse.json({
          ok: true,
          messages: [
            { message_id: "m1", sender_entity_id: "ent-sadeil", sender_display_name: "Sadeil", sender_role_title: "Founder", body: "Good afternoon", created_at: "x", from_me: false },
            { message_id: "m2", sender_entity_id: "me", sender_display_name: "You", sender_role_title: null, body: "On it", created_at: "x", from_me: true },
          ],
        }),
      ),
    );
    render(<PeopleDirectory />);
    const openBtn = await screen.findByTestId("people-directory-card-open");
    fireEvent.click(openBtn);
    const cockpit = await screen.findByTestId("person-cockpit");
    expect(cockpit).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("person-cockpit-thread").textContent).toContain("Good afternoon"),
    );
  });

  it("messages the person via the human-authority path (no target-id typing)", async () => {
    mockRoster();
    let posted: { recipient?: string; message?: string } = {};
    server.use(
      http.get(`${API}/work-os/threads/with/:id`, () => HttpResponse.json({ ok: true, messages: [] })),
      http.post(`${API}/work-os/internal-messages`, async ({ request }) => {
        posted = (await request.json()) as { recipient?: string; message?: string };
        return HttpResponse.json(
          { ok: true, status: "DELIVERED", notification_id: "n1", recipient_display_name: "David Odie" },
          { status: 201 },
        );
      }),
    );
    render(<PeopleDirectory />);
    fireEvent.click(await screen.findByTestId("people-directory-card-open"));
    await screen.findByTestId("person-cockpit");
    fireEvent.change(screen.getByTestId("person-cockpit-compose"), {
      target: { value: "Quick question about the proof layer" },
    });
    fireEvent.click(screen.getByTestId("person-cockpit-send"));
    await waitFor(() => expect(screen.getByTestId("person-cockpit-sent")).toBeTruthy());
    expect(posted.recipient).toBe("ent-david"); // resolved entity_id, not typed
    expect(posted.message).toContain("proof layer");
  });

  it("shows an honest empty state when there is no thread yet", async () => {
    mockRoster();
    server.use(
      http.get(`${API}/work-os/threads/with/:id`, () => HttpResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 })),
    );
    render(<PeopleDirectory />);
    fireEvent.click(await screen.findByTestId("people-directory-card-open"));
    await waitFor(() =>
      expect(screen.getByTestId("person-cockpit-no-thread").textContent).toContain("No messages"),
    );
  });
});
