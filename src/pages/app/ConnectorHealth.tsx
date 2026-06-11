// FILE: ConnectorHealth.tsx
// PURPOSE: Phase 1220 — employee-facing Connector Health view.
//          Honest "what's connected for my org" surface. Per the
//          Founder directive, the page must show "configured /
//          missing / mock mode" without breaking the core product.
//
//          The page tries the admin-gated GET
//          /api/v1/orgs/me/connector-providers (Foundation PR #298).
//          When the caller is not an admin (or there is no live
//          backend), it falls back to a STATIC honest catalogue of
//          the 10 connector categories the Founder listed, each
//          marked "Not configured in your org yet."
//
//          This is a READ-ONLY view. The actual provider setup
//          lives at /admin/connector-rails (admin-gated).
//
// CONNECTS TO:
//   - src/lib/api.ts (api.connectorRails.listProviders)
//   - src/lib/types/foundation.ts (ConnectorProviderDefinition)
//   - /admin/connector-rails (setup surface for admins)
//
// PRIVACY INVARIANT:
//   - Reads only the closed-vocab provider definitions (provider_id /
//     display_name / supported_auth_modes / read_supported /
//     draft_supported / write_supported / compliance_tags).
//   - Never renders raw secret material, API keys, OAuth tokens,
//     connection_id values, scope_grant ids, or audit row contents.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cable,
  CircleOff,
  Eye,
  EyeOff,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import type { ConnectorAdapterRow } from "@/lib/types/foundation";
import { isOrgAdmin } from "@/lib/auth/capabilities";

// Founder-mandated honest catalogue. Each entry MUST exist regardless
// of backend status so the page never goes blank.
interface CatalogueEntry {
  category_key: string;
  display_name: string;
  /** Plain-language sentence describing what this connector enables. */
  what_it_enables: string;
  /** Founder directive grouping. */
  group: "Productivity" | "Communications" | "Engineering" | "Settlement" | "AI";
}

const CATALOGUE: ReadonlyArray<CatalogueEntry> = [
  {
    category_key: "GOOGLE_WORKSPACE",
    display_name: "Google Workspace",
    what_it_enables:
      "Calendar, Drive, Gmail context — meetings, documents, scoped email summaries.",
    group: "Productivity",
  },
  {
    category_key: "SLACK",
    display_name: "Slack",
    what_it_enables:
      "Channel and DM context (read-only by default; sending requires approval).",
    group: "Communications",
  },
  {
    category_key: "ZOOM",
    display_name: "Zoom",
    what_it_enables: "Meeting recordings and transcripts as scoped memory.",
    group: "Communications",
  },
  {
    category_key: "MICROSOFT_TEAMS",
    display_name: "Microsoft Teams",
    what_it_enables: "Team channels, meetings, and scoped chat summaries.",
    group: "Communications",
  },
  {
    category_key: "JIRA",
    display_name: "Jira",
    what_it_enables: "Issues, sprints, and project status as scoped context.",
    group: "Engineering",
  },
  {
    category_key: "EMAIL",
    display_name: "Email",
    what_it_enables: "Inbox summaries and outbound draft proposals.",
    group: "Communications",
  },
  {
    category_key: "VOICE",
    display_name: "Voice (STT / TTS)",
    what_it_enables: "Talk-to-Otzar with live transcription and read-back.",
    group: "AI",
  },
  {
    category_key: "OCR",
    display_name: "OCR / Document capture",
    what_it_enables: "Extract text from images and scanned documents.",
    group: "AI",
  },
  {
    category_key: "CIRCLE_USDC",
    display_name: "Circle USDC",
    what_it_enables:
      "Settlement rail for payments. Requires explicit governed approval.",
    group: "Settlement",
  },
  {
    category_key: "BASE",
    display_name: "Base (USDC)",
    what_it_enables:
      "On-chain settlement rail. Requires explicit governed approval.",
    group: "Settlement",
  },
];

type Status = "CONFIGURED" | "NOT_CONFIGURED" | "MOCK_MODE";

function statusBadge(status: Status): JSX.Element {
  switch (status) {
    case "CONFIGURED":
      return (
        <Badge
          variant="outline"
          className="text-[10px]"
          data-status="CONFIGURED"
        >
          <CheckCircle2
            className="mr-1 inline h-3 w-3 text-emerald-600"
            aria-hidden
          />
          Connected
        </Badge>
      );
    case "MOCK_MODE":
      return (
        <Badge
          variant="outline"
          className="text-[10px]"
          data-status="MOCK_MODE"
        >
          <CircleOff className="mr-1 inline h-3 w-3 text-amber-500" aria-hidden />
          Mock mode
        </Badge>
      );
    case "NOT_CONFIGURED":
      return (
        <Badge
          variant="outline"
          className="text-[10px]"
          data-status="NOT_CONFIGURED"
        >
          Not configured yet
        </Badge>
      );
  }
}

export function ConnectorHealth(): JSX.Element {
  const { capabilities } = useAuthStore();
  const admin = isOrgAdmin(capabilities);
  const [statuses, setStatuses] = useState<Map<string, Status> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminAccessAvailable, setAdminAccessAvailable] = useState<
    boolean | null
  >(null);
  // Phase 1244 — adapter setup guidance (admin section). Failure is
  // non-blocking.
  const [adapters, setAdapters] = useState<ConnectorAdapterRow[]>([]);
  const [openAdapter, setOpenAdapter] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;
    let cancelledAdapters = false;
    void api.otzar.connectorAdapters().then((r) => {
      if (!cancelledAdapters && r.ok) setAdapters(r.data.adapters);
    });
    return () => {
      cancelledAdapters = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  useEffect(() => {
    let cancelled = false;
    // Try the admin-gated providers list; fall back to honest static
    // catalogue when 403.
    api.connectorRails
      .listProviders()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          const map = new Map<string, Status>();
          for (const p of r.data.providers) {
            // Foundation surfaces provider definitions but not their
            // connection state at this read path. For Wave-1, every
            // returned provider is treated as CONFIGURED (the org has
            // registered it). Future Foundation work can surface the
            // mock-mode / connection-failed states.
            map.set(p.provider_id, "CONFIGURED");
          }
          setStatuses(map);
          setError(null);
          setAdminAccessAvailable(true);
        } else if (r.code === "FORBIDDEN" || r.code === "OPERATION_NOT_PERMITTED") {
          // Non-admin caller. Fall back to honest static catalogue.
          setStatuses(new Map());
          setAdminAccessAvailable(false);
        } else {
          setError(r.code);
          setAdminAccessAvailable(false);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("NETWORK_ERROR");
        setAdminAccessAvailable(false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byGroup: Record<string, CatalogueEntry[]> = {};
  for (const e of CATALOGUE) {
    if (byGroup[e.group] === undefined) byGroup[e.group] = [];
    byGroup[e.group]!.push(e);
  }
  const groups = Object.keys(byGroup).sort();

  function statusFor(entry: CatalogueEntry): Status {
    if (statuses === null) return "NOT_CONFIGURED";
    return statuses.get(entry.category_key) ?? "NOT_CONFIGURED";
  }

  return (
    <div className="space-y-6" data-testid="connector-health-page">
      <PageHeader
        title="Connector Health"
        description="Honest status of the integrations your org might connect to Otzar. Missing connections don't break the core product — Otzar just runs without them or falls back to honest mock mode."
      />

      {/* Caller scope */}
      <Card data-testid="connector-health-caller">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {admin ? (
              <Eye className="h-4 w-4" aria-hidden />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden />
            )}{" "}
            {admin ? "You can manage connectors for your org" : "View only"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {admin ? (
            <span>
              You have org-admin scope. You can configure connectors in the
              Control Tower's connector rails admin surface.
            </span>
          ) : (
            <span>
              You're seeing the honest catalogue of integrations Otzar
              supports. Ask your org-admin to set up the ones you need —
              Otzar still works without them.
            </span>
          )}
        </CardContent>
      </Card>

      {/* Loading + error */}
      {loading ? (
        <Card data-testid="connector-health-loading">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Loading connector status…
          </CardContent>
        </Card>
      ) : error !== null ? (
        <Card
          className="border-rose-400/40 bg-rose-500/5"
          data-testid="connector-health-error"
        >
          <CardContent className="py-4 text-sm">
            <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden />
            Couldn't read connector status. ({error}) Showing the honest
            catalogue below.
          </CardContent>
        </Card>
      ) : null}

      {/* Catalogue grouped */}
      {groups.map((group) => (
        <Card key={group} data-testid="connector-health-group" data-group={group}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cable className="h-4 w-4" aria-hidden /> {group}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {byGroup[group]!.map((entry) => {
                const status = statusFor(entry);
                return (
                  <li
                    key={entry.category_key}
                    className="flex items-start justify-between gap-2 rounded border bg-card p-2"
                    data-testid="connector-health-row"
                    data-category-key={entry.category_key}
                    data-status={status}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {entry.display_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.what_it_enables}
                      </p>
                    </div>
                    {statusBadge(status)}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Admin link */}
      {admin ? (
        <Card data-testid="connector-health-admin-link">
          <CardContent className="flex items-center justify-between gap-2 py-3 text-xs">
            <div>
              <p className="font-medium">Configure connectors for your org</p>
              <p className="text-muted-foreground">
                Open the Control Tower's connector rails to register and
                manage provider bindings.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/connector-rails">
                Open admin <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Phase 1244 — How to connect (admins). Plain-English setup
          guidance from the hardened adapter registry. */}
      {admin && adapters.length > 0 ? (
        <Card data-testid="connector-setup-guidance">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">How to connect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {adapters.map((a) => (
              <div
                key={a.provider_name}
                className="rounded border bg-card p-2"
                data-testid="connector-setup-row"
                data-provider={a.provider_name}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() =>
                    setOpenAdapter((prev) =>
                      prev === a.provider_name ? null : a.provider_name,
                    )
                  }
                  aria-expanded={openAdapter === a.provider_name}
                  data-testid="connector-setup-toggle"
                >
                  <span className="font-medium">{a.display_name}</span>
                  <span className="flex items-center gap-2">
                    {a.demo_mode_available ? (
                      <Badge variant="outline" className="text-[9px]">
                        Demo works today
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="text-[9px]">
                      {a.status === "CONFIGURED"
                        ? "Connected"
                        : a.status === "BLOCKED_BY_APP_REVIEW"
                          ? "Needs app review"
                          : a.status === "BLOCKED_BY_CREDENTIAL"
                            ? "Needs setup"
                            : "Not active"}
                    </Badge>
                  </span>
                </button>
                {openAdapter === a.provider_name ? (
                  <div
                    className="mt-2 space-y-1 text-muted-foreground"
                    data-testid="connector-setup-steps"
                  >
                    <ol className="list-decimal pl-5">
                      {a.setup_steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {a.missing_envs.length > 0 ? (
                      <p className="text-[10px]">
                        Your deployment still needs:{" "}
                        {a.missing_envs.join(", ")}
                      </p>
                    ) : null}
                    {a.setup_docs_url !== undefined ? (
                      <p className="text-[10px]">
                        Provider docs: {a.setup_docs_url}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Reassurance footer */}
      <p
        className="text-[10px] text-muted-foreground"
        data-testid="connector-health-reassurance"
      >
        Missing connectors don't block the core product. When a provider
        isn't connected, Otzar runs without it or surfaces an honest mock-mode
        notice. External writes (Slack, email, Jira, on-chain settlement,
        etc.) always require explicit governed approval before they fire.
        {/* Suppress unused vars when adminAccessAvailable is consumed by tests. */}
        <span hidden data-testid="connector-health-admin-access-available">
          {adminAccessAvailable === null ? "null" : String(adminAccessAvailable)}
        </span>
      </p>
    </div>
  );
}
