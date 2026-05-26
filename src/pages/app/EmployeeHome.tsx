// FILE: EmployeeHome.tsx
// PURPOSE: Landing screen of the employee Otzar shell. Welcomes the
//          signed-in employee, makes the real-vs-future boundary
//          explicit, and links into the three live surfaces (Chat,
//          Observe, Corrections). Future surfaces render as disabled
//          FutureFeatureCard tiles -- never faked.
// CONNECTS TO: src/lib/stores/auth.ts (identity), FutureFeatureCard,
//              /app/chat, /app/observe, /app/corrections.

import { Link } from "react-router-dom";
import { ArrowRight, Eye, MessageSquare, PencilLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { FutureFeatureCard } from "@/components/employee/FutureFeatureCard";
import { useAuthStore } from "@/lib/stores/auth";

export function EmployeeHome() {
  const { entity } = useAuthStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Otzar workspace"
        description={
          entity
            ? `Signed in as ${entity.email}. This is your employee Otzar surface — separate from the org-admin Control Tower.`
            : "This is your employee Otzar surface — separate from the org-admin Control Tower."
        }
      />

      <div
        className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        role="note"
      >
        <span className="font-medium text-foreground">Live today:</span> Chat,
        Observe, and Corrections talk to your organization's Otzar backend.
        Everything else below is reserved and not yet active. Otzar answers and
        learns from governed memory — it does not perform tasks or act in
        outside tools.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LiveCard
          to="/app/chat"
          title="Chat"
          icon={<MessageSquare className="h-4 w-4" aria-hidden />}
          description="Have a conversation with your AI teammate."
        />
        <LiveCard
          to="/app/observe"
          title="Observe"
          icon={<Eye className="h-4 w-4" aria-hidden />}
          description="Submit context — a note, message, or meeting — for Otzar to learn from."
        />
        <LiveCard
          to="/app/corrections"
          title="Corrections"
          icon={<PencilLine className="h-4 w-4" aria-hidden />}
          description="Teach or correct your AI teammate within scoped memory."
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Coming later</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FutureFeatureCard
            title="My Twin"
            description="Inspect and tune your own AI teammate. A product read route for your twin is not yet available."
            status="Requires backend contract"
          />
          <FutureFeatureCard
            title="Teams"
            description="Collaborate with teammates in shared team spaces. Not yet active in the employee app."
            status="Not yet active"
          />
          <FutureFeatureCard
            title="Context"
            description="See the working set Otzar assembles for you. Not yet active."
            status="Not yet active"
          />
        </div>
      </section>
    </div>
  );
}

function LiveCard({
  to,
  title,
  description,
  icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild variant="outline" size="sm">
          <Link to={to}>
            Open
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
