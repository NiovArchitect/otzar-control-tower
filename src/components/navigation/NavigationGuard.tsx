// FILE: NavigationGuard.tsx
// PURPOSE: [APP-NAV-CONTINUITY] Unsaved-work protection. While any form is
//          dirty (see lib/navigation/unsaved-changes), this:
//            1. arms the browser's native beforeunload prompt — covers hard
//               reload / tab close / external navigation (the one vector an
//               in-app router cannot see);
//            2. blocks EVERY in-app navigation (sidebar, Back button,
//               programmatic redirect) via the data router's useBlocker and
//               shows a calm "You have unsaved changes" confirmation.
//          Never silently discards work; never persists form values anywhere.
// CONNECTS TO: lib/navigation/unsaved-changes.ts, components/ui/dialog,
//              hosted once inside Layout.tsx and employee/EmployeeLayout.tsx.

import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { useHasUnsavedChanges } from "@/lib/navigation/unsaved-changes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function NavigationGuard() {
  const hasUnsaved = useHasUnsavedChanges();

  // (1) Native guard for reload / tab-close / cross-origin nav. Browsers show
  //     their OWN generic prompt and IGNORE custom text by design, so we only
  //     arm/disarm the flag — no copy is passed. This is the only guard that
  //     can catch a hard reload (the exact session-continuity vector).
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy Chrome requires a truthy returnValue to trigger the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  // (2) In-app guard. useBlocker is stable only under a data router — the whole
  //     reason App.tsx moved to createBrowserRouter. Catches sidebar links, the
  //     Back button, and programmatic navigate() alike.
  const blocker = useBlocker(hasUnsaved);
  const blocked = blocker.state === "blocked";

  return (
    <Dialog
      open={blocked}
      // Esc / outside-click / X all resolve to STAY — an accidental dismiss
      // must NEVER be read as "Leave" and discard the user's work.
      onOpenChange={(open) => {
        if (!open && blocked) blocker.reset?.();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        data-testid="unsaved-changes-dialog"
        onEscapeKeyDown={() => blocker.reset?.()}
      >
        <DialogHeader>
          <DialogTitle>You have unsaved changes</DialogTitle>
          <DialogDescription>
            Leave this page? Your changes on this screen haven't been saved and
            will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="unsaved-changes-stay"
            onClick={() => blocker.reset?.()}
          >
            Stay on page
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-testid="unsaved-changes-leave"
            onClick={() => blocker.proceed?.()}
          >
            Leave without saving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
