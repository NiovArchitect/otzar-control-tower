// FILE: use-pending-approvals.ts
// PURPOSE: [GAP-F] The sidebar "Pending Approvals" badge consumes the EXACT
//          query the Pending Approvals queue page renders from — same
//          endpoint, same queryKey, same cache entry — so the number on the
//          badge can never disagree with the queue behind it. (It previously
//          counted org-targeted escalations via /org/analytics while the
//          queue listed the CALLER's own pending escalations — two different
//          targets, guaranteed divergence.)
// CONNECTS TO: AdminSidebar (badge value), src/pages/Approvals.tsx (the
//          queue this badge must equal), api.escalations.pending.

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePendingApprovals() {
  return useQuery({
    // IDENTICAL key + fetcher to the Approvals page — one cache entry,
    // two consumers, zero divergence by construction.
    queryKey: ["escalations", "pending"],
    queryFn: () =>
      api.escalations.pending().then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    select: (data) => data.escalations.length,
  });
}
