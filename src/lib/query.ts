// FILE: query.ts
// PURPOSE: TanStack Query client config. One QueryClient instance,
//          mounted in App.tsx, shared by every screen.
// CONNECTS TO: App.tsx (QueryClientProvider).

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 5 * 60_000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
