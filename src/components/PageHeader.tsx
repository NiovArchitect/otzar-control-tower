// FILE: PageHeader.tsx
// PURPOSE: Phase-F page chrome — luminous title hierarchy for every surface.
// CONNECTS TO: every page in src/pages/.

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Optional short eyebrow above the title. */
  eyebrow?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  eyebrow,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-[#1e1b4b]/08 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      data-testid="page-header"
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B124E8]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="otzar-text-luminous text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-[#5c5a78]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
