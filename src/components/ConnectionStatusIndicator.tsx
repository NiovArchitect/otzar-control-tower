// FILE: ConnectionStatusIndicator.tsx
// PURPOSE: Footer pill showing the live status of Foundation's
//          GET /platform/health. Operator can tell at a glance whether
//          their Control Tower is talking to the API.
// CONNECTS TO: src/hooks/use-platform-health.ts, Layout footer.
//
// [DEMO-POLISH] The "Foundation {version} · DB {status}" pill reads dev-ish on a
// customer/investor demo. In a PRODUCTION build we hide the healthy + loading
// states (silence == healthy) while STILL running the health check and STILL
// surfacing the ERROR state ("Foundation unreachable") — so operators never lose
// the signal that actually matters (the API being down). In dev the full pill
// shows as before. No monitoring/health behavior changed.

import { Activity, AlertCircle, Loader2 } from "lucide-react";
import { usePlatformHealth } from "@/hooks/use-platform-health";
import { cn } from "@/lib/utils";

// Show the reassuring/loading pill only in development; production stays quiet
// unless something is actually wrong.
const SHOW_HEALTHY_PILL = import.meta.env.DEV;

export function ConnectionStatusIndicator() {
  const { data, isLoading, isError } = usePlatformHealth();

  if (isLoading) {
    if (!SHOW_HEALTHY_PILL) return null;
    return (
      <Pill tone="muted" icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}>
        Checking Foundation...
      </Pill>
    );
  }

  if (isError || !data || !data.ok) {
    // Always surfaced — a down API is an operator signal, not dev chrome.
    return (
      <Pill tone="error" icon={<AlertCircle className="h-3.5 w-3.5" />}>
        Foundation unreachable
      </Pill>
    );
  }

  if (!SHOW_HEALTHY_PILL) return null;

  const healthy = data.data.database === "connected";
  return (
    <Pill
      tone={healthy ? "ok" : "warn"}
      icon={<Activity className="h-3.5 w-3.5" />}
    >
      Foundation {data.data.version} · DB {data.data.database}
    </Pill>
  );
}

function Pill({
  tone,
  icon,
  children,
}: {
  tone: "ok" | "warn" | "error" | "muted";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
        tone === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
        tone === "muted" && "border-border bg-muted text-muted-foreground",
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
