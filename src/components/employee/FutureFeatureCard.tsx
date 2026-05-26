// FILE: FutureFeatureCard.tsx
// PURPOSE: A disabled, clearly-labeled card for surfaces that are NOT
//          yet backed by a proven Foundation contract (My Twin, Teams/
//          Hives, Context/Working Set, ...). Keeps the employee shell
//          honest: future features look reserved, never faked.
// CONNECTS TO: src/pages/app/EmployeeHome.tsx.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FutureFeatureCardProps {
  title: string;
  description: string;
  /** Short status label, e.g. "Not yet active" or
   *  "Requires backend contract". Defaults to "Not yet active". */
  status?: string;
}

export function FutureFeatureCard({
  title,
  description,
  status = "Not yet active",
}: FutureFeatureCardProps) {
  return (
    <Card aria-disabled className="opacity-70">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary">{status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}
