// FILE: BulkAutonomyAction.ts
// PURPOSE: Adapter that produces three BulkAction<string> entries
//          (one per TwinAutonomyLevel) so that AI Teammates
//          row-selection can flip Behavior Policy in bulk through
//          the existing BulkActionsBar contract -- no edits to
//          BulkActionsBar.tsx itself.
// CONNECTS TO: BulkActionsBar (consumer), api.org.aiTeammates.update
//              (perItem fan-out), AUTONOMY_LEVEL_LABELS (button copy).
//
// DESIGN: BulkActionsBar treats each toolbar button as a single
// BulkAction with a fixed perItem handler. To support "set autonomy
// to X" without modifying the bar, we surface ONE BulkAction PER
// autonomy level. Each perItem closes over its level and calls
// api.org.aiTeammates.update(id, { autonomy_level }) -- the 12B.0
// success arm carries the audit_event_id that BulkActionsBar
// surfaces in the bulk-success toast.
//
// 12B.3 SCOPE: read + assign + behavior-policy-change. Suspend /
// reactivate flows for AI Teammates are not in 12B.3 (the existing
// PATCH /org/entities/:id audit gap is the open thread; tracked for
// the 12C.0 batch reminder).

import type { BulkAction } from "@/components/users/BulkActionsBar";
import { api } from "@/lib/api";
import {
  AUTONOMY_LEVEL_LABELS,
  getAutonomyLevelLabel,
} from "@/lib/labels/autonomy-levels";
import type { TwinAutonomyLevel } from "@/lib/types/foundation";

export function bulkAutonomyActions(): BulkAction<string>[] {
  return (Object.keys(AUTONOMY_LEVEL_LABELS) as TwinAutonomyLevel[]).map(
    (level) => ({
      key: `set-autonomy-${level}`,
      label: `Set: ${getAutonomyLevelLabel(level)}`,
      audit_event_type: "ADMIN_ACTION",
      audit_action_label: "AI_TEAMMATE_UPDATE",
      requireConfirmation: true,
      confirmationDescription:
        "Behavior Policy applies to every selected AI Teammate. Each change writes its own audit event.",
      perItem: async (id) => {
        const r = await api.org.aiTeammates.update(id, {
          autonomy_level: level,
        });
        if (!r.ok) {
          return { ok: false, error: r.message };
        }
        return { ok: true, audit_event_id: r.data.audit_event_id };
      },
    }),
  );
}
