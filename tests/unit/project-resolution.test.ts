// FILE: tests/unit/project-resolution.test.ts
// PURPOSE: J-03 — conversation resolves to project safely; one-hop heart.

import { describe, expect, it } from "vitest";
import {
  detectProjectIntent,
  extractNamedProjectQuery,
  matchProjects,
  projectHeartHref,
  resolveProjectFromConversation,
} from "../../src/lib/work-os/project-resolution";

const PROJECTS = [
  { project_id: "p1", name: "Phoenix Launch" },
  { project_id: "p2", name: "Onboarding Flow" },
  { project_id: "p3", name: "Phoenix Mobile" },
];

describe("J-03 detectProjectIntent", () => {
  it("detects list-only opens", () => {
    expect(detectProjectIntent("Open projects")?.mode).toBe("list");
    expect(detectProjectIntent("Show my projects")?.mode).toBe("list");
    expect(detectProjectIntent("Go to projects")?.mode).toBe("list");
  });

  it("detects named project open", () => {
    const i = detectProjectIntent("Open project Phoenix Launch");
    expect(i?.mode).toBe("named");
    expect(i?.query?.toLowerCase()).toContain("phoenix");
  });

  it("detects status of project", () => {
    const i = detectProjectIntent("Status of project Onboarding Flow");
    expect(i?.mode).toBe("status");
    expect(i?.query?.toLowerCase()).toMatch(/onboarding/);
  });

  it("ignores non-project work talk", () => {
    expect(detectProjectIntent("Open action center")).toBeNull();
    expect(detectProjectIntent("What is blocked?")).toBeNull();
    expect(detectProjectIntent("Create action items from this meeting.")).toBeNull();
    expect(detectProjectIntent("Ask David to review this.")).toBeNull();
  });
});

describe("J-03 extractNamedProjectQuery", () => {
  it("extracts quoted and unquoted names", () => {
    expect(extractNamedProjectQuery('Open project "Phoenix Launch"')).toMatch(
      /Phoenix Launch/i,
    );
    expect(extractNamedProjectQuery("Open project Onboarding Flow")).toMatch(
      /Onboarding Flow/i,
    );
  });
});

describe("J-03 matchProjects", () => {
  it("exact match wins", () => {
    const r = matchProjects("Phoenix Launch", PROJECTS);
    expect(r.mode).toBe("exact");
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0]!.project_id).toBe("p1");
  });

  it("partial multi-match needs choice", () => {
    const r = matchProjects("Phoenix", PROJECTS);
    expect(r.mode).toBe("partial");
    expect(r.matches.length).toBeGreaterThanOrEqual(2);
  });

  it("includes match for unique substring", () => {
    const r = matchProjects("Onboarding", PROJECTS);
    expect(r.mode).toBe("exact");
    expect(r.matches[0]!.project_id).toBe("p2");
  });
});

describe("J-03 resolveProjectFromConversation", () => {
  it("not_project_intent for unrelated talk", () => {
    expect(
      resolveProjectFromConversation("What is blocked?", PROJECTS).kind,
    ).toBe("not_project_intent");
  });

  it("no_projects honest path", () => {
    const r = resolveProjectFromConversation("Open projects", []);
    expect(r.kind).toBe("no_projects");
    expect(r.href).toBe("/app/work-projects");
    expect(r.message.toLowerCase()).toMatch(/not on any project|create/);
  });

  it("list_only navigates to projects without multi-hop", () => {
    const r = resolveProjectFromConversation("Open projects", PROJECTS);
    expect(r.kind).toBe("list_only");
    expect(r.href).toBe("/app/work-projects");
  });

  it("resolved named project has heart deep link", () => {
    const r = resolveProjectFromConversation(
      "Open project Onboarding Flow",
      PROJECTS,
    );
    expect(r.kind).toBe("resolved");
    expect(r.project?.project_id).toBe("p2");
    expect(r.href).toBe(projectHeartHref("p2"));
    expect(r.href).toContain("project=p2");
    expect(r.href).toContain("open=1");
    expect(r.message.toLowerCase()).toMatch(/opening|onboarding|one place/);
  });

  it("ambiguous name asks which project", () => {
    const r = resolveProjectFromConversation("Open project Phoenix", PROJECTS);
    expect(r.kind).toBe("needs_choice");
    expect(r.message.toLowerCase()).toMatch(/which|match/);
  });

  it("unknown name is not_found with list href", () => {
    const r = resolveProjectFromConversation(
      "Open project ZetaUnknown",
      PROJECTS,
    );
    expect(r.kind).toBe("not_found");
    expect(r.href).toBe("/app/work-projects");
  });

  it("single project status opens that heart", () => {
    const one = [PROJECTS[1]!];
    const r = resolveProjectFromConversation("Project status", one);
    expect(r.kind).toBe("resolved");
    expect(r.project?.project_id).toBe("p2");
  });
});

describe("J-03 projectHeartHref anti-maze", () => {
  it("is a single path with query — one hop", () => {
    const href = projectHeartHref("abc-123");
    expect(href.startsWith("/app/work-projects?")).toBe(true);
    expect(href.split("?").length).toBe(2);
    expect(href).not.toMatch(/\/app\/work-projects\/.+\/.+/); // no nested maze
  });
});
