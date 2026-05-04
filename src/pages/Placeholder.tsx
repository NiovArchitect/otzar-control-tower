// FILE: Placeholder.tsx
// PURPOSE: Reusable scaffolding for every screen that's reserved for
//          a later sub-box of Section 12. Renders a PageHeader plus a
//          "Coming in Section 12X" notice so the navigation works
//          end-to-end during 12A even though the screens aren't built.
// CONNECTS TO: every page file that hasn't been implemented yet.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

interface PlaceholderProps {
  title: string;
  description: string;
  arrivingIn: string;
}

export function Placeholder({ title, description, arrivingIn }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reserved screen</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This view is scaffolded in Section 12A and will be implemented in{" "}
          <span className="font-medium text-foreground">{arrivingIn}</span>. The
          route, navigation, and AuthGuard are already wired -- the data layer
          and screen-specific UI land in the listed sub-box.
        </CardContent>
      </Card>
    </div>
  );
}
