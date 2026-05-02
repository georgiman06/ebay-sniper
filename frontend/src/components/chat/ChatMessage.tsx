"use client";

import { classNames } from "@/lib/utils";
import type { Message } from "@/hooks/useChat";

const TOOL_LABELS: Record<string, string> = {
  list_parts: "Reading your tracked parts…",
  get_deals: "Checking live deals…",
  get_price_history: "Pulling price history…",
  get_quota_status: "Checking API quota…",
};

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={classNames(
        "flex w-full gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <span className="text-[9px] font-bold text-primary">S</span>
        </div>
      )}

      <div
        className={classNames(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-foreground text-background"
            : message.error
            ? "rounded-tl-sm border border-danger/30 bg-danger/10 text-danger"
            : "rounded-tl-sm border border-border bg-card text-foreground"
        )}
      >
        {/* Tool-use indicator */}
        {!isUser && message.toolUsed && (
          <p className="mb-1.5 text-[11px] text-muted-foreground italic">
            {TOOL_LABELS[message.toolUsed] ?? `Calling ${message.toolUsed}…`}
          </p>
        )}

        {/* Content */}
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : message.isStreaming && !message.toolUsed ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
        ) : null}

        {/* Streaming cursor */}
        {!isUser && message.isStreaming && message.content && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary align-middle" />
        )}
      </div>
    </div>
  );
}
