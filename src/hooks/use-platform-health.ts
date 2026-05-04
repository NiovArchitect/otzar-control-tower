// FILE: use-platform-health.ts
// PURPOSE: TanStack Query hook polling Foundation's GET /platform/health
//          every 30 seconds for the footer ConnectionStatusIndicator.
// CONNECTS TO: src/lib/api.ts, ConnectionStatusIndicator.

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePlatformHealth() {
  return useQuery({
    queryKey: ["platform", "health"],
    queryFn: () => api.platform.health(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
