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
import { useNavigate } from "react-router-dom";
import { Bell, Check, Reply, Send, X } from "lucide-react";
import { api } from "@/lib/api";
import { notificationRoute } from "@/lib/work-os/notification-routing";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { AIBreakdownButton } from "@/components/otzar/AIBreakdownButton";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import { viewWhyFromNotification } from "@/lib/work-os/view-why";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { useWorkStateChanged } from "@/lib/events/work-state";
import type { SafeNotificationView } from "@/lib/types/foundation";

function randomIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `reply-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

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
  /** Phase 1267 — a clean, humanized error for a mark-read/action
   *  failure, kept SEPARATE from the list-load `error` so a failed
   *  checkbox never blanks the panel or shows a raw network code. */
  markError: string | null;
  open: boolean;
  /** Per-notification reply UI state. Keyed by notification_id. */
  replies: Record<
    string,
    | undefined
    | {
        text: string;
        sending: boolean;
        sentActionId: string | null;
        error: string | null;
      }
  >;
}

export function NotificationBell({
  pollIntervalMs = DEFAULT_POLL_MS,
}: Props): JSX.Element {
  const authed = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [state, setState] = useState<State>({
    items: [],
    total: 0,
    loading: false,
    error: null,
    markError: null,
    open: false,
    replies: {},
  });
  const mountedRef = useRef(true);
  // Phase 1285-L — which notification's structured View/Why is expanded.
  const [whyId, setWhyId] = useState<string | null>(null);

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

  // Phase 1285-Q — event-driven refresh so the inbox is never stale after a new
  // message / work event. Additive to the gentle poll + on-open refresh; keeps
  // the unread badge + popup (driven by the shared presence store) honest.
  useWorkStateChanged(
    ["MESSAGE_CREATED", "NOTIFICATION_CREATED", "WAITING_ON_CHANGED", "TASK_COMPLETED"],
    () => void fetchOnce(),
  );

  const unread = state.items.filter((n) => n.read_at === null);
  const unreadCount = unread.length;

  // Phase 1251 — feed the edge presence so the glow + ambient cards
  // know about new notes without polling twice.
  const setPresenceSignals = usePresenceStore((s) => s.setSignals);
  useEffect(() => {
    setPresenceSignals({ unreadCount });
  }, [unreadCount, setPresenceSignals]);

  function openReply(notificationId: string): void {
    setState((s) => ({
      ...s,
      replies: {
        ...s.replies,
        [notificationId]: {
          text: "",
          sending: false,
          sentActionId: null,
          error: null,
        },
      },
    }));
  }

  function cancelReply(notificationId: string): void {
    setState((s) => {
      const next = { ...s.replies };
      delete next[notificationId];
      return { ...s, replies: next };
    });
  }

  function editReply(notificationId: string, text: string): void {
    setState((s) => {
      const existing = s.replies[notificationId];
      if (existing === undefined) return s;
      return {
        ...s,
        replies: {
          ...s.replies,
          [notificationId]: { ...existing, text, error: null },
        },
      };
    });
  }

  async function sendReply(notification: SafeNotificationView): Promise<void> {
    const reply = state.replies[notification.notification_id];
    if (reply === undefined) return;
    const text = reply.text.trim();
    if (text.length === 0) return;
    setState((s) => {
      const existing = s.replies[notification.notification_id];
      if (existing === undefined) return s;
      return {
        ...s,
        replies: {
          ...s.replies,
          [notification.notification_id]: {
            ...existing,
            sending: true,
            error: null,
          },
        },
      };
    });
    // Phase 1284 Wave 2 — when the governed sender identity is known (it now
    // is, on the recipient's inbox), the reply goes back to that sender via
    // the SAME human-authority internal-message path that delivered the
    // original — so David's reply reaches Sadeil directly (not the gated
    // Action reply route). Falls back to the legacy mediator only when the
    // sender entity is unavailable.
    const senderId = notification.sender?.entity_id;
    let ok: boolean;
    let sentMarker: string | null = null;
    let errCode: string | null = null;
    if (senderId !== undefined && senderId.length > 0) {
      const r = await api.workOs.internalMessage(senderId, text);
      ok = r.ok && r.data.status === "DELIVERED";
      sentMarker = r.ok ? (r.data.notification_id ?? "sent") : null;
      errCode = r.ok
        ? r.data.status === "DELIVERED"
          ? null
          : (r.data.reason ?? r.data.status)
        : r.code;
    } else {
      const result = await api.notifications.reply(
        notification.notification_id,
        text,
        randomIdempotencyKey(),
      );
      ok = result.ok;
      sentMarker = result.ok ? result.data.reply_action_id : null;
      errCode = result.ok ? null : result.code;
    }
    setState((s) => {
      const existing = s.replies[notification.notification_id];
      if (existing === undefined) return s;
      if (ok) {
        return {
          ...s,
          replies: {
            ...s.replies,
            [notification.notification_id]: {
              ...existing,
              sending: false,
              ...(sentMarker !== null ? { sentActionId: sentMarker } : {}),
            },
          },
        };
      }
      return {
        ...s,
        replies: {
          ...s.replies,
          [notification.notification_id]: {
            ...existing,
            sending: false,
            error: errCode ?? "REPLY_FAILED",
          },
        },
      };
    });
  }

  async function handleMarkRead(id: string): Promise<void> {
    // Optimistic UI: flip read_at immediately so the badge updates,
    // roll back on failure.
    const before = state.items;
    setState((s) => ({
      ...s,
      markError: null,
      items: s.items.map((n) =>
        n.notification_id === id
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      ),
    }));
    const result = await api.notifications.markRead(id);
    if (!result.ok) {
      // Honest developer proof — identify the REAL failure (route + code) in
      // dev without exposing internals to the user. The user-facing copy stays
      // simple; the list rolls back so we never falsely clear unread state.
      if (import.meta.env.DEV) {
        console.debug(
          `[NotificationBell] mark-read failed PUT /notifications/${id}/read →`,
          result.code,
          result.status,
        );
      }
      setState((s) => ({
        ...s,
        items: before,
        markError: humanizeMarkError(result.code),
      }));
      return;
    }
    // Reconcile with server truth so the unread count is correct after a
    // refresh/relaunch (not just the optimistic flip). Best-effort.
    void fetchOnce();
  }

  function toggle(): void {
    setState((s) => ({ ...s, open: !s.open }));
    // Refresh on open so the operator sees the freshest state.
    if (!state.open) void fetchOnce();
  }

  // Phase 1266 — clicking a notification routes to a REAL Work-OS
  // destination (Action Center focused on the action, Connector Rails,
  // Collaboration, …). Always resolves to a real route — never a dead
  // click, never a raw error. Marks read + closes the panel.
  function openNotification(n: SafeNotificationView): void {
    const route = notificationRoute({
      action_id: n.action_id,
      notification_class: n.notification_class,
      notification_id: n.notification_id,
    });
    setState((s) => ({ ...s, open: false }));
    if (n.read_at === null) void handleMarkRead(n.notification_id);
    navigate(route);
  }

  // Phase 1253 (Founder acceptance fix): the panel closes like every
  // calm overlay should — click anywhere outside, or press Escape.
  // Focus returns to the bell button on Escape so keyboard users
  // never lose their place.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bellButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!state.open) return;
    function onPointerDown(e: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setState((s) => ({ ...s, open: false }));
      }
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        setState((s) => ({ ...s, open: false }));
        bellButtonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [state.open]);

  return (
    <div className="relative" data-testid="notification-bell-root" ref={rootRef}>
      <button
        type="button"
        ref={bellButtonRef}
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
          className="absolute right-0 z-50 mt-2 w-96 max-w-[92vw] rounded-md border bg-popover p-2 shadow-lg"
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
          {state.markError !== null ? (
            <p
              className="mb-1 break-words rounded border border-amber-400/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400"
              role="alert"
              data-testid="notification-mark-error"
            >
              {state.markError}
            </p>
          ) : null}
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
                const reply = state.replies[n.notification_id];
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
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className="flex-1 cursor-pointer text-left"
                        data-testid="notification-open"
                        aria-label="Open notification"
                      >
                        {n.sender != null ? (
                          <p
                            className="text-[11px] font-medium text-foreground/80"
                            data-testid="notification-sender"
                          >
                            From: {entityLabel(n.sender.display_name)}
                            {n.sender.role_title != null ? ` · ${n.sender.role_title}` : ""}
                            {n.sender.source_kind !== "HUMAN"
                              ? ` · ${n.sender.authority_label}`
                              : ""}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-foreground">
                          {n.body_summary}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatRelative(n.created_at)} · tap to open
                        </p>
                      </button>
                      {/* Phase 1285-L — structured, consistent View/Why (sender,
                          type, route, ids) via the shared panel. */}
                      <button
                        type="button"
                        className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
                        data-testid="notification-why"
                        onClick={() =>
                          setWhyId((id) => (id === n.notification_id ? null : n.notification_id))
                        }
                      >
                        {whyId === n.notification_id ? "Hide" : "Why"}
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {reply === undefined ? (
                          <button
                            type="button"
                            onClick={() => openReply(n.notification_id)}
                            className="rounded p-1 hover:bg-accent"
                            aria-label="Reply"
                            data-testid="notification-reply-open"
                          >
                            <Reply className="h-3 w-3" aria-hidden />
                          </button>
                        ) : null}
                        <AIBreakdownButton
                          triggerTestId="notification-ai-breakdown"
                          breakdown={{
                            title: "Why this is in your notifications",
                            points: [
                              {
                                label: "What this is",
                                body:
                                  "An internal note from someone in your organization, surfaced by Otzar.",
                              },
                              {
                                label: "Why it's here",
                                body:
                                  "The sender approved a governed Otzar action that named you as the recipient. Your organization's policy auto-approved or routed it through dual-control before it landed.",
                              },
                              {
                                label: "What you can do",
                                body:
                                  "Reply inline (your message goes back to the original sender as a governed internal action), or mark as read.",
                              },
                              {
                                label: "What's protected",
                                body:
                                  "You see only notes your organization's policy allowed you to receive. The full audit trail records who sent, when, and why.",
                              },
                            ],
                          }}
                        />
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleMarkRead(n.notification_id);
                            }}
                            className="rounded p-1 hover:bg-accent"
                            aria-label="Mark as read"
                            data-testid="notification-mark-read"
                          >
                            <Check className="h-3 w-3" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {whyId === n.notification_id ? (
                      <div
                        className="mt-2 rounded border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground"
                        data-testid="notification-view-why"
                      >
                        <ViewWhyPanel model={viewWhyFromNotification(n, notificationRoute(n))} />
                      </div>
                    ) : null}
                    {reply !== undefined ? (
                      <div
                        className="mt-2 rounded border bg-background p-2"
                        data-testid="notification-reply-panel"
                      >
                        {reply.sentActionId !== null ? (
                          <p
                            className="text-emerald-700 dark:text-emerald-400"
                            data-testid="notification-reply-sent"
                            data-action-id={reply.sentActionId}
                          >
                            ✓ Reply sent. Otzar recorded this as a governed
                            internal action.
                          </p>
                        ) : (
                          <>
                            <textarea
                              value={reply.text}
                              onChange={(e) =>
                                editReply(n.notification_id, e.target.value)
                              }
                              placeholder="Type a quick reply… Otzar sends this back to the original sender as a governed internal note."
                              className="h-16 w-full rounded border bg-card p-1.5 text-xs"
                              data-testid="notification-reply-textarea"
                              disabled={reply.sending}
                            />
                            <div className="mt-1 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => cancelReply(n.notification_id)}
                                className="rounded px-2 py-1 text-[11px] hover:bg-accent"
                                disabled={reply.sending}
                                data-testid="notification-reply-cancel"
                              >
                                <X className="mr-1 inline h-3 w-3" aria-hidden />
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void sendReply(n)}
                                disabled={
                                  reply.sending || reply.text.trim().length === 0
                                }
                                className="rounded bg-emerald-600 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                                data-testid="notification-reply-send"
                              >
                                <Send className="mr-1 inline h-3 w-3" aria-hidden />
                                {reply.sending ? "Sending…" : "Send reply"}
                              </button>
                            </div>
                            {reply.error !== null ? (
                              <p
                                className="mt-1 text-rose-700 dark:text-rose-400"
                                role="alert"
                                data-testid="notification-reply-error"
                              >
                                {humanizeReplyError(reply.error)}
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
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

function humanizeMarkError(code: string): string {
  switch (code) {
    case "NETWORK_ERROR":
      return "Couldn't update just now — check your connection and try again.";
    case "SESSION_EXPIRED":
    case "SESSION_INVALID":
      return "Your session expired. Please sign in again.";
    case "NOTIFICATION_NOT_FOUND":
      return "That notification is no longer available.";
    default:
      return "Couldn't mark that as read. Try again in a moment.";
  }
}

function humanizeReplyError(code: string): string {
  switch (code) {
    case "DUAL_CONTROL_NO_APPROVER_AVAILABLE":
      return "Reply created, but your organization hasn't configured who can approve replies yet.";
    case "POLICY_BLOCKED":
    case "POLICY_FORBIDDEN":
      return "Reply blocked by your organization's policy.";
    case "SESSION_EXPIRED":
    case "SESSION_INVALID":
      return "Your session expired. Please sign in again.";
    default:
      return `Otzar couldn't send the reply. (Reference: ${code})`;
  }
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
