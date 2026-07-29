// FILE: primary-work-tools.test.ts
// PURPOSE: Slice 3 — primary tool cards + return context + banned terms.
// CONNECTS TO: src/lib/connectors/primary-work-tools.ts.

import { describe, expect, it, beforeEach } from "vitest";
import {
  buildConnectDeepLink,
  buildPrimaryToolCards,
  employeeStatusLabel,
  findBannedDevTerms,
  loadConnectionReturnContext,
  mapEmployeeStatus,
  oauthSlugForConnectorLabel,
  saveConnectionReturnContext,
  type CatalogCapabilityRow,
} from "@/lib/connectors/primary-work-tools";

const catalog: CatalogCapabilityRow[] = [
  {
    capability_id: "calendars",
    label: "Calendars",
    description: "Meetings",
    category: "Productivity",
    status: "ready_to_connect",
    status_label: "Ready to connect",
    providers: [
      {
        provider: "GOOGLE_WORKSPACE",
        label: "Google Calendar",
        oauth_slug: "google",
        employee_self_serve: true,
        status: "ready_to_connect",
        status_label: "Ready to connect",
        connect_action: "oauth_start",
      },
      {
        provider: "MICROSOFT_365",
        label: "Microsoft 365 Calendar",
        oauth_slug: "microsoft",
        employee_self_serve: true,
        status: "not_configured",
        status_label: "Not set up yet",
        connect_action: "request_admin",
      },
    ],
  },
  {
    capability_id: "chat",
    label: "Team chat",
    description: "Channels",
    category: "Communications",
    status: "connected",
    status_label: "Connected",
    providers: [
      {
        provider: "SLACK",
        label: "Slack",
        oauth_slug: "slack",
        employee_self_serve: true,
        status: "connected",
        status_label: "Connected",
        connect_action: "none",
        account_label: "Acme Workspace",
      },
    ],
  },
  {
    capability_id: "engineering",
    label: "Code",
    description: "Repos",
    category: "Engineering",
    status: "not_configured",
    status_label: "Not set up yet",
    providers: [
      {
        provider: "GITHUB",
        label: "GitHub",
        oauth_slug: null,
        employee_self_serve: false,
        status: "not_configured",
        status_label: "Not set up yet",
        connect_action: "request_admin",
      },
    ],
  },
];

describe("primary-work-tools", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("builds four primary cards with human status and Google CTA", () => {
    const cards = buildPrimaryToolCards(catalog);
    expect(cards).toHaveLength(4);
    const google = cards.find((c) => c.tool_id === "GOOGLE_WORKSPACE");
    expect(google?.primary_action).toBe("Connect Google Workspace");
    expect(google?.connect_action).toBe("oauth_start");
    expect(google?.status_label).toBe("Not connected");
    expect(google?.includes).toEqual(
      expect.arrayContaining(["Gmail", "Calendar", "Drive", "Docs"]),
    );

    const slack = cards.find((c) => c.tool_id === "SLACK");
    expect(slack?.status).toBe("connected");
    expect(slack?.account_label).toBe("Acme Workspace");
    expect(slack?.otzar_may.length).toBeGreaterThan(0);
    expect(slack?.primary_action).toBeNull();

    const github = cards.find((c) => c.tool_id === "GITHUB");
    expect(github?.primary_action).toBe("Ask admin to enable");
  });

  it("maps statuses and bans developer terms on employee primary text", () => {
    expect(mapEmployeeStatus("error_reconnect")).toBe("reconnect_required");
    expect(employeeStatusLabel("reconnect_required")).toBe("Reconnect required");
    expect(findBannedDevTerms("Connect Google Workspace")).toEqual([]);
    expect(findBannedDevTerms("Configure MCP and OAuth client ID")).toEqual(
      expect.arrayContaining(["mcp", "oauth client id"]),
    );
  });

  it("saves and loads return context safely", () => {
    saveConnectionReturnContext({
      returnPath: "/app/my-work",
      workTitle: "partner one-pager",
      toolId: "GOOGLE_WORKSPACE",
    });
    const ctx = loadConnectionReturnContext(false);
    expect(ctx?.returnPath).toBe("/app/my-work");
    expect(ctx?.workTitle).toBe("partner one-pager");

    saveConnectionReturnContext({ returnPath: "https://evil.example" });
    expect(loadConnectionReturnContext(true)).toBeNull();
  });

  it("builds connect deep links and oauth slug from labels", () => {
    expect(
      buildConnectDeepLink({
        tool: "google",
        returnPath: "/app/my-work",
        why: "partner one-pager",
      }),
    ).toContain("tool=google");
    expect(oauthSlugForConnectorLabel("Google Workspace")).toBe("google");
    expect(oauthSlugForConnectorLabel("Slack")).toBe("slack");
  });
});
