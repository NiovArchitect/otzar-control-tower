// FILE: MarketplaceDiscovery.tsx
// PURPOSE: Phase 1302-A — the Control Tower "Marketplace" cross-org discovery
//          shell over Foundation's 1301-A /marketplace/discover surface. It is a
//          READ-ONLY catalog browser: it lists the SAFE metadata projection of
//          listings other organizations have explicitly opted into cross-org
//          reach (CROSS_ORG). Browsing GRANTS NOTHING.
//
//          HONEST REQUEST-ACCESS. There is no cross-org access endpoint yet, so
//          "Request access" here NEVER implies a grant and NEVER sends a fake
//          request. It only surfaces the listing's stated requirements and states
//          plainly that access is governed by the provider. No mutation is made.
//
//          SAFE-LABELS-ONLY. Never displays raw capsule body, payload, storage
//          location, embeddings, content_hash, secrets, raw pricing internals, or
//          provider/buyer secrets. Entity ids are never primary labels (a short
//          reference only). High-sensitivity products never appear (Foundation
//          enforces set-time + read-time exclusion).
//
// CONNECTS TO: src/lib/api.ts (api.marketplace.discover), src/lib/types/foundation.ts
//              (DiscoveredListing), src/lib/nav.ts + src/App.tsx (route).

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DiscoveredListing,
  MarketplaceListingType,
} from "@/lib/types/foundation";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Avp2GovernedAccessCard } from "@/components/otzar/Avp2GovernedAccessCard";

// ── Safe closed-vocab label helpers (never raw tokens / UUIDs) ──────────────

function sentence(token: string): string {
  const w = token.toLowerCase().split("_").filter((x) => x.length > 0);
  if (w.length === 0) return token;
  const s = w.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function humanizeType(t: string): string {
  const m: Record<string, string> = {
    AGENT: "Agent",
    SKILL: "Skill",
    TOOL: "Tool",
    DEVICE: "Device",
    APP: "App",
    WORLD: "World",
    CONNECTOR: "Connector",
    SERVICE: "Service",
    DATA_PACKAGE: "Data package",
  };
  return m[t] ?? sentence(t);
}
// A short, non-primary reference for an id (never the primary label).
function shortRef(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}
// Advisory price label only — never raw pricing internals. Returns null when free
// or unparseable.
function advisoryPriceLabel(pricing: unknown): string | null {
  if (pricing !== null && typeof pricing === "object") {
    const amt = (pricing as Record<string, unknown>).amount_usd;
    if (typeof amt === "number" && Number.isFinite(amt) && amt > 0) {
      return `~$${amt} (advisory)`;
    }
  }
  return null;
}

// The discoverable listing-type filter chips. "All" clears the filter.
const TYPE_FILTERS: ReadonlyArray<{ label: string; value: MarketplaceListingType | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Agents", value: "AGENT" },
  { label: "Skills", value: "SKILL" },
  { label: "Tools", value: "TOOL" },
  { label: "Services", value: "SERVICE" },
  { label: "Data packages", value: "DATA_PACKAGE" },
];

function discoverError(code: string): string {
  const m: Record<string, string> = {
    SESSION_INVALID: "Your session has expired. Sign in again.",
    SESSION_INVALIDATED: "Your session has expired. Sign in again.",
  };
  return m[code] ?? "Could not load the marketplace catalog. Try again.";
}

// ── Request-access disclosure (honest; non-consummating) ────────────────────

function RequestAccessDrawer({
  listing,
  open,
  onOpenChange,
}: {
  listing: DiscoveredListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="request-access-drawer"
      >
        <SheetTitle>Request access</SheetTitle>
        <SheetDescription className="mb-4">
          Access is governed by the provider. This shows what the listing requires —
          it does not grant access and does not send a request.
        </SheetDescription>
        {listing === null ? null : (
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-medium">{listing.title}</div>
              <div className="text-xs text-muted-foreground">
                {humanizeType(listing.listing_type)} · v{listing.version}
              </div>
            </div>

            <div>
              <div className="mb-1 font-medium">Required authority</div>
              {listing.required_authority.length > 0 ? (
                <div className="flex flex-wrap gap-1" data-testid="req-authority">
                  {listing.required_authority.map((a) => (
                    <Badge key={a} variant="outline">{sentence(a)}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None stated.</p>
              )}
            </div>

            <div>
              <div className="mb-1 font-medium">Required memory scope</div>
              {listing.required_memory_scope.length > 0 ? (
                <div className="flex flex-wrap gap-1" data-testid="req-memory-scope">
                  {listing.required_memory_scope.map((s) => (
                    <Badge key={s} variant="outline">{sentence(s)}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None stated.</p>
              )}
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                Listing access is never granted by browsing. A memory scope still
                requires an explicit, governed permission from the provider — it is
                not granted by this listing. To pursue access, the provider's
                governed grant flow applies.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Listing card ────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  onRequestAccess,
}: {
  listing: DiscoveredListing;
  onRequestAccess: (l: DiscoveredListing) => void;
}): JSX.Element {
  const price = advisoryPriceLabel(listing.pricing_model);
  return (
    <Card data-testid="discovery-listing-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium" title={listing.title}>{listing.title}</div>
            <div className="text-xs text-muted-foreground">
              {humanizeType(listing.listing_type)} · v{listing.version}
            </div>
          </div>
          <Badge variant="secondary">Cross-org</Badge>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">{listing.description}</p>

        {(listing.required_authority.length > 0 || listing.required_memory_scope.length > 0) ? (
          <div className="flex flex-wrap gap-1">
            {listing.required_authority.slice(0, 4).map((a) => (
              <Badge key={`a-${a}`} variant="outline">{sentence(a)}</Badge>
            ))}
            {listing.required_memory_scope.slice(0, 4).map((s) => (
              <Badge key={`m-${s}`} variant="outline">{sentence(s)}</Badge>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {price !== null ? <span data-testid="advisory-price">{price}</span> : <span>Free</span>}
            <span className="mx-2">·</span>
            <span title="Provider reference (not a primary label)">Provider {shortRef(listing.provider_entity_id)}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRequestAccess(listing)}
            data-testid="request-access-button"
            aria-label={`Request access to ${listing.title}`}
          >
            Request access
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function MarketplaceDiscoveryPage(): JSX.Element {
  const [typeFilter, setTypeFilter] = useState<MarketplaceListingType | "ALL">("ALL");
  const [selected, setSelected] = useState<DiscoveredListing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useQuery({
    queryKey: ["marketplace-discover", typeFilter],
    queryFn: () =>
      api.marketplace.discover(typeFilter === "ALL" ? undefined : typeFilter),
  });

  function openRequestAccess(l: DiscoveredListing): void {
    setSelected(l);
    setDrawerOpen(true);
  }

  const listings: DiscoveredListing[] =
    query.data?.ok === true ? query.data.data.listings : [];

  return (
    <div className="space-y-6" data-testid="marketplace-discovery-page">
      <PageHeader
        title="Marketplace"
        description="Listings other organizations have opted into sharing across orgs. Browse safe metadata only — access stays governed by the provider."
      />

      <Avp2GovernedAccessCard />

      <div className="flex flex-wrap gap-2" data-testid="discovery-type-filters">
        {TYPE_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={typeFilter === f.value ? "default" : "outline"}
            onClick={() => setTypeFilter(f.value)}
            data-testid={`filter-${f.value}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.data && !query.data.ok ? (
        <p className="text-sm text-destructive" data-testid="discovery-error">
          {discoverError(query.data.code)}
        </p>
      ) : listings.length === 0 ? (
        <Card data-testid="discovery-empty">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No cross-org listings are available yet. Listings appear here only when
            a provider opts a published listing into cross-org sharing.
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="discovery-grid"
        >
          {listings.map((l) => (
            <ListingCard key={l.listing_id} listing={l} onRequestAccess={openRequestAccess} />
          ))}
        </div>
      )}

      <RequestAccessDrawer
        listing={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
