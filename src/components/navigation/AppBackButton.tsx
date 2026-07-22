// FILE: AppBackButton.tsx
// PURPOSE: [APP-NAV-CONTINUITY] A consistent upper-left Back / Return
//          affordance for both authenticated shells (admin Control Tower and
//          employee Otzar). It walks the in-app history when there is a prior
//          entry, and otherwise falls back to the shell's safe home — never
//          bouncing the user out of the app or onto /login.
// CONNECTS TO: hosted in Layout.tsx (fallback "/") and employee/EmployeeLayout
//              (fallback "/app"). Its navigations pass through NavigationGuard,
//              so an unsaved form is protected on Back like any other nav.
//
// Not rendered on /login: it lives INSIDE the authenticated shells, which the
// login page never mounts. z-safe: sits in the header's normal flow, below the
// ambient orb (z-60) and the portaled notification dropdown (z-70).

import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface AppBackButtonProps {
  /** Safe home for this shell when there is no in-app history to go back to. */
  fallback: string;
}

export function AppBackButton({ fallback }: AppBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // react-router's history stamps an incrementing `idx` onto history.state.
  // idx > 0  → there IS an in-app entry behind us that navigate(-1) lands on
  //            (login uses replace, so -1 never returns to /login, and the
  //            first in-app entry never steps back to an external referrer).
  // idx === 0 → fresh entry (deep link / new tab): send to the safe home.
  const idx =
    (window.history.state as { idx?: number } | null)?.idx ?? 0;
  const canGoBack = idx > 0;

  // No dead button: hide only when there is genuinely nowhere to go — no in-app
  // history AND already on the fallback home. Otherwise it always has a target.
  if (!canGoBack && location.pathname === fallback) return null;

  return (
    <button
      type="button"
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}
      aria-label="Go back"
      title="Back"
      data-testid="app-back-button"
      className="inline-flex items-center gap-1 rounded-full border border-[#1e1b4b]/10 bg-white/90 px-3.5 py-2 text-sm font-semibold text-[#1e1b4b] shadow-[0_6px_16px_-8px_rgba(30,27,75,0.14)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-10px_rgba(177,36,232,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B124E8]/40"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </button>
  );
}
