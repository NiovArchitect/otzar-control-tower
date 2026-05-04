// FILE: sonner.tsx
// PURPOSE: Themed sonner Toaster wrapper. Mounted once in App.tsx
//          so audit-aware toasts ("Audit event logged: LOGIN_SUCCESS")
//          render with the same theme tokens as everything else.
// CONNECTS TO: App.tsx, src/hooks/use-toast.ts.

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
        description: "group-[.toast]:text-muted-foreground",
        actionButton:
          "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
        cancelButton:
          "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
      },
    }}
    {...props}
  />
);
