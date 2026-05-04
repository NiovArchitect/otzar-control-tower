// FILE: use-pending-approvals.ts
// PURPOSE: TanStack Query hook polling /org/analytics every 60s for
//          the sidebar Approvals badge count.
// CONNECTS TO: AdminSidebar (badge value).

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["org", "analytics", "pending-approvals"],
    queryFn: () => api.org.analytics(),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    select: (result) =>
      result.ok ? result.data.pending_approvals_count : null,
  });
}
