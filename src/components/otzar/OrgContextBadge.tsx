// FILE: OrgContextBadge.tsx
// PURPOSE: A-06 — show active org context; on org change clear blendable
//          client state and force Home. Multi-org list ready when memberships
//          are supplied (Foundation switch API later).
// CONNECTS TO: EmployeeLayout, org-switch.ts, api.otzar.contextHealth.

import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import {
  executeOrgSwitch,
  planOrgSwitch,
  readStoredActiveOrg,
  type OrgMembershipOption,
} from "@/lib/auth/org-switch";

export function OrgContextBadge(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const { entity, capabilities, setActiveOrg } = useAuthStore();
  const [orgName, setOrgName] = useState<string | null>(
    entity?.org_name ?? null,
  );
  const [orgId, setOrgId] = useState<string | null>(
    entity?.org_entity_id ?? null,
  );
  const [memberships, setMemberships] = useState<OrgMembershipOption[]>([]);
  const [ready, setReady] = useState(false);

  const applyOrg = useCallback(
    (nextId: string, nextName: string | null, membershipList: OrgMembershipOption[]) => {
      if (!entity?.email) return;
      const from = entity.org_entity_id ?? readStoredActiveOrg();
      const plan = executeOrgSwitch({
        fromOrgId: from,
        toOrgId: nextId,
        userKey: entity.email,
        capabilities,
        priorPath: location.pathname,
      });
      setActiveOrg({ org_entity_id: nextId, org_name: nextName });
      setOrgId(nextId);
      setOrgName(nextName);
      setMemberships(membershipList);
      setReady(true);
      if (plan.mustNavigateHome) {
        navigate(plan.destination, { replace: true });
      }
    },
    [entity, capabilities, location.pathname, navigate, setActiveOrg],
  );

  useEffect(() => {
    if (!entity?.email) return;
    let cancelled = false;
    void (async () => {
      const r = await api.otzar.contextHealth();
      if (cancelled) return;
      if (!r.ok) {
        setReady(true);
        return;
      }
      const id = r.data.identity?.org?.org_id ?? null;
      const name = r.data.identity?.org?.name ?? null;
      if (id === null || id.trim().length === 0) {
        setReady(true);
        return;
      }
      const list: OrgMembershipOption[] = [
        { org_entity_id: id, name: name ?? "Organization", active: true },
      ];
      // First bind or org change: execute switch contract (clears blend on change)
      applyOrg(id, name, list);
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once per authenticated email session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity?.email]);

  if (!entity) return null;

  const count = Math.max(memberships.length, orgId ? 1 : 0);

  return (
    <div
      className="hidden max-w-[10rem] items-center gap-1.5 truncate rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] text-slate-600 sm:flex"
      data-testid="org-context-badge"
      data-org-id={orgId ?? ""}
      data-org-name={orgName ?? ""}
      data-org-count={String(count)}
      data-org-switch-home="/app"
      data-org-context-ready={ready ? "true" : "false"}
      title={orgName ? `Organization: ${orgName}` : "Organization context"}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <span className="truncate font-medium text-slate-700" data-testid="org-context-name">
        {orgName ?? (ready ? "Organization" : "…")}
      </span>
      {memberships.length > 1 ? (
        <label className="sr-only" htmlFor="org-switch-select">
          Switch organization
        </label>
      ) : null}
      {memberships.length > 1 ? (
        <select
          id="org-switch-select"
          data-testid="org-switch-select"
          className="max-w-[6rem] truncate border-0 bg-transparent text-[11px] font-medium text-slate-700"
          value={orgId ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            const row = memberships.find((m) => m.org_entity_id === next);
            if (!row || !entity.email) return;
            const plan = planOrgSwitch({
              fromOrgId: orgId,
              toOrgId: next,
              userKey: entity.email,
              capabilities,
              priorPath: location.pathname,
            });
            executeOrgSwitch({
              fromOrgId: orgId,
              toOrgId: next,
              userKey: entity.email,
              capabilities,
              priorPath: location.pathname,
            });
            setActiveOrg({
              org_entity_id: next,
              org_name: row.name,
            });
            setOrgId(next);
            setOrgName(row.name);
            if (plan.mustNavigateHome) {
              navigate(plan.destination, { replace: true });
            }
          }}
        >
          {memberships.map((m) => (
            <option key={m.org_entity_id} value={m.org_entity_id}>
              {m.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
