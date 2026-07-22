// FILE: AdminSidebar.tsx
// PURPOSE: Left navigation rail. Renders the NAV list, highlights the
//          active route, and surfaces the Approvals badge driven by
//          /org/analytics.pending_approvals_count.
// CONNECTS TO: src/lib/nav.ts, src/hooks/use-pending-approvals.ts.

import { NavLink } from "react-router-dom";
import { NAV, NAV_GROUP_ORDER } from "@/lib/nav";
import { usePendingApprovals } from "@/hooks/use-pending-approvals";
import { useReviewableCount } from "@/hooks/use-reviewable-count";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { OtzarBrandLogo } from "@/components/ambient/OtzarBrandLogo";

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: pendingCount } = usePendingApprovals();
  const { data: reviewCount } = useReviewableCount();
  // [OTZAR-V1-LIVE-1B] Placeholder screens (comingSoon) are hidden from the nav
  // by default so v1 validation never walks a teammate into a "reserved screen".
  // Their routes remain registered (App.tsx) — only the nav entry is hidden.
  // Set VITE_SHOW_COMING_SOON=true to reveal them (e.g. during admin dev work).
  const showComingSoon = import.meta.env.VITE_SHOW_COMING_SOON === "true";
  const visibleNav = showComingSoon
    ? NAV
    : NAV.filter((item) => item.comingSoon !== true && item.hidden !== true);

  return (
    <nav
      aria-label="Otzar Admin navigation"
      // Phase-F — luminous glass rail over ambient field; never flat SaaS panel.
      className="flex h-full flex-col border-r border-white/10 bg-gradient-to-b from-[#1e1b4b]/88 to-[#0a0612]/78 shadow-[12px_0_40px_-18px_rgba(177,36,232,0.28)] backdrop-blur-2xl backdrop-saturate-150"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <OtzarBrandLogo size="lg" tone="brand" polish />
        <div>
          <div className="otzar-text-luminous text-sm font-semibold leading-tight tracking-tight">
            Otzar
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a855f7]/90">
            Control Tower
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-2 pb-4">
        {/* Phase 1255 slice 2 — OS-style sections: the admin governs
            an enterprise, not a flat list of pages. */}
        {NAV_GROUP_ORDER.map((group) => {
          const itemsInGroup = visibleNav.filter((item) => item.group === group);
          // A section whose only members are hidden stubs renders nothing —
          // no bare header. Keeps the production surface calm.
          if (itemsInGroup.length === 0) return null;
          return (
          <div key={group} data-testid="admin-nav-group" data-group={group}>
            <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a855f7]/75">
              {group}
            </p>
            <ul className="space-y-1.5">
              {itemsInGroup.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-[#B124E8]/28 to-[#405DE6]/12 font-medium text-[#E5E7EC] shadow-[0_6px_20px_-6px_rgba(177,36,232,0.4)] ring-1 ring-[#B124E8]/35"
                        : "text-slate-400 hover:bg-white/5 hover:text-[#E5E7EC]",
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.showApprovalBadge &&
                    typeof pendingCount === "number" &&
                    pendingCount > 0 && (
                      <Badge variant="warning" aria-label={`${pendingCount} pending approvals`}>
                        {pendingCount}
                      </Badge>
                    )}
                  {item.showReviewBadge &&
                    typeof reviewCount === "number" &&
                    reviewCount > 0 && (
                      <Badge
                        variant="warning"
                        data-testid="review-nav-badge"
                        aria-label={`${reviewCount} reviews need attention`}
                      >
                        {reviewCount}
                      </Badge>
                    )}
                </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </ScrollArea>
    </nav>
  );
}
