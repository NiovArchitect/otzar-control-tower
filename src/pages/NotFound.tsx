// FILE: NotFound.tsx
// PURPOSE: Catch-all 404 for routes that don't match anything in
//          App.tsx. Reachable inside the authenticated chrome -- the
//          sidebar still works so the operator can recover.
// CONNECTS TO: App.tsx catch-all route.

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Screen not found</h1>
      <p className="max-w-md text-muted-foreground">
        That URL doesn't match any Control Tower screen. Use the sidebar to
        navigate, or head back to the dashboard.
      </p>
      <Button asChild>
        <Link to="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
