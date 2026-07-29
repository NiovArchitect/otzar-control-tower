// FILE: Conversations.tsx
// PURPOSE: Slice 4 — Conversation history: real sessions with titles,
//          summaries, search. Never hardware roadmap or device readiness.
// CONNECTS TO: api.otzar.conversations, ConversationDetailDrawer,
//              conversation-history-view.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationDetailDrawer } from "@/components/employee/ConversationDetailDrawer";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  labelConversationSource,
  labelConversationStatus,
} from "@/lib/labels/conversation";
import type {
  ConversationListParams,
  ConversationStatus,
} from "@/lib/types/foundation";
import {
  conversationCardSummary,
  conversationCardTitle,
  filterConversations,
  type ConversationListRow,
} from "@/lib/work-os/conversation-history-view";

const PAGE_SIZE = 25;
type Filter = "ALL" | ConversationStatus;

const FILTERS: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "CLOSED", label: "Closed" },
];

export function Conversations() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const query = useQuery({
    queryKey: ["otzar", "conversations", filter, pages],
    queryFn: () => {
      const params: ConversationListParams = {
        skip: 0,
        take: PAGE_SIZE * pages,
        ...(filter !== "ALL" ? { status: filter } : {}),
      };
      return api.otzar.conversations.list(params);
    },
  });

  function changeFilter(next: Filter): void {
    setPages(1);
    setFilter(next);
  }

  const res = query.data;
  const rawItems: ConversationListRow[] =
    res && res.ok
      ? (res.data.items as ConversationListRow[])
      : [];
  const items = useMemo(
    () => filterConversations(rawItems, search),
    [rawItems, search],
  );
  const hasMore = res && res.ok ? res.data.has_more : false;

  return (
    <div
      className="space-y-6"
      data-testid="conversations-page"
      data-slice4-history="true"
    >
      <PageHeader
        title="Conversation history"
        description="Review what you discussed with Otzar and how it connected to your work."
      />

      <div
        className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        role="note"
        data-testid="transcript-notice"
      >
        Session history with concise summaries when available. Full message
        transcripts are not shown by default.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter sessions">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              type="button"
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => changeFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <label className="flex min-w-[12rem] flex-1 max-w-md flex-col gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Team status, Ava, corrections…"
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            data-testid="conversations-search"
          />
        </label>
      </div>

      {query.isLoading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {res && !res.ok && !query.isLoading && (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm">
            <p className="text-destructive">
              {res.code === "INVALID_STATUS"
                ? "That filter isn't available."
                : res.message || "Couldn't load your sessions."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {res && res.ok && rawItems.length === 0 && (
        <Card>
          <CardContent
            className="space-y-3 py-6 text-sm text-muted-foreground"
            data-testid="conversations-empty"
          >
            <p className="font-medium text-foreground">No conversations yet.</p>
            <p>
              Sessions appear here after you talk with Otzar, with a short
              summary when the conversation closes or goes idle.
            </p>
            <div
              className="flex flex-wrap gap-2 pt-1"
              data-testid="conversations-empty-actions"
            >
              <Button asChild size="sm" variant="default">
                <Link to="/app/chat">Talk with your AI teammate</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/my-twin">Ask your AI Teammate</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/comms">Open Comms</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {res && res.ok && rawItems.length > 0 && items.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="conversations-search-empty">
          No conversations match that search.
        </p>
      )}

      {res && res.ok && items.length > 0 && (
        <ul className="space-y-2" data-testid="conversations-list">
          {items.map((c) => (
            <li key={c.conversation_id}>
              <button
                type="button"
                onClick={() => setSelectedConversationId(c.conversation_id)}
                className="flex w-full flex-col gap-2 rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="conversation-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p
                    className="font-medium text-foreground"
                    data-testid="conversation-card-title"
                  >
                    {conversationCardTitle(c)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={c.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {labelConversationStatus(c.status)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {labelConversationSource(c.source_type)}
                    </span>
                  </div>
                </div>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="conversation-card-summary"
                >
                  {conversationCardSummary(c)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {c.message_count} message
                  {c.message_count === 1 ? "" : "s"} · started{" "}
                  {formatRelativeTime(c.started_at)}
                  {c.closed_at
                    ? ` · closed ${formatRelativeTime(c.closed_at)}`
                    : ""}
                  {c.summary_available ? " · Summary available" : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {res && res.ok && hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPages((p) => p + 1)}
          disabled={query.isFetching}
        >
          {query.isFetching ? "Loading…" : "Load more"}
        </Button>
      )}

      <ConversationDetailDrawer
        conversationId={selectedConversationId}
        open={selectedConversationId !== null}
        onOpenChange={(next) => {
          if (!next) setSelectedConversationId(null);
        }}
      />
    </div>
  );
}
