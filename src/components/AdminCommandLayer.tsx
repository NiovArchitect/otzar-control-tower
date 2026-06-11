// FILE: AdminCommandLayer.tsx
// PURPOSE: Phase 1251 — the admin command layer. Admins administer a
//          lot (people, AI workforce, connectors, governance,
//          readiness, compliance, transaction rails); they should
//          never have to hunt. One palette — ⌘K / Ctrl+K or the
//          "Ask" button — takes plain-language questions to the right
//          surface:
//
//            "What is blocking production?"  → Onboarding readiness
//            "Which connectors need keys?"   → Connectors
//            "Show me risky AI permissions"  → AI Teammates
//            "Transaction readiness"         → Onboarding readiness
//            "What did the regulator see?"   → Security & Audit
//
//          Navigation only — no privileged action fires from the
//          palette, so the governed approval paths stay untouched.
// CONNECTS TO: src/components/Layout.tsx (admin shell mount),
//          src/components/ui/command.tsx,
//          tests/unit/admin-command-layer.test.tsx.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface CommandEntry {
  /** The plain-language question an admin would actually ask. */
  question: string;
  /** Extra match terms (not displayed). */
  keywords: string;
  to: string;
}

const ENTRIES: ReadonlyArray<{ group: string; items: CommandEntry[] }> = [
  {
    group: "Readiness",
    items: [
      {
        question: "What is blocking production?",
        keywords: "readiness blocked schema credentials demo",
        to: "/onboarding",
      },
      {
        question: "What is ready for a demo?",
        keywords: "demo walk handoff ready capabilities",
        to: "/onboarding",
      },
      {
        question: "Show me transaction readiness",
        keywords: "settlement circle base usdc rails mock funds",
        to: "/onboarding",
      },
      {
        question: "Which connectors need credentials?",
        keywords: "connector keys oauth google slack microsoft zoom setup",
        to: "/connectors",
      },
    ],
  },
  {
    group: "People & AI workforce",
    items: [
      {
        question: "Who is on the team?",
        keywords: "users members people roles",
        to: "/users",
      },
      {
        question: "Show me AI teammates and their limits",
        keywords: "ai twins employees permissions ceilings risky kill switch",
        to: "/ai-teammates",
      },
      {
        question: "Where should Otzar grow next?",
        keywords: "dandelion growth propagation onboard activation",
        to: "/users",
      },
    ],
  },
  {
    group: "Governance & evidence",
    items: [
      {
        question: "Who can access what?",
        keywords: "access control permissions sharing",
        to: "/access-control",
      },
      {
        question: "Show me the audit trail",
        keywords: "audit security events evidence regulator",
        to: "/security-audit",
      },
      {
        question: "What are our policy gates?",
        keywords: "policies approval dual control risk",
        to: "/policies",
      },
      {
        question: "Is the system healthy?",
        keywords: "system health runtime status",
        to: "/system-health",
      },
    ],
  },
];

export function AdminCommandLayer(): JSX.Element {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Ask Otzar where to go (Command K)"
        data-testid="admin-command-trigger"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Ask
        <kbd className="ml-2 hidden rounded border border-border bg-muted px-1 text-[9px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Ask anything — “what is blocking production?”"
          data-testid="admin-command-input"
        />
        <CommandList data-testid="admin-command-list">
          <CommandEmpty>No matching place yet — try “readiness”.</CommandEmpty>
          {ENTRIES.map((group) => (
            <CommandGroup key={group.group} heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.question}
                  value={`${item.question} ${item.keywords}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate(item.to);
                  }}
                >
                  {item.question}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
