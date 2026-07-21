// FILE: tests/unit/my-work.test.tsx
// PURPOSE: My Work human buckets: Needs review / To do / …; Meetings+Done
//          collapse by default; urgent work stays expanded.
// CONNECTS TO: src/pages/app/MyWork.tsx + CollapsibleSection.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyWork } from "@/pages/app/MyWork";
import { useAuthStore } from "@/lib/stores/auth";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: false, can_admin_org: true, can_admin_niov: false },
  });
}

function entry(over: Partial<WorkLedgerEntryView> & { ledger_entry_id: string }): WorkLedgerEntryView {
  return {
    ledger_type: "TASK",
    source_type: "CHAT",
    status: "PROPOSED",
    priority: "ROUTINE",
    title: "Untitled",
    owner_entity_id: null,
    requester_entity_id: null,
    target_entity_id: null,
    ...over,
  } as WorkLedgerEntryView;
}

function mockMyWork(items: WorkLedgerEntryView[]): void {
  server.use(http.get(`${API_BASE}/work-os/my-work`, () => HttpResponse.json({ ok: true, items })));
}

function renderPage(): void {
  render(<MyWork />);
}

beforeEach(() => setAuth());

describe("MyWork — ambient collapsible sections", () => {
  it("leads with high-priority buckets expanded and collapses meetings by default", async () => {
    mockMyWork([
      entry({ ledger_entry_id: "need", status: "NEEDS_OWNER", title: "Needs an owner" }), // Needs review
      entry({
        ledger_entry_id: "meet",
        ledger_type: "MEETING",
        status: "PROPOSED",
        title: "Launch sync",
      }), // Meetings — collapsed
    ]);
    renderPage();
    const needsSection = (await waitFor(() => {
      const s = screen
        .getByTestId("my-work-page")
        .querySelector('[data-bucket="Needs review"]');
      expect(s).not.toBeNull();
      return s;
    })) as HTMLElement;
    expect(needsSection.getAttribute("data-bucket")).toBe("Needs review");
    expect(within(needsSection as HTMLElement).getByText("Needs an owner")).toBeInTheDocument();
    expect(needsSection.querySelector('[data-testid="my-work-section"]')!.getAttribute("data-open")).toBe("true");

    const meetSection = screen.getByTestId("my-work-page").querySelector('[data-bucket="Meetings"]')!;
    expect(meetSection.querySelector('[data-testid="my-work-section"]')!.getAttribute("data-open")).toBe("false");
    expect(within(meetSection as HTMLElement).queryByText("Launch sync")).toBeNull();
  });

  it("expanding a collapsed section reveals its items (nothing is lost)", async () => {
    mockMyWork([entry({ ledger_entry_id: "recent", ledger_type: "MEETING", status: "PROPOSED", title: "Launch sync" })]);
    renderPage();
    const section = (await waitFor(() => {
      const s = screen
        .getByTestId("my-work-page")
        .querySelector('[data-bucket="Meetings"]');
      expect(s).not.toBeNull();
      return s;
    })) as HTMLElement;
    expect(within(section).queryByText("Launch sync")).toBeNull(); // collapsed
    await userEvent.click(within(section as HTMLElement).getByTestId("collapsible-toggle"));
    expect(within(section as HTMLElement).getByText("Launch sync")).toBeInTheDocument(); // revealed
  });
});
