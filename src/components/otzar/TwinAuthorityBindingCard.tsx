// FILE: TwinAuthorityBindingCard.tsx
// PURPOSE: G-02 — product surface: Twin authority is Foundation-bound
//          (human / org / team / projects / grants / policy), not template-granted.
// CONNECTS TO: MyTwin, twin-authority-binding.ts, AuthorityGrants.

import { Link } from "react-router-dom";
import { Shield, User, Building2, FolderKanban, KeyRound, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAuthorityBindingView,
  type TwinAuthorityBindingInput,
} from "@/lib/work-os/twin-authority-binding";

const ICONS: Record<string, JSX.Element> = {
  human_owner: <User className="h-3.5 w-3.5" aria-hidden />,
  organization: <Building2 className="h-3.5 w-3.5" aria-hidden />,
  team_projects: <FolderKanban className="h-3.5 w-3.5" aria-hidden />,
  behavior_policy: <Shield className="h-3.5 w-3.5" aria-hidden />,
  grants: <KeyRound className="h-3.5 w-3.5" aria-hidden />,
  role_template_skills: <Sparkles className="h-3.5 w-3.5" aria-hidden />,
};

export function TwinAuthorityBindingCard(
  props: TwinAuthorityBindingInput & { variant?: "employee" | "admin" },
): JSX.Element {
  const view = buildAuthorityBindingView(props);
  const variant = props.variant ?? "employee";

  return (
    <Card
      data-testid="twin-authority-binding-card"
      data-g02="true"
      data-template-grants-authority="false"
      data-foundation-enforced="true"
      data-variant={variant}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" aria-hidden />
          Where authority comes from
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="g02-doctrine" data-g02-doctrine="true">
          {view.doctrine}
        </p>

        <ul className="space-y-2" data-testid="g02-binding-lines">
          {view.lines.map((line) => (
            <li
              key={line.kind}
              className="flex items-start gap-2 rounded border border-border/60 bg-card px-2 py-1.5"
              data-testid="g02-binding-line"
              data-binding-kind={line.kind}
              data-recommendation-only={
                line.is_recommendation_only ? "true" : "false"
              }
            >
              <span className="mt-0.5 text-foreground">
                {ICONS[line.kind] ?? <Shield className="h-3.5 w-3.5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {line.label}
                  {line.is_recommendation_only ? (
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                      recommendation only
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground">{line.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <p data-testid="g02-preference-note">{view.preference_note}</p>
        <p data-testid="g02-template-note">{view.template_note}</p>

        {variant === "employee" ? (
          <p className="border-t border-border pt-2 text-[11px]">
            <Link
              to="/app/authority-grants"
              className="font-medium text-foreground underline underline-offset-2"
              data-testid="g02-grants-link"
            >
              Review authority grants
            </Link>
            {" · "}
            <Link
              to="/app/my-memory"
              className="font-medium text-foreground underline underline-offset-2"
              data-testid="g02-memory-link"
            >
              Personal preferences (not permissions)
            </Link>
          </p>
        ) : (
          <p
            className="border-t border-border pt-2 text-[11px]"
            data-testid="g02-admin-note"
          >
            Admin view: Behavior Policy and Authority status columns show
            Foundation-enforced levels and provenance. Role template never
            expands access beyond the owner&apos;s authority and org ceiling.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
