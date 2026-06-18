// FILE: use-reviewable-count.ts
// PURPOSE: Phase 1300-B — TanStack Query hook polling the Foundation
//          org-reviewable review list for the sidebar Review Center badge.
//          Returns the count of reviews PENDING in the caller's provider org
//          that an authorized org reviewer can act on. An unauthorized /
//          cross-tenant / non-human caller gets an empty list (count 0) so the
//          badge simply disappears — visibility is authority-bound, never a
//          misleading global count.
// CONNECTS TO: AdminSidebar (badge value), api.reviews.list.

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useReviewableCount() {
  return useQuery({
    queryKey: ["reviews", "org_reviewable", "badge-count"],
    queryFn: () => api.reviews.list("org_reviewable"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    // Prefer the backend summary's pending count; fall back to the returned
    // page length. null when the call fails (badge hidden).
    select: (result) =>
      result.ok
        ? (result.data.summary?.pending_review_count ?? result.data.reviews.length)
        : null,
  });
}
