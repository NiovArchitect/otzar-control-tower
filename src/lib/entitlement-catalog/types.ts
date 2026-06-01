// FILE: types.ts
// PURPOSE: Type definitions for the CT-side mirror of the
//          Foundation Section 8 B2 static entitlement catalog
//          (Foundation PR #179, HEAD 308486c). These types describe
//          the compact derived shape the Control Tower /billing
//          read-only preview consumes.
//          Read-only template metadata. NEVER live billing.
//          NEVER live payment. NEVER live entitlement enforcement.
//          NEVER live feature gating.
// CONNECTS TO: src/lib/entitlement-catalog/data.ts,
//              src/pages/BillingPreview.tsx.

export interface CatalogCounts {
  plans: number;
  seats: number;
  capability_packs: number;
  connector_pack_families: number;
  usage_meters: number;
  governance_rules: number;
  non_paywallable_safety_rules: number;
  downgrade_policies: number;
  enterprise_add_ons: number;
}

export interface PlanPreview {
  plan_id: string;
  name: string;
  target_customer: string;
  base_summary: string;
  included_base_features: string[];
  included_seat_types: string[];
  included_capability_packs: string[];
  excluded_features: string[];
  upgrade_path: string;
  downgrade_behavior: string;
  DMW_baseline_included: true;
  safety_baseline_included: true;
  audit_baseline_included: true;
}

export interface SeatPreview {
  seat_id: string;
  name: string;
  target_roles: string;
  suggested_internal_price_range: string;
  included_capabilities: string[];
  excluded_capabilities: string[];
  governance_requirements: string[];
  DMW_baseline_included: true;
}

export interface CapabilityPackPreview {
  pack_id: string;
  name: string;
  description: string;
  included_features: string[];
  activation_requirements: string[];
  entitlement_does_not_authorize: string[];
}

export interface ConnectorPackFamilyPreview {
  pack_id: string;
  name: string;
  vendors: string[];
  wave_6_first_connector_candidate?: string;
  activation_requirements: string[];
}

export interface UsageMeterPreview {
  meter_id: string;
  name: string;
  unit: string;
  counted_event: string;
  enforcement_mode: string;
}

export interface GovernanceRulePreview {
  id: string;
  name: string;
  human_readable_summary: string;
}

export interface NonPaywallableSafetyRulePreview {
  id: string;
  name: string;
  human_readable_summary: string;
}

export interface DowngradePolicyPreview {
  policy_id: string;
  name: string;
  human_readable_summary: string;
  preserved_invariants: string[];
}

export interface EnterpriseAddOnPreview {
  id: string;
  name: string;
  description: string;
}

export interface BillingAdminPermissionProfilePreview {
  id: string;
  name: string;
  description: string;
  safe_defaults: string[];
  forbidden_defaults: string[];
}

export interface EntitlementCatalogMirror {
  source_doctrine: string[];
  base_platform: {
    base_price_anchor: string;
    base_includes: string[];
    base_excludes_at_starter_pilot: string[];
  };
  counts: CatalogCounts;
  plans: PlanPreview[];
  seats: SeatPreview[];
  capability_packs: CapabilityPackPreview[];
  connector_pack_families: ConnectorPackFamilyPreview[];
  usage_meters: UsageMeterPreview[];
  governance_rules: GovernanceRulePreview[];
  non_paywallable_safety_rules: NonPaywallableSafetyRulePreview[];
  downgrade_policies: DowngradePolicyPreview[];
  enterprise_add_ons: EnterpriseAddOnPreview[];
  billing_admin_permission_profile: BillingAdminPermissionProfilePreview;
  forbidden_inferences: string[];
  preview_disclaimers: string[];
}
