// FILE: ConnectorHealth.tsx
// PURPOSE: Slice 3 — employee primary Connections: Connect your work tools.
//          ≤4 primary tool cards (Google Workspace, Microsoft 365, Slack,
//          GitHub). Official OAuth, plain capability language, return-to-work
//          context. Admin inventory / MCP stay off this surface.
// CONNECTS TO: api.otzar.enterpriseTools.*, primary-work-tools, WorkLedgerItem.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import {
  buildPrimaryToolCards,
  capabilityLevelCopy,
  loadConnectionReturnContext,
  saveConnectionReturnContext,
  type CatalogCapabilityRow,
  type PrimaryToolCard,
} from "@/lib/connectors/primary-work-tools";
import { MeetOperationalResidualCard } from "@/components/otzar/MeetOperationalResidualCard";

function statusBadge(status: string, label: string): JSX.Element {
  const tone =
    status === "connected"
      ? "text-emerald-700 border-emerald-300/50"
      : status === "reconnect_required" || status === "needs_attention"
        ? "text-amber-700 border-amber-300/50"
        : status === "disabled"
          ? "text-rose-700 border-rose-300/50"
          : "text-muted-foreground";
  return (
    <Badge
      variant="outline"
      className={`shrink-0 text-[10px] ${tone}`}
      data-testid="tool-card-status"
      data-status={status}
    >
      {status === "connected" ? (
        <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden />
      ) : null}
      {label}
    </Badge>
  );
}

export function ConnectorHealth(): JSX.Element {
  const { capabilities: caps } = useAuthStore();
  const admin = isOrgAdmin(caps);
  const [searchParams] = useSearchParams();
  const needReconnect =
    searchParams.get("need") === "reconnect" ||
    searchParams.get("focus") === "reconnect";
  const fromComms = searchParams.get("from") === "comms";
  const focusTool = (searchParams.get("tool") ?? "").toLowerCase();
  const oauthOutcome = searchParams.get("oauth");
  const whyParam = searchParams.get("why");
  const returnParam = searchParams.get("return");

  const [items, setItems] = useState<CatalogCapabilityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTool, setBusyTool] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [returnCtx, setReturnCtx] = useState<ReturnType<
    typeof loadConnectionReturnContext
  >>(null);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.otzar.enterpriseTools.catalog();
    if (r.ok) {
      setItems(r.data.catalog.capabilities as CatalogCapabilityRow[]);
      setError(null);
    } else {
      setError(r.code);
      setItems(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Capture deep-link return context on mount; restore after OAuth return.
  useEffect(() => {
    if (returnParam && returnParam.startsWith("/") && !returnParam.startsWith("//")) {
      saveConnectionReturnContext({
        returnPath: returnParam,
        ...(whyParam ? { workTitle: whyParam, reason: whyParam } : {}),
        ...(focusTool ? { toolId: focusTool } : {}),
      });
    }
    const stored = loadConnectionReturnContext(false);
    setReturnCtx(stored);

    if (oauthOutcome === "connected") {
      const toolName =
        focusTool === "google"
          ? "Google Workspace"
          : focusTool === "microsoft"
            ? "Microsoft 365"
            : focusTool === "slack"
              ? "Slack"
              : "Your tool";
      const workHint =
        stored?.workTitle ??
        stored?.reason ??
        (whyParam && whyParam.length > 0 ? whyParam : null);
      setNotice(
        workHint
          ? `${toolName} is connected. Otzar can now help with: ${workHint}`
          : `${toolName} is connected. Otzar can use authorized access within your permissions.`,
      );
    } else if (oauthOutcome === "denied") {
      setNotice(
        "You cancelled the connection. Nothing was linked. You can try again when ready.",
      );
    } else if (oauthOutcome === "failed") {
      setNotice(
        "The connection did not complete. Try again, or ask an administrator if the problem continues.",
      );
    }
  }, [oauthOutcome, focusTool, returnParam, whyParam]);

  const cards = useMemo(
    () => (items !== null ? buildPrimaryToolCards(items) : []),
    [items],
  );

  const contextBanner = useMemo(() => {
    if (whyParam && whyParam.length > 0) {
      return whyParam;
    }
    if (returnCtx?.workTitle) return returnCtx.workTitle;
    if (returnCtx?.reason) return returnCtx.reason;
    return null;
  }, [whyParam, returnCtx]);

  async function startOauthForCard(card: PrimaryToolCard): Promise<void> {
    setBusyTool(card.tool_id);
    setNotice(null);
    if (card.oauth_slug === null) {
      setBusyTool(null);
      setNotice("This tool has no self-serve sign-in on this account.");
      return;
    }
    // Preserve return context before leaving for the provider.
    const path =
      returnParam && returnParam.startsWith("/") && !returnParam.startsWith("//")
        ? returnParam
        : returnCtx?.returnPath ?? "/app/my-work";
    saveConnectionReturnContext({
      returnPath: path,
      toolId: card.tool_id,
      ...(contextBanner
        ? { workTitle: contextBanner, reason: contextBanner }
        : {}),
    });

    const r = await api.otzar.enterpriseTools.oauthStart(card.oauth_slug);
    setBusyTool(null);
    if (r.ok && r.data.authorize_url) {
      window.location.assign(r.data.authorize_url);
      return;
    }
    setNotice(
      r.ok
        ? "Couldn't open the official sign-in flow."
        : r.code === "APP_CREDENTIALS_MISSING"
          ? "Your organization still needs this tool enabled. Ask an administrator."
          : "Couldn't start connect right now. Try again shortly.",
    );
  }

  async function requestAdminForCard(card: PrimaryToolCard): Promise<void> {
    setBusyTool(card.tool_id);
    setNotice(null);
    // Map tool → a catalog capability that lists this provider.
    const cap =
      items?.find((c) =>
        c.providers.some((p) => p.provider === card.tool_id),
      ) ?? null;
    if (cap === null) {
      setBusyTool(null);
      setNotice("Couldn't find that tool. Ask an administrator.");
      return;
    }
    const r = await api.otzar.enterpriseTools.request({
      capability_id: cap.capability_id,
      provider: card.tool_id,
    });
    setBusyTool(null);
    if (r.ok) {
      setNotice("Request sent. An administrator can enable this tool.");
      void load();
    } else if (r.code === "ALREADY_OPEN") {
      setNotice("You already asked for this. Your administrator still has the request.");
    } else {
      setNotice("Couldn't send the request right now.");
    }
  }

  async function onPrimaryAction(card: PrimaryToolCard): Promise<void> {
    if (
      card.connect_action === "oauth_start" ||
      card.connect_action === "reconnect"
    ) {
      await startOauthForCard(card);
      return;
    }
    if (card.connect_action === "request_admin") {
      await requestAdminForCard(card);
    }
  }

  function resumeWorkPath(): string | null {
    const path = returnCtx?.returnPath ?? returnParam;
    if (
      typeof path === "string" &&
      path.startsWith("/") &&
      !path.startsWith("//")
    ) {
      return path;
    }
    return null;
  }

  return (
    <div
      className="space-y-6"
      data-testid="connector-health-page"
      data-capability-first="true"
      data-mcp-primary="false"
      data-slice3-primary-tools="true"
    >
      <PageHeader
        title="Connect your work tools"
        description="Connect the tools you already use so your AI Teammate can understand authorized work and help within your permissions."
      />

      {contextBanner !== null ? (
        <Card
          className="border-sky-300/60 bg-sky-50/70"
          data-testid="connection-return-context"
        >
          <CardContent className="space-y-2 py-3 text-sm">
            <p className="font-medium text-sky-950" data-testid="connection-why">
              {contextBanner.startsWith("Connect")
                ? contextBanner
                : `Connect a work tool to continue: ${contextBanner}`}
            </p>
            {resumeWorkPath() !== null ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  to={resumeWorkPath()!}
                  data-testid="connection-resume-work"
                  onClick={() => loadConnectionReturnContext(true)}
                >
                  Return to your work
                  <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {oauthOutcome === "connected" && resumeWorkPath() !== null ? (
        <Card
          className="border-emerald-300/60 bg-emerald-50/70"
          data-testid="connection-success-resume"
        >
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <p className="text-emerald-950">
              Connected. Continue the work that needed this tool.
            </p>
            <Button asChild size="sm">
              <Link
                to={resumeWorkPath()!}
                data-testid="connection-resume-after-oauth"
                onClick={() => loadConnectionReturnContext(true)}
              >
                Continue work
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {needReconnect ? (
        <MeetOperationalResidualCard
          variant="tools"
          needsReconnect={needReconnect}
        />
      ) : null}

      {needReconnect ? (
        <Card
          className="border-amber-300/70 bg-amber-50/80"
          data-testid="tools-reconnect-banner"
        >
          <CardContent className="space-y-3 py-4 text-sm">
            <p
              className="font-medium text-amber-950"
              data-testid="tools-reconnect-headline"
            >
              {fromComms
                ? "Comms could not pull Google Meet. Sign in again to refresh access"
                : "A tool needs reconnect before Otzar can use it"}
            </p>
            <p className="text-xs text-amber-900/90">
              Access may have expired or permissions changed. Use Reconnect on
              the tool card below — this is the honest fix, not a fake green
              status.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {admin ? (
        <Card data-testid="enterprise-tools-admin-link">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="text-muted-foreground">
              Organization setup, approved tools, and advanced integrations.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/tools-connections" data-testid="open-tools-connections">
                Organization connections
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {notice !== null ? (
        <p
          className="text-sm text-foreground"
          data-testid="enterprise-tools-notice"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      {items === null && error === null ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="enterprise-tools-loading"
        >
          Loading your work tools…
        </p>
      ) : null}

      {error !== null ? (
        <Card
          className="border-rose-400/40 bg-rose-500/5"
          data-testid="enterprise-tools-error"
        >
          <CardContent className="py-4 text-sm">
            <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden />
            Couldn&apos;t load your tools right now. Try again shortly.
          </CardContent>
        </Card>
      ) : null}

      {/* Primary tool cards — three-second clarity */}
      <div
        className="grid gap-3 sm:grid-cols-2"
        data-testid="primary-tool-cards"
      >
        {cards.map((card) => {
          const busy = busyTool === card.tool_id;
          const focused =
            focusTool.length > 0 &&
            (focusTool === card.oauth_slug ||
              focusTool === card.tool_id.toLowerCase() ||
              (focusTool === "google" && card.tool_id === "GOOGLE_WORKSPACE") ||
              (focusTool === "microsoft" && card.tool_id === "MICROSOFT_365"));
          return (
            <Card
              key={card.tool_id}
              className={
                focused
                  ? "border-sky-400/70 ring-1 ring-sky-300/50"
                  : "border-border/70"
              }
              data-testid="primary-tool-card"
              data-tool-id={card.tool_id}
              data-tool-status={card.status}
            >
              <CardHeader className="space-y-2 pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold">
                    {card.display_name}
                  </CardTitle>
                  {statusBadge(card.status, card.status_label)}
                </div>
                <p className="text-xs text-muted-foreground">{card.why}</p>
                <p className="text-[11px] text-muted-foreground">
                  Includes: {card.includes.join(" · ")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {card.status === "connected" && card.account_label ? (
                  <p
                    className="text-xs text-foreground"
                    data-testid="tool-connected-identity"
                  >
                    Connected as {card.account_label}
                  </p>
                ) : null}

                {card.otzar_may.length > 0 ? (
                  <div data-testid="tool-otzar-may">
                    <p className="mb-1 text-[11px] font-medium text-foreground">
                      Otzar may:
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
                      {card.otzar_may.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <div
                      className="mt-2 flex flex-wrap gap-1"
                      data-testid="tool-capability-levels"
                    >
                      {card.capabilities.map((level) => {
                        const copy = capabilityLevelCopy(level);
                        return (
                          <Badge
                            key={level}
                            variant="secondary"
                            className="text-[10px] font-normal"
                            title={copy.detail}
                          >
                            {copy.title}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Ownership:{" "}
                    {card.ownership === "organization"
                      ? "Organization-managed when connected"
                      : "Personal work account"}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {card.primary_action !== null ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void onPrimaryAction(card)}
                      data-testid="enterprise-tools-connect"
                      data-action={card.connect_action}
                      data-tool={card.tool_id}
                    >
                      {busy ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden
                        />
                      ) : (
                        card.primary_action
                      )}
                    </Button>
                  ) : card.status === "connected" ? (
                    <span
                      className="text-[11px] text-emerald-700"
                      data-testid="tool-ready-for-work"
                    >
                      Ready for work
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Honest calendar levels — no overclaim */}
      <Card data-testid="calendar-capability-truth" className="border-border/70">
        <CardContent className="space-y-2 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            When Google Workspace is connected
          </p>
          <p data-testid="calendar-capability-levels">
            Calendar: View · Understand · Create · Update · Cancel under policy.
            Gmail: View and understand authorized mail (send only where policy
            and scopes allow). Drive / Docs: View and understand authorized
            files; create or update where policy permits.
          </p>
          <p className="text-[11px]">
            Otzar never claims Create or Execute when only catalog metadata
            exists. Sensitive actions stay under your approval and organization
            policy.
          </p>
        </CardContent>
      </Card>

      {/* Privacy summary for employees — no secrets */}
      <Card data-testid="connection-privacy-summary">
        <CardContent className="space-y-1 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Privacy and permissions</p>
          <p>
            You see only your connected tools and what Otzar may do with them.
            Organization secrets, other people&apos;s accounts, and developer
            setup stay with administrators.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
