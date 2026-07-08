// FILE: event-types.ts
// PURPOSE: Single source of truth mapping AuditEventType literal
//          values to customer-facing display labels for
//          audit-aware UI.
// CONNECTS TO: AuditEventTooltip (the audit subtext widget),
//              audit-aware toasts, Security & Audit screen (12D).
//
// VOCABULARY DISCIPLINE:
// This map is exhaustive over Foundation's AuditEventType union
// (kept in lockstep; SOURCE-INTEGRITY added the source-lifecycle
// events). Customer-facing labels translate the
// SCREAMING_SNAKE_CASE into enterprise-friendly capitalization
// while preserving the technical literal so audit-aware UI can
// surface the original on demand for compliance / forensic display.

import type { AuditEventType } from "@/lib/types/foundation";

export const AUDIT_EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  ENTITY_REGISTERED: "Entity Registered",
  ENTITY_SUSPENDED: "Entity Suspended",
  ENTITY_REACTIVATED: "Entity Reactivated",
  LOGIN_SUCCESS: "Login",
  LOGIN_FAILED: "Login Failed",
  LOGOUT: "Logout",
  SESSION_CREATED: "Session Created",
  SESSION_EXPIRED: "Session Expired",
  SESSION_REVOKED: "Session Revoked",
  CAPSULE_CREATED: "Knowledge Item Created",
  CAPSULE_METADATA_READ: "Knowledge Metadata Read",
  CAPSULE_CONTENT_READ: "Knowledge Content Read",
  CAPSULE_UPDATED: "Knowledge Item Updated",
  CAPSULE_DELETED: "Knowledge Item Deleted",
  PERMISSION_CREATED: "Permission Granted",
  PERMISSION_REVOKED: "Permission Revoked",
  PERMISSION_EXPIRED: "Permission Expired",
  DATA_MONETIZED: "Data Monetized",
  HIVE_CREATED: "Hive Created",
  HIVE_MEMBER_ADDED: "Hive Member Added",
  HIVE_MEMBER_REMOVED: "Hive Member Removed",
  HIVE_INTELLIGENCE_READ: "Hive Intelligence Read",
  HIVE_AGGREGATE_BUILT: "Hive Aggregate Built",
  COMPLIANCE_CHECK_PASSED: "Compliance Check Passed",
  COMPLIANCE_CHECK_FAILED: "Compliance Check Failed",
  ANOMALY_DETECTED: "Anomaly Detected",
  ADMIN_ACTION: "Admin Action",
  NEGOTIATE: "Negotiate",
  CONVERSATION_STARTED: "Conversation Started",
  CONVERSATION_CLOSED: "Conversation Closed",
  VOICE_NOTE_REVOKE_APPLIED: "Voice Note Undo Applied",
  USER_INVITED: "Member Invited",
  ACTIVATION_LINK_CREATED: "Activation Link Created",
  USER_ACTIVATED: "Member Activated",
  PASSWORD_RESET_LINK_CREATED: "Password Reset Link Created",
  PASSWORD_RESET_COMPLETED: "Password Reset Completed",
  SEEDED_CONTEXT_VALIDATED: "Background Context Validated",
  SEEDED_CONTEXT_RETIRED: "Background Context Retired",
  SEEDED_CONTEXT_RESTORED: "Background Context Restored",
  ACTIVATION_EMAIL_SENT: "Activation Email Sent",
  ACTIVATION_EMAIL_FAILED: "Activation Email Failed",
  STARTER_TWIN_PROVISIONED: "AI Twin Prepared",
  PASSWORD_CHANGED: "Password Changed",
  PASSWORD_RESET_EMAIL_SENT: "Password Reset Email Sent",
  PASSWORD_RESET_EMAIL_FAILED: "Password Reset Email Failed",
  WORK_PROFILE_UPDATED: "Work Profile Updated",
  DECISION_RIGHTS_UPDATED: "Decision Rights Updated",
  SOURCE_VERIFIED: "Source Verified",
  SOURCE_CHANGED_UPSTREAM: "Source Changed Upstream",
  SOURCE_ACCESS_REVOKED: "Source Access Revoked",
  SOURCE_DELETED: "Source Deleted",
  IMPORT_QUARANTINED: "Import Quarantined",
  IMPORT_FAILED: "Import Failed",
  CALENDAR_EVENT_CREATE: "Calendar Event Created",
  CALENDAR_EVENT_DELETE: "Calendar Event Cancelled",
} as const;

// WHAT: Look up the customer-facing label for an AuditEventType.
// INPUT: An AuditEventType literal value.
// OUTPUT: The display label, or the literal itself if no entry.
// WHY: Audit-aware UI uses this so toasts read "Audit logged:
//      Permission Granted" instead of "PERMISSION_CREATED". The
//      original literal is still available in the audit_event_id
//      navigation target.
export function getAuditEventLabel(type: AuditEventType): string {
  const curated = AUDIT_EVENT_TYPE_LABELS[type];
  if (curated !== undefined) return curated;
  // Phase 1255: NEW Foundation literals must never leak raw
  // UNDERSCORE_NAMES into admin copy — sentence-case them.
  const words = String(type).toLowerCase().split("_").filter(Boolean);
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
