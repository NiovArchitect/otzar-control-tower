// FILE: entity-types.ts
// PURPOSE: Single source of truth mapping EntityType literal values
//          to customer-facing display labels.
// CONNECTS TO: Users table (12B.2), AI Teammates table (12B.3),
//              Member detail panels.
//
// VOCABULARY DISCIPLINE (per Emphasis 1, 12B.1):
// Foundation's `enum EntityType` has 6 values: PERSON, COMPANY,
// AI_AGENT, DEVICE, APPLICATION, GOVERNMENT. Customers see these as
// "Person, Organization, AI Teammate, Device, Application,
// Government Agency" -- the enterprise vocabulary. Never hardcode
// an EntityType literal in UI.

import type { EntityType } from "@/lib/types/foundation";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  PERSON: "Person",
  COMPANY: "Organization",
  AI_AGENT: "AI Teammate",
  DEVICE: "Device",
  APPLICATION: "Application",
  GOVERNMENT: "Government Agency",
} as const;

// WHAT: Look up the customer-facing label for an EntityType literal.
// INPUT: An EntityType literal value.
// OUTPUT: The display label, or the literal itself if no entry.
// WHY: Centralized lookup so call sites don't hardcode either form.
export function getEntityTypeLabel(type: EntityType): string {
  return ENTITY_TYPE_LABELS[type] ?? type;
}
