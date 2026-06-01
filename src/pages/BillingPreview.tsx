// FILE: BillingPreview.tsx
// PURPOSE: Section 8 B3 — Control Tower /billing read-only preview
//          of the Foundation B2 static entitlement catalog.
//          Composes against the CT-side mirror at
//          src/lib/entitlement-catalog/data.ts.
//
//          CANONICAL DOCTRINE (Founder, preserved verbatim):
//            "Billing is not just payment. Billing is the
//             entitlement layer that controls how Otzar's governed
//             intelligence capabilities scale across an enterprise."
//            "The DMW is not a luxury add-on. The Memory Wallet is
//             foundational trust infrastructure."
//            "Customers should not pay extra just to have memory be
//             safe."
//            "Billing says what the organization has purchased.
//             Governance says what the system may safely do."
//            "Billing may entitle a connector pack; governance
//             still authorizes connector activation."
//            "Capability packs entitle availability; they do not
//             authorize activation."
//            "Connector packs are not live connectors."
//            "This preview does not charge customers, activate
//             billing, gate features, or connect payment providers."
//
//          Read-only — NO runtime billing, NO payment provider,
//          NO entitlement enforcement, NO feature gating, NO
//          customer subscription mutation, NO checkout, NO
//          invoices, NO payment methods, NO usage metering
//          runtime, NO connector activation, NO Dandelion
//          activation, NO workflow runtime, NO DMW runtime,
//          NO BEAM / Python / Elixir, NO new audit literal,
//          NO mutation to existing Foundation services.
//
//          No subscription state. No payment method UI. No
//          invoice generation. No feature flags. No checkout.
//          Forbidden inferences absolute (employee scoring,
//          manager surveillance, psychological profile,
//          sensitive-attribute inference, guaranteed compliance,
//          regulator approval claims).
// CONNECTS TO: src/lib/entitlement-catalog/data.ts,
//              src/lib/entitlement-catalog/types.ts,
//              src/components/PageHeader.tsx, ui/* primitives.
// FOUNDATION SOURCE: docs/entitlement-catalog/* (PR #179 HEAD 308486c).

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { ENTITLEMENT_CATALOG_MIRROR } from "@/lib/entitlement-catalog/data";

const CATALOG = ENTITLEMENT_CATALOG_MIRROR;

const DOCTRINE_PRIMARY =
  "Billing says what the organization has purchased. Governance says what the system may safely do.";

const DMW_DOCTRINE_LINE =
  "Customers should not pay extra just to have memory be safe.";

const PACK_DOES_NOT_AUTHORIZE_LINE =
  "Capability packs entitle availability; they do not authorize activation.";

const CONNECTOR_NOT_LIVE_LINE =
  "Connector packs are not live connectors.";

const PREVIEW_DISCLAIMER_LINE =
  "This preview does not charge customers, activate billing, gate features, or connect payment providers.";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle ? (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      ) : null}
    </div>
  );
}

function DoctrineCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview posture & doctrine</CardTitle>
        <CardDescription>{DOCTRINE_PRIMARY}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="font-medium">{DMW_DOCTRINE_LINE}</p>
        <p>
          The DMW is not a luxury add-on. The Memory Wallet is foundational
          trust infrastructure.
        </p>
        <p>{PREVIEW_DISCLAIMER_LINE}</p>
        <Separator />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <p className="font-medium">This preview is</p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Read-only catalog mirror</li>
              <li>DMW baseline included on every plan and every seat</li>
              <li>$250 base anchored at Starter / Pilot + Team</li>
              <li>Basic memory safety is not paywallable</li>
              <li>Baseline audit + security never paywalled</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">This preview is not</p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Runtime billing</li>
              <li>Payment provider integration</li>
              <li>Entitlement enforcement</li>
              <li>Feature gating</li>
              <li>Customer subscription mutation</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CountsCard() {
  const c = CATALOG.counts;
  const counts: { label: string; value: number }[] = [
    { label: "Plans", value: c.plans },
    { label: "Seat tiers", value: c.seats },
    { label: "Capability packs", value: c.capability_packs },
    { label: "Connector pack families", value: c.connector_pack_families },
    { label: "Usage meter templates", value: c.usage_meters },
    { label: "Governance rules", value: c.governance_rules },
    { label: "Non-paywallable safety rules", value: c.non_paywallable_safety_rules },
    { label: "Downgrade policies", value: c.downgrade_policies },
    { label: "Enterprise add-ons", value: c.enterprise_add_ons },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog summary</CardTitle>
        <CardDescription>
          Static catalog at Foundation `docs/entitlement-catalog/` (PR #179).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {counts.map((c) => (
            <div
              key={c.label}
              className="rounded-md border bg-muted/40 p-3"
            >
              <div className="text-2xl font-semibold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BasePlatformCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Base platform</CardTitle>
        <CardDescription>
          {CATALOG.base_platform.base_price_anchor} — DMW baseline included.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium">Base includes</p>
          <ul className="list-disc list-inside text-muted-foreground">
            {CATALOG.base_platform.base_includes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium">Not included at Starter / Pilot</p>
          <ul className="list-disc list-inside text-muted-foreground">
            {CATALOG.base_platform.base_excludes_at_starter_pilot.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function PlansSection() {
  return (
    <section data-testid="plans-section">
      <SectionHeader
        title="Plan templates"
        subtitle="Every plan: DMW baseline included, safety baseline included, audit baseline included."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATALOG.plans.map((plan) => (
          <Card key={plan.plan_id} data-testid={`plan-${plan.plan_id}`}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.target_customer}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{plan.base_summary}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">DMW baseline included</Badge>
                <Badge variant="outline">Audit baseline included</Badge>
                <Badge variant="outline">Safety baseline included</Badge>
              </div>
              <div>
                <p className="font-medium">Included seat types</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {plan.included_seat_types.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              {plan.included_capability_packs.length > 0 ? (
                <div>
                  <p className="font-medium">Included capability packs</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {plan.included_capability_packs.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="font-medium">Upgrade path</p>
                <p className="text-muted-foreground">{plan.upgrade_path}</p>
              </div>
              <div>
                <p className="font-medium">Downgrade behavior</p>
                <p className="text-muted-foreground">{plan.downgrade_behavior}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SeatsSection() {
  return (
    <section data-testid="seats-section">
      <SectionHeader
        title="Seat tiers"
        subtitle="Every seat: DMW baseline included. Suggested internal price ranges are anchors, not contractual."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATALOG.seats.map((seat) => (
          <Card key={seat.seat_id} data-testid={`seat-${seat.seat_id}`}>
            <CardHeader>
              <CardTitle>{seat.name}</CardTitle>
              <CardDescription>{seat.target_roles}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                Suggested internal: {seat.suggested_internal_price_range}
              </p>
              <Badge variant="outline">DMW baseline included</Badge>
              <div>
                <p className="font-medium">Included capabilities</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {seat.included_capabilities.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Excluded capabilities</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {seat.excluded_capabilities.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Governance requirements</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {seat.governance_requirements.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CapabilityPacksSection() {
  return (
    <section data-testid="packs-section">
      <SectionHeader
        title="Capability packs"
        subtitle={PACK_DOES_NOT_AUTHORIZE_LINE}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATALOG.capability_packs.map((pack) => (
          <Card key={pack.pack_id}>
            <CardHeader>
              <CardTitle>{pack.name}</CardTitle>
              <CardDescription>{pack.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Included features</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {pack.included_features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Activation requirements</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {pack.activation_requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Entitlement does NOT authorize</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {pack.entitlement_does_not_authorize.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ConnectorFamiliesSection() {
  return (
    <section data-testid="connector-families-section">
      <SectionHeader
        title="Connector pack families"
        subtitle={`Billing may entitle a connector pack; governance still authorizes connector activation. ${CONNECTOR_NOT_LIVE_LINE}`}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATALOG.connector_pack_families.map((fam) => (
          <Card key={fam.pack_id} data-testid={`connector-family-${fam.pack_id}`}>
            <CardHeader>
              <CardTitle>{fam.name}</CardTitle>
              <CardDescription>
                {fam.wave_6_first_connector_candidate
                  ? `First-week candidate: ${fam.wave_6_first_connector_candidate}`
                  : "Forward-substrate per ADR-0084 first-connector arc"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Vendors</p>
                <div className="flex flex-wrap gap-1">
                  {fam.vendors.map((v) => (
                    <Badge key={v} variant="outline">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium">Activation requirements</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {fam.activation_requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function UsageMetersSection() {
  return (
    <section data-testid="meters-section">
      <SectionHeader
        title="Usage meter templates"
        subtitle="No runtime metering is active from this page. All meters are templates; runtime is deferred to a later slice."
      />
      <Card>
        <CardContent className="pt-6">
          <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            {CATALOG.usage_meters.map((m) => (
              <li key={m.meter_id} className="rounded border p-2">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  Unit: {m.unit}
                </div>
                <div className="text-xs text-muted-foreground">
                  Counted: {m.counted_event}
                </div>
                <Badge variant="outline" className="mt-1">
                  {m.enforcement_mode}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function GovernanceAndNonPaywallableSection() {
  return (
    <section data-testid="governance-section" className="space-y-4">
      <SectionHeader
        title="Governance rules"
        subtitle="Foundation governance is absolute regardless of commercial tier."
      />
      <Card>
        <CardContent className="pt-6">
          <ul className="space-y-2 text-sm">
            {CATALOG.governance_rules.map((r) => (
              <li key={r.id} className="rounded border p-2">
                <div className="font-medium">{r.name}</div>
                <div className="text-muted-foreground">{r.human_readable_summary}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <SectionHeader
        title="Non-paywallable safety"
        subtitle="These are absolute. They are included in every plan and preserved through every downgrade, non-payment, cancellation, or contract end."
      />
      <Card data-testid="non-paywallable-section">
        <CardContent className="pt-6">
          <ul className="space-y-2 text-sm">
            {CATALOG.non_paywallable_safety_rules.map((r) => (
              <li key={r.id} className="rounded border p-2">
                <div className="font-medium">{r.name}</div>
                <div className="text-muted-foreground">{r.human_readable_summary}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function DowngradePoliciesSection() {
  return (
    <section data-testid="downgrade-section">
      <SectionHeader
        title="Downgrade policies"
        subtitle="Downgrades may disable new premium actions but must never delete audit history, violate retention, or break evidence integrity."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATALOG.downgrade_policies.map((p) => (
          <Card key={p.policy_id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription>{p.human_readable_summary}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">Preserved invariants</p>
              <ul className="list-disc list-inside text-muted-foreground">
                {p.preserved_invariants.map((inv) => (
                  <li key={inv}>{inv}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function EnterpriseAddOnsSection() {
  return (
    <section data-testid="addons-section">
      <SectionHeader
        title="Enterprise add-ons"
        subtitle="Available for Enterprise plans. Final commercial terms negotiated per opportunity."
      />
      <Card>
        <CardContent className="pt-6">
          <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            {CATALOG.enterprise_add_ons.map((a) => (
              <li key={a.id} className="rounded border p-2">
                <div className="font-medium">{a.name}</div>
                <div className="text-muted-foreground">{a.description}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function BillingAdminProfileSection() {
  const p = CATALOG.billing_admin_permission_profile;
  return (
    <section data-testid="billing-admin-section">
      <SectionHeader
        title="Billing Admin permission profile"
        subtitle="Per ADR-0083 Amendment 1 §9.7. Owns commercial state; never overrides Foundation governance."
      />
      <Card>
        <CardHeader>
          <CardTitle>{p.name}</CardTitle>
          <CardDescription>{p.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Safe defaults</p>
            <ul className="list-disc list-inside text-muted-foreground">
              {p.safe_defaults.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Out-of-scope (governance-owned)</p>
            <ul className="list-disc list-inside text-muted-foreground">
              {p.forbidden_defaults.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function BillingPreviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Entitlements Preview"
        description={DOCTRINE_PRIMARY}
      />
      <DoctrineCard />
      <CountsCard />
      <BasePlatformCard />
      <PlansSection />
      <SeatsSection />
      <CapabilityPacksSection />
      <ConnectorFamiliesSection />
      <UsageMetersSection />
      <GovernanceAndNonPaywallableSection />
      <DowngradePoliciesSection />
      <EnterpriseAddOnsSection />
      <BillingAdminProfileSection />
    </div>
  );
}
