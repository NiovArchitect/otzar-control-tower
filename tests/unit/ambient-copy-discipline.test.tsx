// FILE: tests/unit/ambient-copy-discipline.test.tsx
// PURPOSE: Phase 1235 — the global ambient-copy sweep. Renders every
//          employee-facing page (auth'd, MSW defaults; unmocked
//          fetches fail closed into the pages' own error/empty
//          states) and asserts NO developer vocabulary ever reaches
//          visible text. Admin/diagnostic pages get a relaxed tier
//          (technical detail is allowed there by design), but raw
//          internals are banned everywhere.
// CONNECTS TO: every page under src/pages/app/, the Phase 1217/1219
//          per-page jargon bans (this is the org-wide lock).

import { describe, expect, it, beforeEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth";

import { ActionCenter } from "@/pages/app/ActionCenter";
import { Approvals } from "@/pages/app/Approvals";
import { AuthorityGrants } from "@/pages/app/AuthorityGrants";
import { Collaboration } from "@/pages/app/Collaboration";
import { CollaborationWorkspaces } from "@/pages/app/CollaborationWorkspaces";
import { Comms } from "@/pages/app/Comms";
import { ConnectorHealth } from "@/pages/app/ConnectorHealth";
import { Conversations } from "@/pages/app/Conversations";
import { Corrections } from "@/pages/app/Corrections";
import { MeetingCaptures } from "@/pages/app/MeetingCaptures";
import { MyDay } from "@/pages/app/MyDay";
import { MyMemory } from "@/pages/app/MyMemory";
import { MyOrganization } from "@/pages/app/MyOrganization";
import { MyTwin } from "@/pages/app/MyTwin";
import { Observe } from "@/pages/app/Observe";
import { OnboardingReadiness } from "@/pages/app/OnboardingReadiness";
import { Preferences } from "@/pages/app/Preferences";
import { VoiceCaptures } from "@/pages/app/VoiceCaptures";
import { WorkProjects } from "@/pages/app/WorkProjects";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

beforeEach(() => setAuth());

// Raw internals: banned on EVERY page, including admin/diagnostics.
const BANNED_EVERYWHERE = [
  "capsule_id",
  "wallet_id",
  "raw JSON",
  "DMW object",
  "COSMP capsule",
  "chain_hash",
  "payload_redacted",
  "policy_envelope",
];

// Developer vocabulary: banned on normal-employee pages. Admin /
// diagnostics pages (relaxed tier) may name technical concepts.
const BANNED_FOR_EMPLOYEES = ["payload", " adapter", "API key"];

interface PageCase {
  name: string;
  element: JSX.Element;
  tier: "employee" | "admin";
}

const PAGES: PageCase[] = [
  { name: "MyDay", element: <MyDay />, tier: "employee" },
  { name: "ActionCenter", element: <ActionCenter />, tier: "employee" },
  { name: "Approvals", element: <Approvals />, tier: "employee" },
  { name: "AuthorityGrants", element: <AuthorityGrants />, tier: "employee" },
  { name: "Collaboration", element: <Collaboration />, tier: "employee" },
  {
    name: "CollaborationWorkspaces",
    element: <CollaborationWorkspaces />,
    tier: "employee",
  },
  { name: "Comms", element: <Comms />, tier: "employee" },
  { name: "Conversations", element: <Conversations />, tier: "employee" },
  { name: "Corrections", element: <Corrections />, tier: "employee" },
  { name: "MeetingCaptures", element: <MeetingCaptures />, tier: "employee" },
  { name: "MyMemory", element: <MyMemory />, tier: "employee" },
  { name: "MyOrganization", element: <MyOrganization />, tier: "employee" },
  { name: "MyTwin", element: <MyTwin />, tier: "employee" },
  { name: "Observe", element: <Observe />, tier: "employee" },
  { name: "Preferences", element: <Preferences />, tier: "employee" },
  { name: "VoiceCaptures", element: <VoiceCaptures />, tier: "employee" },
  { name: "WorkProjects", element: <WorkProjects />, tier: "employee" },
  // Admin / diagnostics tier — technical concepts allowed, raw
  // internals still banned.
  { name: "ConnectorHealth", element: <ConnectorHealth />, tier: "admin" },
  {
    name: "OnboardingReadiness",
    element: <OnboardingReadiness />,
    tier: "admin",
  },
];

describe("Phase 1235 — ambient copy discipline (global sweep)", () => {
  for (const page of PAGES) {
    it(`${page.name} never leaks raw internals${page.tier === "employee" ? " or developer vocabulary" : ""}`, async () => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>{page.element}</MemoryRouter>
        </QueryClientProvider>,
      );
      await waitFor(() => {
        const text = document.body.textContent ?? "";
        expect(text.length).toBeGreaterThan(10);
      });
      // Give mount fetches a beat to settle into success/error states.
      await new Promise((r) => setTimeout(r, 150));
      const text = document.body.textContent ?? "";
      for (const banned of BANNED_EVERYWHERE) {
        expect(text, `${page.name} leaked "${banned}"`).not.toContain(banned);
      }
      if (page.tier === "employee") {
        for (const banned of BANNED_FOR_EMPLOYEES) {
          expect(text, `${page.name} leaked "${banned}"`).not.toContain(
            banned,
          );
        }
      }
      cleanup();
    });
  }
});
