// FILE: EmployeeHome.tsx
// PURPOSE: Landing screen of the employee Otzar shell. Welcomes the
//          signed-in employee, makes the real-vs-future boundary
//          explicit, and links into the three live surfaces (Chat,
//          Observe, Corrections). Future surfaces render as disabled
//          FutureFeatureCard tiles -- never faked.
// CONNECTS TO: src/lib/stores/auth.ts (identity), FutureFeatureCard,
//              /app/chat, /app/observe, /app/corrections.

import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Briefcase,
  ClipboardCheck,
  Eye,
  MessageSquare,
  MessagesSquare,
  PencilLine,
  Sparkles,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useAuthStore } from "@/lib/stores/auth";

export function EmployeeHome() {
  const { entity } = useAuthStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Otzar workspace"
        description={
          entity
            ? `Signed in as ${entity.email}. This is your employee Otzar surface, separate from the org-admin Control Tower.`
            : "This is your employee Otzar surface, separate from the org-admin Control Tower."
        }
      />

      <div
        className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        role="note"
      >
        <span className="font-medium text-foreground">Live today:</span> Chat,
        Observe, Corrections, Approvals, My AI Teammate, and Conversations talk to your
        organization's Otzar backend. Everything else below is reserved and not
        yet active. Otzar answers and learns from governed memory — it does not
        perform tasks or act in outside tools.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          description="Submit context (a note, message, or meeting) for Otzar to learn from."
        />
        <LiveCard
          to="/app/corrections"
          title="Corrections"
          icon={<PencilLine className="h-4 w-4" aria-hidden />}
          description="Teach or correct your AI teammate within scoped memory."
        />
        <LiveCard
          to="/app/approvals"
          title="Approvals"
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
          description="Review approval requests that are waiting on your decision."
        />
        <LiveCard
          to="/app/my-twin"
          title="My AI Teammate"
          icon={<Bot className="h-4 w-4" aria-hidden />}
          description="View your aligned AI teammate's identity and skills."
        />
        <LiveCard
          to="/app/conversations"
          title="Conversations"
          icon={<MessagesSquare className="h-4 w-4" aria-hidden />}
          description="Review your ambient console session metadata."
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Also live</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <LiveCard
            to="/app/collaboration"
            title="People"
            icon={<Users className="h-4 w-4" aria-hidden />}
            description="Collaborate with teammates through governed requests."
          />
          <LiveCard
            to="/app/work-projects"
            title="Projects"
            icon={<Briefcase className="h-4 w-4" aria-hidden />}
            description="Project context and membership for shared work."
          />
          <LiveCard
            to="/app"
            title="Today"
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
            description="Ambient home: what needs you and the next step."
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
