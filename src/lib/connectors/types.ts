// FILE: types.ts
// PURPOSE: CT-side mirror of the Foundation Section 4 ConnectorBinding
//          shapes consumed by the /connectors admin surface. Mirrors
//          Foundation's apps/api/src/services/connector/connector-
//          binding.service.ts ConnectorBindingView +
//          RegisterConnectorBindingInput + ConnectorBindingFailure
//          shapes verbatim — every field name + type matches the
//          backend surface so the projection is shared.
//
//          Foundation privacy invariant preserved at the CT register:
//          the secret_ref field carries the env-var NAME (e.g.
//          "SLACK_BOT_TOKEN_PROD"); the resolved env-var VALUE never
//          crosses the API boundary and the CT page never attempts
//          to display, decode, or interpret it.
//
//          C2 Slack read-first runtime is LIVE at Foundation
//          (PR #185); this CT surface graduates Section 4 Slack from
//          RUNTIME_READY (backend) toward OPERATING (admin self-serve
//          binding creation + listing + enable/disable + soft-delete).
// CONNECTS TO: src/lib/connectors/data.ts (closed-vocab type registry
//              mirror), src/lib/api.ts (api.connectors namespace),
//              src/pages/ConnectorsAdmin.tsx.

export type CtConnectorType = "OUTBOUND_WEBHOOK" | "FIXTURE_ECHO" | "SLACK_READ";

export interface ConnectorBindingView {
  binding_id: string;
  org_entity_id: string;
  type: CtConnectorType;
  display_name: string;
  config: Record<string, unknown>;
  /** Env-var NAME only; the resolved VALUE never crosses the API boundary. */
  secret_ref: string | null;
  enabled: boolean;
  created_by_entity_id: string;
  created_at: string;
  updated_at: string;
}

export interface ListConnectorBindingsSuccess {
  ok: true;
  bindings: ConnectorBindingView[];
}

export interface GetConnectorBindingSuccess {
  ok: true;
  binding: ConnectorBindingView;
}

export interface RegisterConnectorBindingInput {
  type: CtConnectorType;
  display_name: string;
  config?: Record<string, unknown>;
  /** Env-var NAME only; admins must NEVER paste the resolved bot token here. */
  secret_ref?: string | null;
}

export interface RegisterConnectorBindingSuccess {
  ok: true;
  binding: ConnectorBindingView;
  audit_event_id: string;
}

export interface UpdateConnectorBindingInput {
  display_name?: string;
  config?: Record<string, unknown>;
  secret_ref?: string | null;
  enabled?: boolean;
}

export interface UpdateConnectorBindingSuccess {
  ok: true;
  binding: ConnectorBindingView;
  audit_event_id: string;
}

export interface DeleteConnectorBindingSuccess {
  ok: true;
  binding_id: string;
  audit_event_id: string;
}

export type ConnectorBindingFailureCode =
  | "INVALID_FIELD"
  | "UNKNOWN_CONNECTOR_TYPE"
  | "SECRET_REF_REQUIRED"
  | "SECRET_REF_INVALID"
  | "BINDING_NOT_FOUND"
  | "DUPLICATE_DISPLAY_NAME"
  | "INTERNAL_ERROR";

export interface ConnectorBindingFailureResponse {
  ok: false;
  code: ConnectorBindingFailureCode;
  message?: string;
  invalid_fields?: string[];
}
