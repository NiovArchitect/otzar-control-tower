// FILE: AdminOrganizationEntry.tsx
// PURPOSE: Founder/admin-visible entry to Organization discovery on the
//          post-login employee Today surface. Login always lands /app;
//          "Otzar found" lives under Control Tower /setup — this card makes
//          that path impossible to miss without changing landingPathFor.
// CONNECTS TO: deriveOrgDiscovery, OrgSetup (/setup), Employee shell.

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { deriveOrgDiscovery } from "@/lib/setup/org-discovery";

/**
 * Compact enterprise strip: only for org admins on the employee shell.
 * Surfaces live discovery counts and deep-links to Organization setup.
 */
export function AdminOrganizationEntry(): JSX.Element | null {
  const capabilities = useAuthStore((s) => s.capabilities);
  const admin = isOrgAdmin(capabilities);

  const people = useQuery({
    queryKey: ["org", "entities", "admin-org-entry"],
    enabled: admin,
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      return r.ok ? r.data.items : null;
    },
    staleTime: 60_000,
  });
  const hierarchy = useQuery({
    queryKey: ["org", "hierarchy", "admin-org-entry"],
    enabled: admin,
    queryFn: async () => {
      const r = await api.org.hierarchy.get();
      return r.ok ? r.data : null;
    },
    staleTime: 60_000,
  });
  const seeds = useQuery({
    queryKey: ["org", "dandelion", "seeds", "admin-org-entry"],
    enabled: admin,
    queryFn: async () => {
      const r = await api.otzar.dandelionSeeds.list();
      return r.ok ? r.data.seeds : null;
    },
    staleTime: 60_000,
  });

  if (!admin) return null;

  const discovery = deriveOrgDiscovery({
    people: people.data ?? null,
    memberships: hierarchy.data?.memberships ?? null,
    seeds: seeds.data ?? null,
    orgEntityId: hierarchy.data?.org_entity_id ?? null,
  });

  const loading = people.isLoading || hierarchy.isLoading || seeds.isLoading;
  const review = discovery.openSeedCount;
  const peopleN = discovery.activePeopleCount;

  const signalLine = loading
    ? "Loading organization signal…"
    : discovery.available
      ? review > 0
        ? `${peopleN} people · ${review} need review`
        : peopleN > 0
          ? `${peopleN} people · structure calm`
          : "Open Organization to review what Otzar found"
      : "Open Organization setup";

  return (
    <Link
      to="/setup"
      data-testid="admin-organization-entry"
      className="otzar-edge-trace otzar-glass-card group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition hover:-translate-y-0.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B124E8]/10 text-[#B124E8]">
        <Building2 className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-[#1e1b4b]">
          Otzar found
        </span>
        <span
          className="mt-0.5 block truncate text-xs text-[#5c5a78]"
          data-testid="admin-organization-entry-signal"
        >
          {signalLine}
        </span>
      </span>
      <span className="otzar-cta-fill inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium">
        Organization
        <ArrowRight
          className="h-3 w-3 transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
