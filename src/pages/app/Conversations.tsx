// FILE: Conversations.tsx
// PURPOSE: Employee "Conversation sessions" surface -- the caller's own
//          ambient console session METADATA from GET /otzar/conversations
//          (self-scoped, read-only). This is a metadata continuity layer
//          ONLY: it never renders transcripts, message bodies,
//          conversation_history, raw ids, or memory/capsule/vector data.
//          Transcript retrieval is a future, governed capability.
// CONNECTS TO: api.otzar.conversations.list, conversation label helpers.
//
// Pagination: a growing window (take = PAGE_SIZE * pages, skip = 0) keeps
// the query pure and avoids accumulator/closure bugs; "Load more" bumps
// `pages` and the backend's has_more drives the button. The query fn
// returns the ApiResult as-is so the page can branch on ok/status.

import { useState } from "react";
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
  const items = res && res.ok ? res.data.items : [];
  const hasMore = res && res.ok ? res.data.has_more : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversation sessions"
        description="Your ambient console sessions with Otzar — session metadata for continuity."
      />

      {/* Persistent transcript-governance boundary. */}
      <div
        className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
        role="note"
        data-testid="transcript-notice"
      >
        This page shows session metadata only. Transcript retrieval is not
        active yet — full transcript access requires enterprise transcript
        governance and scoped access rules.
      </div>

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

      {query.isLoading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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

      {res && res.ok && items.length === 0 && (
        <Card>
          <CardContent
            className="space-y-3 py-6 text-sm text-muted-foreground"
            data-testid="conversations-empty"
          >
            <p className="font-medium text-foreground">
              No conversation sessions yet.
            </p>
            <p>
              Session metadata appears here when you start or continue work with
              your AI teammate — one row per session, for continuity.
            </p>
            <div className="flex flex-wrap gap-2 pt-1" data-testid="conversations-empty-actions">
              <Button asChild size="sm" variant="default">
                <Link to="/app/chat">Talk with your AI teammate</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/my-twin">Ask your Twin</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/comms">Open Comms</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {res && res.ok && items.length > 0 && (
        <ul className="space-y-2" data-testid="conversations-list">
          {items.map((c) => (
            <li key={c.conversation_id}>
              <button
                type="button"
                onClick={() => setSelectedConversationId(c.conversation_id)}
                className="flex w-full items-start justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {labelConversationSource(c.source_type)}
                    </span>
                    <Badge
                      variant={c.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {labelConversationStatus(c.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.message_count} message
                    {c.message_count === 1 ? "" : "s"} · started{" "}
                    {formatRelativeTime(c.started_at)}
                    {c.closed_at
                      ? ` · closed ${formatRelativeTime(c.closed_at)}`
                      : ""}
                  </p>
                </div>
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
