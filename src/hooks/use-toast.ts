// FILE: use-toast.ts
// PURPOSE: Thin wrapper around sonner's toast API so screens import
//          from a single internal path. Future: swap sonner for a
//          different toast library without touching call sites.
// CONNECTS TO: Login (audit-aware success toast), every privileged
//              action in 12B-12F.

import { toast } from "sonner";

export const useToast = () => ({
  toast,
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast.info(msg),
});

export { toast };
