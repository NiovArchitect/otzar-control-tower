// FILE: NotificationBell.tsx
// PURPOSE: Phase 1210 -- top-bar notification bell that surfaces
//          Foundation's self-scoped Notification inbox in the
//          employee chrome. Polls GET /api/v1/notifications on a
//          gentle interval, shows an unread count badge, and opens
//          a dropdown listing recent notifications with one-click
//          "Mark read" (PUT /api/v1/notifications/:id/read).
//
//          This is the recipient half of the Phase 1209 chat -> Action
//          -> Notification end-to-end. When Sadeil sends an internal
//          note to David via Otzar chat, David's bell now shows the
//          unread badge without a hard refresh.
//
// CONNECTS TO:
//   - src/lib/api.ts (api.notifications.list, api.notifications.markRead)
//   - src/lib/types/foundation.ts (SafeNotificationView,
//                                  NotificationListResponse)
//   - src/components/employee/EmployeeLayout.tsx (mount point)
//
// PRIVACY INVARIANT:
//   - Renders ONLY the SafeNotificationView projection (body_summary
//     is already SAFE-projected at Foundation; body_redacted is never
//     surfaced by the GET route).
//   - Never renders TAR / wallet_id / clearance / permission_id /
//     embedding / vector / bearer / raw policy JSON.
//   - The bell does NOT poll while the user is logged out (the
//     EmployeeLayout only mounts under EmployeeGuard).
//
// WARMWIND LANGUAGE PASS:
//   - "Notifications" / "Unread" / "Mark read" / "View all"
//     (no developer jargon like "notification_class" / "action_id"
//     in primary copy). Raw classes/codes are available on
//     data-* attributes for telemetry.

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import type { SafeNotificationView } from "@/lib/types/foundation";

const DEFAULT_POLL_MS = 30_000;
const PAGE_SIZE = 20;

interface Props {
  /** Optional override of the poll interval (ms). Tests pass 0 to
   *  disable polling entirely and drive list refreshes manually. */
  pollIntervalMs?: number;
}

interface State {
  items: SafeNotificationView[];
  total: number;
  loading: boolean;
  error: string | null;
  open: boolean;
}

export function NotificationBell({
  pollIntervalMs = DEFAULT_POLL_MS,
}: Props): JSX.Element {
  const authed = useAuthStore((s) => s.isAuthenticated);
  const [state, setState] = useState<State>({
    items: [],
    total: 0,
    loading: false,
    error: null,
    open: false,
  });
  const mountedRef = useRef(true);

  const fetchOnce = useCallback(async (): Promise<void> => {
    if (!authed) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const result = await api.notifications.list({ page_size: PAGE_SIZE });
    if (!mountedRef.current) return;
    if (!result.ok) {
      setState((s) => ({
        ...s,
        loading: false,
        error: result.code,
      }));
      return;
    }
    setState((s) => ({
      ...s,
      loading: false,
      items: result.data.notifications,
      total: result.data.total,
    }));
  }, [authed]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchOnce();
    if (pollIntervalMs <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }
    const id = window.setInterval(() => {
      void fetchOnce();
    }, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [fetchOnce, pollIntervalMs]);

  const unread = state.items.filter((n) => n.read_at === null);
  const unreadCount = unread.length;

  async function handleMarkRead(id: string): Promise<void> {
    // Optimistic UI: flip read_at immediately so the badge updates,
    // roll back on failure.
    const before = state.items;
    setState((s) => ({
      ...s,
      items: s.items.map((n) =>
        n.notification_id === id
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      ),
    }));
    const result = await api.notifications.markRead(id);
    if (!result.ok) {
      setState((s) => ({ ...s, items: before, error: result.code }));
    }
  }

  function toggle(): void {
    setState((s) => ({ ...s, open: !s.open }));
    // Refresh on open so the operator sees the freshest state.
    if (!state.open) void fetchOnce();
  }

  return (
    <div className="relative" data-testid="notification-bell-root">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded p-1.5 hover:bg-accent"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        data-testid="notification-bell-button"
        data-unread-count={unreadCount}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-medium text-white"
            data-testid="notification-bell-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {state.open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-popover p-2 shadow-lg"
          data-testid="notification-bell-dropdown"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium">Notifications</span>
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          </div>
          {state.error !== null ? (
            <p
              className="rounded border border-rose-400/40 bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-400"
              role="alert"
              data-testid="notification-bell-error"
            >
              Couldn't load notifications. ({state.error})
            </p>
          ) : null}
          {state.loading && state.items.length === 0 ? (
            <p
              className="px-2 py-3 text-xs text-muted-foreground"
              data-testid="notification-bell-loading"
            >
              Loading…
            </p>
          ) : state.items.length === 0 ? (
            <p
              className="px-2 py-3 text-xs text-muted-foreground"
              data-testid="notification-bell-empty"
            >
              You're all caught up — no notifications yet.
            </p>
          ) : (
            <ul
              className="max-h-80 space-y-1 overflow-y-auto"
              data-testid="notification-bell-list"
            >
              {state.items.map((n) => {
                const isUnread = n.read_at === null;
                return (
                  <li
                    key={n.notification_id}
                    className={`rounded p-2 text-xs ${
                      isUnread ? "bg-amber-500/5" : "bg-transparent"
                    }`}
                    data-testid="notification-bell-item"
                    data-notification-id={n.notification_id}
                    data-notification-class={n.notification_class}
                    data-action-id={n.action_id ?? ""}
                    data-unread={isUnread ? "true" : "false"}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="line-clamp-3 text-foreground">
                          {n.body_summary}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatRelative(n.created_at)}
                        </p>
                      </div>
                      {isUnread ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(n.notification_id)}
                          className="shrink-0 rounded p-1 hover:bg-accent"
                          aria-label="Mark as read"
                          data-testid="notification-mark-read"
                        >
                          <Check className="h-3 w-3" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const delta = Math.max(0, Math.floor((now - t) / 1000));
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}
