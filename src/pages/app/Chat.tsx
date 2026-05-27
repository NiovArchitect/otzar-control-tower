// FILE: Chat.tsx
// PURPOSE: The employee conversation surface. Sends turns to the real
//          POST /otzar/conversation/message and renders the assistant
//          response. Conversation history is HELD IN COMPONENT STATE
//          for Phase 1 -- there is no durable conversation-list route
//          yet, and the UI says so plainly. Close summarizes the
//          conversation to memory via POST /otzar/conversation/close.
// CONNECTS TO: api.otzar.conversation.{message,close}.
//
// HONESTY GUARDRAILS:
//   - Renders only the assistant's text reply + transparency counters
//     (context_used, tokens_consumed). Never claims a task was done or
//     that Otzar acted in an external tool.
//   - No audit link (these endpoints return no audit_event_id).

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { TransparencyPanel } from "@/components/employee/TransparencyPanel";
import type {
  ChatTransparency,
  ContextProvenanceItem,
  ConversationMessageRequest,
} from "@/lib/types/foundation";

interface ChatTurn {
  role: "you" | "teammate";
  text: string;
}

interface CloseSummary {
  topics: string[];
}

function errorCopy(code: string, status: number, message: string): string {
  if (status === 503 || code === "LLM_UNAVAILABLE") {
    return "Otzar is temporarily unavailable (the language model didn't respond). Please try again.";
  }
  if (status === 413 || code === "TOKEN_BUDGET_EXCEEDED") {
    return "That message is too large for the current context budget. Try a shorter message.";
  }
  if (status === 403 || code === "OPERATION_NOT_PERMITTED") {
    return "You don't have permission to use this conversation.";
  }
  return message || "Something went wrong. Please try again.";
}

export function Chat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    context_used: number;
    tokens_consumed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeSummary, setCloseSummary] = useState<CloseSummary | null>(null);
  const [transparency, setTransparency] = useState<ChatTransparency | null>(
    null,
  );
  const [provenance, setProvenance] = useState<ContextProvenanceItem[]>([]);

  async function send(): Promise<void> {
    const message = input.trim();
    if (message.length === 0 || sending) return;
    setError(null);
    setCloseSummary(null);
    setSending(true);
    const history = turns.map((t) => t.text);
    setTurns((prev) => [...prev, { role: "you", text: message }]);
    setInput("");

    const body: ConversationMessageRequest = {
      message,
      conversation_history: history,
      ...(conversationId !== null ? { conversation_id: conversationId } : {}),
    };
    const result = await api.otzar.conversation.message(body);
    setSending(false);

    if (!result.ok) {
      setError(errorCopy(result.code, result.status, result.message));
      return;
    }
    setConversationId(result.data.conversation_id);
    setMeta({
      context_used: result.data.context_used,
      tokens_consumed: result.data.tokens_consumed,
    });
    setTransparency(result.data.transparency ?? null);
    setProvenance(result.data.context_provenance ?? []);
    setTurns((prev) => [...prev, { role: "teammate", text: result.data.response }]);
  }

  async function close(): Promise<void> {
    if (conversationId === null || closing) return;
    setError(null);
    setClosing(true);
    const result = await api.otzar.conversation.close({
      conversation_id: conversationId,
      conversation_history: turns.map((t) => t.text),
    });
    setClosing(false);
    if (!result.ok) {
      setError(errorCopy(result.code, result.status, result.message));
      return;
    }
    setCloseSummary({ topics: result.data.topics });
    // Start fresh: a new message begins a new conversation.
    setConversationId(null);
    setMeta(null);
    setTransparency(null);
    setProvenance([]);
    setTurns([]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat"
        description="A live conversation with your AI teammate. History is kept for this session only — Otzar does not yet provide a saved conversation list."
        actions={
          conversationId !== null ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void close()}
              disabled={closing}
            >
              {closing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Closing…
                </>
              ) : (
                "Close conversation"
              )}
            </Button>
          ) : undefined
        }
      />

      {closeSummary && (
        <Card>
          <CardContent className="space-y-1 py-4 text-sm" data-testid="close-summary">
            <p className="font-medium">Conversation saved.</p>
            <p className="text-muted-foreground">
              Otzar saved a knowledge item summarizing this conversation for
              your organization's memory.
            </p>
            <p className="text-muted-foreground">
              Topics: {closeSummary.topics.join(", ") || "—"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3" data-testid="chat-transcript">
        {turns.length === 0 && closeSummary === null && (
          <p className="text-sm text-muted-foreground">
            Start the conversation below. Otzar answers from your
            organization's governed memory.
          </p>
        )}
        {turns.map((turn, i) => (
          <div
            key={i}
            data-role={turn.role}
            className={
              turn.role === "you"
                ? "rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                : "rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
            }
          >
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {turn.role === "you" ? "You" : "Your AI teammate"}
            </span>
            {turn.text}
          </div>
        ))}
      </div>

      {meta && (
        <p className="text-xs text-muted-foreground" data-testid="chat-meta">
          Context items used: {meta.context_used} · tokens: {meta.tokens_consumed}
          {conversationId ? ` · conversation ${conversationId}` : ""}
        </p>
      )}

      {meta && (
        <TransparencyPanel transparency={transparency} provenance={provenance} />
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI teammate…"
          aria-label="Message"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || input.trim().length === 0}>
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Send
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
