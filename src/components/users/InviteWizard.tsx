// FILE: InviteWizard.tsx
// PURPOSE: Orchestrator for the 3-step Dandelion invite wizard
//          (decision #20). Holds wizard state, renders one of the
//          three step components, and surfaces the cancellation
//          dialog with C2-approved copy.
// CONNECTS TO: Users.tsx (mounts inside Sheet), InviteWizardStep1Capture,
//              InviteWizardStep2Review, InviteWizardStep3Confirm.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InviteWizardStep1Capture } from "./InviteWizardStep1Capture";
import type { CaptureValues } from "./invite-wizard-schemas";
import { InviteWizardStep2Review } from "./InviteWizardStep2Review";
import { InviteWizardStep3Confirm } from "./InviteWizardStep3Confirm";

const DEFAULT_CAPTURE: CaptureValues = {
  email: "",
  first_name: "",
  last_name: "",
  role_title: "",
  relationship_type: "employee",
  department: "",
  manager_entity_id: "",
  is_admin: false,
};

interface InviteWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3;

interface WizardState {
  step: Step;
  captured: CaptureValues | null;
  newEntityId: string | null;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  captured: null,
  newEntityId: null,
};

export function InviteWizard({ open, onOpenChange }: InviteWizardProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  function reset(): void {
    setState(INITIAL_STATE);
  }

  function handleAttemptClose(open: boolean): void {
    if (open) {
      onOpenChange(true);
      return;
    }
    // Closing -- if user has progressed past Step 1, confirm.
    if (state.step > 1 && state.newEntityId !== null) {
      setConfirmCancelOpen(true);
    } else {
      reset();
      onOpenChange(false);
    }
  }

  function confirmCancel(): void {
    setConfirmCancelOpen(false);
    reset();
    onOpenChange(false);
  }

  async function handleCompleted(): Promise<void> {
    // Phase 3 succeeded -- refresh the Users table + close.
    await queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
    reset();
    onOpenChange(false);
  }

  const cancelTitle = "Cancel invite?";
  const cancelDisplayName = state.captured
    ? `${state.captured.first_name} ${state.captured.last_name}`.trim() ||
      state.captured.email
    : "This member";

  return (
    <>
      <Sheet open={open} onOpenChange={handleAttemptClose}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl"
        >
          <div className="space-y-4">
            <header className="border-b border-border pb-3">
              <h2 className="text-lg font-semibold">Invite someone</h2>
              <p className="text-sm text-muted-foreground">
                Step {state.step} of 3.{" "}
                {state.step === 1
                  ? "Who is joining and where they fit"
                  : state.step === 2
                    ? "Review placement"
                    : "Send the invite"}
              </p>
            </header>

            {state.step === 1 && (
              <InviteWizardStep1Capture
                defaultValues={state.captured ?? DEFAULT_CAPTURE}
                onCaptured={(values, entity_id) => {
                  setState({
                    step: 2,
                    captured: values,
                    newEntityId: entity_id,
                  });
                }}
              />
            )}

            {state.step === 2 && state.captured && state.newEntityId && (
              <InviteWizardStep2Review
                newEntityId={state.newEntityId}
                newDisplayName={
                  `${state.captured.first_name} ${state.captured.last_name}`.trim() ||
                  state.captured.email
                }
                onReady={() => setState((s) => ({ ...s, step: 3 }))}
                onCancel={() => setConfirmCancelOpen(true)}
              />
            )}

            {state.step === 3 && state.captured && state.newEntityId && (
              <InviteWizardStep3Confirm
                captured={state.captured}
                newEntityId={state.newEntityId}
                newDisplayName={
                  `${state.captured.first_name} ${state.captured.last_name}`.trim() ||
                  state.captured.email
                }
                newEmail={state.captured.email}
                isAdmin={state.captured.is_admin}
                onCompleted={() => void handleCompleted()}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cancelTitle}</DialogTitle>
            <DialogDescription>
              {cancelDisplayName} will remain in your Users list as a member,
              but they won't have an AI Teammate until you complete onboarding.
              You can finish their invite from their member detail page anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCancelOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmCancel}
            >
              Cancel invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

void SheetTrigger;
