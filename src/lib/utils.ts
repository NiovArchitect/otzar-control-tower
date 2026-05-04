// FILE: utils.ts
// PURPOSE: Single shared cn() helper used by every component that
//          composes Tailwind class names dynamically. Standard
//          shadcn/ui pattern.
// CONNECTS TO: every component file.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
