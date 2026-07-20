// FILE: tests/unit/capability-first-tools.test.ts
// PURPOSE: O-01 — capability-first primary; MCP advanced-only contract.

import { describe, expect, it } from "vitest";
import {
  ADMIN_TOOLS_PATH,
  ADMIN_TOOLS_TAB_ORDER,
  DEFAULT_ADMIN_TOOLS_TAB,
  EMPLOYEE_TOOLS_PATH,
  adminToolsTabFingerprint,
  isAdminToolsPath,
  isCapabilityFirstCopy,
  isEmployeeCapabilityFirstPath,
  isValidAdminTabOrder,
  MCP_ADVANCED_ONLY_COPY,
  MCP_TAB_LABEL,
} from "@/lib/connectors/capability-first-tools";

describe("O-01 capability-first tools contract", () => {
  it("employee primary path is connector-health, not MCP rails", () => {
    expect(EMPLOYEE_TOOLS_PATH).toBe("/app/connector-health");
    expect(isEmployeeCapabilityFirstPath("/app/connector-health")).toBe(true);
    expect(isEmployeeCapabilityFirstPath("/tools-connections")).toBe(false);
    expect(EMPLOYEE_TOOLS_PATH.toLowerCase()).not.toMatch(/mcp|rails/);
  });

  it("admin default tab is inventory; advanced is last", () => {
    expect(DEFAULT_ADMIN_TOOLS_TAB).toBe("inventory");
    expect(ADMIN_TOOLS_TAB_ORDER[0]).toBe("inventory");
    expect(ADMIN_TOOLS_TAB_ORDER[ADMIN_TOOLS_TAB_ORDER.length - 1]).toBe(
      "advanced",
    );
    expect(isValidAdminTabOrder([...ADMIN_TOOLS_TAB_ORDER])).toBe(true);
    expect(adminToolsTabFingerprint([...ADMIN_TOOLS_TAB_ORDER])).toBe(
      "inventory>connected>advanced",
    );
  });

  it("MCP copy is advanced-only framing", () => {
    expect(MCP_TAB_LABEL.toLowerCase()).toMatch(/advanced|mcp|developer/);
    expect(MCP_ADVANCED_ONLY_COPY.toLowerCase()).toMatch(
      /technical|administrators|ordinary|not require/,
    );
  });

  it("capability-first copy rejects MCP-leading primary copy", () => {
    expect(
      isCapabilityFirstCopy("Connect by capability — calendar, documents, Meet"),
    ).toBe(true);
    expect(isCapabilityFirstCopy("MCP protocol rails for everyone")).toBe(false);
    expect(
      isCapabilityFirstCopy("Nobody needs MCP jargon for daily setup"),
    ).toBe(true);
  });

  it("admin tools path detection", () => {
    expect(isAdminToolsPath(ADMIN_TOOLS_PATH)).toBe(true);
    expect(isAdminToolsPath("/app/connector-health")).toBe(false);
  });
});
