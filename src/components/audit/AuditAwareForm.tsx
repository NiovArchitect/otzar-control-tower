// FILE: AuditAwareForm.tsx
// PURPOSE: Same 4-stage audit-aware pattern as AuditAwareButton, but
//          wrapped around a form. Used when the action requires
//          structured input (grant permission form, create twin
//          form, etc.). Uses react-hook-form + zod for validation.
// CONNECTS TO: GrantPermissionDialog (12B.4), CreateTeammateDialog
//              (12B.3), InviteWizard step forms (12B.2).
//
// 4 STAGES (mirror AuditAwareButton):
//   Stage 1 -- form rendered with AuditEventTooltip subtext
//   Stage 2 -- optional confirmation dialog before submit
//   Stage 3 -- submit in-flight (button disabled + spinner)
//   Stage 4 -- success toast confirming the action with the real audit
//              id as informational text (NO clickable link -- no audit
//              viewer exists yet) or error toast

import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z, ZodType } from "zod";
import { toast } from "sonner";
import { AuditEventTooltip } from "@/components/audit/AuditEventTooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import type { AuditEventType } from "@/lib/types/foundation";
import type { AuditAwareButtonResult } from "./AuditAwareButton";

interface AuditAwareFormProps<TSchema extends ZodType<FieldValues>> {
  variant: "primary" | "destructive";
  auditEventType: AuditEventType;
  auditActionLabel?: string;
  requireConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
  targetDescription?: string;
  formSchema: TSchema;
  defaultValues: z.infer<TSchema>;
  onSubmit: (values: z.infer<TSchema>) => Promise<AuditAwareButtonResult>;
  submitLabel: string;
  /** Render-prop receives the react-hook-form instance so callers
   *  can compose FormField + FormItem + FormLabel + FormControl
   *  + Input children. */
  children: React.ReactNode;
}

type Stage = "idle" | "confirming" | "inFlight";

function shortenAuditId(id: string): string {
  return `AUDIT_ID_${id.slice(0, 8)}…`;
}

export function AuditAwareForm<TSchema extends ZodType<FieldValues>>({
  variant,
  auditEventType,
  auditActionLabel,
  requireConfirmation = false,
  confirmationTitle = "Confirm action",
  confirmationDescription,
  targetDescription,
  formSchema,
  defaultValues,
  onSubmit,
  submitLabel,
  children,
}: AuditAwareFormProps<TSchema>) {
  const [stage, setStage] = useState<Stage>("idle");
  const [pendingValues, setPendingValues] = useState<z.infer<TSchema> | null>(
    null,
  );

  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(formSchema),
    // react-hook-form's DefaultValues<T> type is structurally
    // incompatible with arbitrary zod-inferred shapes; cast through
    // unknown to satisfy the type check while preserving runtime
    // behavior (the values are passed through verbatim).
    defaultValues: defaultValues as unknown as DefaultValues<z.infer<TSchema>>,
  });

  const buttonVariant = variant === "destructive" ? "destructive" : "default";
  const inFlight = stage === "inFlight";
  const customerEventLabel = getAuditEventLabel(auditEventType);

  async function execute(values: z.infer<TSchema>): Promise<void> {
    setStage("inFlight");
    try {
      const result = await onSubmit(values);
      if (result.ok) {
        toast.success("Action complete.", {
          description: `Audit recorded: ${shortenAuditId(result.audit_event_id)}`,
        });
        form.reset(defaultValues);
      } else {
        toast.error(`Action failed: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Action failed: ${message}`);
    } finally {
      setStage("idle");
      setPendingValues(null);
    }
  }

  const handleSubmit: SubmitHandler<z.infer<TSchema>> = (values) => {
    if (requireConfirmation) {
      setPendingValues(values);
      setStage("confirming");
    } else {
      void execute(values);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        aria-busy={inFlight}
      >
        {children}
        <div className="flex flex-col items-end gap-2">
          <Button
            type="submit"
            variant={buttonVariant}
            disabled={inFlight}
            aria-busy={inFlight}
          >
            {inFlight ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Logging audit event...
              </>
            ) : (
              submitLabel
            )}
          </Button>
          <AuditEventTooltip
            eventType={auditEventType}
            actionLabel={auditActionLabel}
          />
        </div>
      </form>

      <Dialog
        open={stage === "confirming"}
        onOpenChange={(open) => {
          if (!open && stage === "confirming") {
            setStage("idle");
            setPendingValues(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationTitle}</DialogTitle>
            {confirmationDescription && (
              <DialogDescription>{confirmationDescription}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {targetDescription && (
              <p>
                <span className="font-medium">Action target:</span>{" "}
                {targetDescription}
              </p>
            )}
            <p>
              <span className="font-medium">Audit event:</span>{" "}
              {customerEventLabel}
              {auditActionLabel ? ` (${auditActionLabel})` : ""}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStage("idle");
                setPendingValues(null);
              }}
              disabled={inFlight}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={buttonVariant}
              onClick={() => {
                if (pendingValues !== null) {
                  void execute(pendingValues);
                }
              }}
              disabled={inFlight || pendingValues === null}
            >
              {inFlight ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden
                  />
                  Logging audit event...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
