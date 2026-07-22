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
      className="flex h-full flex-col border-r border-[#1e1b4b]/08 bg-white/90 shadow-[4px_0_24px_-12px_rgba(30,27,75,0.08)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-[#1e1b4b]/08 px-4 py-5">
        <OtzarBrandLogo size="lg" tone="brand" polish />
        <div>
          <div className="otzar-text-luminous text-sm font-semibold leading-tight tracking-tight">
            Otzar
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B124E8]">
            Control Tower
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-2 pb-4">
        {NAV_GROUP_ORDER.map((group) => {
          const itemsInGroup = visibleNav.filter((item) => item.group === group);
          if (itemsInGroup.length === 0) return null;
          return (
          <div key={group} data-testid="admin-nav-group" data-group={group}>
            <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B124E8]/80">
              {group}
            </p>
            <ul className="space-y-1">
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                      isActive
                        ? "bg-[#B124E8]/10 font-semibold text-[#1e1b4b] shadow-[0_4px_14px_-6px_rgba(177,36,232,0.25)] ring-1 ring-[#B124E8]/20"
                        : "text-[#5c5a78] hover:bg-[#B124E8]/06 hover:text-[#1e1b4b]",
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
