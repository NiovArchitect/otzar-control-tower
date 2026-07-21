// FILE: tests/unit/marketplace-discovery.test.tsx
// PURPOSE: Phase 1302-A — locks the Control Tower Marketplace cross-org discovery
//          shell: the catalog renders safe listing metadata; empty + unauthorized
//          states are safe; the type filter re-queries; "Request access" opens an
//          HONEST disclosure (requirements + "access is provider-governed") and
//          NEVER implies a grant or sends a fake request; NO raw content / pricing
//          internals / trust_metadata / full-UUID-as-primary-label ever appears;
//          the nav entry exists.
// CONNECTS TO: src/pages/MarketplaceDiscovery.tsx, src/lib/api.ts, src/lib/nav.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { server } from "../msw/server";
import { MarketplaceDiscoveryPage } from "@/pages/MarketplaceDiscovery";
import { useAuthStore } from "@/lib/stores/auth";
import { NAV } from "@/lib/nav";

const API_BASE = "http://localhost:3000/api/v1";
const DISCOVER = `${API_BASE}/foundation/marketplace/discover`;
const PROVIDER_UUID = "11111111-2222-3333-4444-555555555555";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "buyer@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: true,
      can_admin_niov: false,
    },
  } as never);
}

function listing(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    listing_id: "lst-1",
    listing_type: "TOOL",
    provider_entity_id: PROVIDER_UUID,
    title: "Cross-org Summarizer",
    description: "A governed summarization tool shared across orgs.",
    version: "1.2.0",
    pricing_model: { model: "PER_USE", amount_usd: 0.02 },
    required_authority: ["READ_DOMAIN"],
    required_memory_scope: ["DOMAIN_KNOWLEDGE"],
    trust_metadata: { attestation: "provider-signed" },
    status: "PUBLISHED",
    discovery_scope: "CROSS_ORG",
    created_at: new Date().toISOString(),
    ...over,
  };
}

// Mock /discover. Optionally branch on the listing_type query param.
function mockDiscover(byType: (type: string | null) => unknown[]): void {
  server.use(
    http.get(DISCOVER, ({ request }) => {
      const type = new URL(request.url).searchParams.get("listing_type");
      return HttpResponse.json({ ok: true, listings: byType(type) });
    }),
  );
}
function mockDiscoverError(status: number, code: string): void {
  server.use(http.get(DISCOVER, () => HttpResponse.json({ ok: false, code }, { status })));
}

function renderPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MarketplaceDiscoveryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

describe("Marketplace discovery — nav + render", () => {
  it("the nav registers Marketplace as advanced Diagnostics (hidden)", () => {
    const item = NAV.find((n) => n.to === "/marketplace");
    expect(item).toBeDefined();
    expect(item?.group).toBe("Diagnostics");
    expect(item?.hidden).toBe(true);
  });

  it("renders the page with a safe subtitle (access stays governed by the provider)", async () => {
    mockDiscover(() => []);
    renderPage();
    expect(await screen.findByTestId("marketplace-discovery-page")).toBeInTheDocument();
    expect(screen.getByText(/access stays governed by the provider/i)).toBeInTheDocument();
  });
});

describe("Marketplace discovery — catalog", () => {
  it("renders cross-org listing cards with safe metadata + advisory price", async () => {
    mockDiscover(() => [listing()]);
    renderPage();
    const card = await screen.findByTestId("discovery-listing-card");
    expect(within(card).getByText("Cross-org Summarizer")).toBeInTheDocument();
    expect(within(card).getByText(/Tool · v1\.2\.0/)).toBeInTheDocument();
    expect(within(card).getByTestId("advisory-price")).toHaveTextContent("~$0.02 (advisory)");
    // Cross-org reach badge.
    expect(within(card).getByText("Cross-org")).toBeInTheDocument();
  });

  it("shows a safe empty state when no cross-org listings exist", async () => {
    mockDiscover(() => []);
    renderPage();
    expect(await screen.findByTestId("discovery-empty")).toBeInTheDocument();
    expect(screen.getByText(/opts a published listing into cross-org sharing/i)).toBeInTheDocument();
  });

  it("surfaces an auth error safely (no crash, honest message)", async () => {
    mockDiscoverError(401, "SESSION_INVALID");
    renderPage();
    expect(await screen.findByTestId("discovery-error")).toHaveTextContent(/session has expired/i);
  });

  it("the type filter re-queries with the selected listing_type", async () => {
    mockDiscover((type) =>
      type === "DATA_PACKAGE"
        ? [listing({ listing_id: "dp-1", listing_type: "DATA_PACKAGE", title: "Signals Package" })]
        : [listing({ listing_id: "lst-1", title: "Cross-org Summarizer" })],
    );
    renderPage();
    expect(await screen.findByText("Cross-org Summarizer")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("filter-DATA_PACKAGE"));
    expect(await screen.findByText("Signals Package")).toBeInTheDocument();
    expect(screen.queryByText("Cross-org Summarizer")).toBeNull();
  });
});

describe("Marketplace discovery — honest request-access (no fakery)", () => {
  it("opens a disclosure showing requirements + states access is provider-governed; never implies a grant", async () => {
    mockDiscover(() => [listing()]);
    renderPage();
    const card = await screen.findByTestId("discovery-listing-card");
    await userEvent.click(within(card).getByTestId("request-access-button"));

    const drawer = await screen.findByTestId("request-access-drawer");
    // Requirements are surfaced (read-only).
    expect(within(drawer).getByTestId("req-authority")).toHaveTextContent("Read domain");
    expect(within(drawer).getByTestId("req-memory-scope")).toHaveTextContent("Domain knowledge");
    // Honest, non-consummating language.
    expect(within(drawer).getByText(/does not grant access and does not send a request/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/never granted by browsing/i)).toBeInTheDocument();
    // No fake "request sent" / "submitted" / "granted" confirmation anywhere.
    expect(screen.queryByText(/request (sent|submitted)/i)).toBeNull();
    expect(screen.queryByText(/access granted/i)).toBeNull();
  });
});

describe("Marketplace discovery — no leak", () => {
  it("never renders raw content / pricing internals / trust_metadata / full provider UUID", async () => {
    mockDiscover(() => [listing()]);
    renderPage();
    await screen.findByTestId("discovery-listing-card");
    const text = document.body.textContent ?? "";
    // Advisory price label only — never the raw pricing model token.
    expect(text).not.toContain("PER_USE");
    // trust_metadata internals never rendered.
    expect(text).not.toContain("provider-signed");
    expect(text).not.toContain("attestation");
    // Raw capsule/storage/embedding/hash never present.
    for (const forbidden of ["storage_location", "payload_content", "embedding", "content_hash"]) {
      expect(text).not.toContain(forbidden);
    }
    // Provider id appears only as a short non-primary reference, never the full UUID.
    expect(text).not.toContain(PROVIDER_UUID);
    expect(text).toContain("11111111");
  });
});
