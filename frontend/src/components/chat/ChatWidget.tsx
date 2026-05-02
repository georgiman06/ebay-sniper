"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { classNames } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "What parts am I currently tracking?",
  "What are my best deals right now?",
  "How is my max buy price calculated?",
  "Why might a listing not show as a deal?",
];

interface ChatWidgetProps {
  pageContext?: string;
}

export function ChatWidget({ pageContext }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useChat(pageContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when widget opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <span className="text-[11px] font-bold text-primary">S</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">
                  SNIPER Assistant
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Powered by Claude
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  title="Clear conversation"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
          >
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
                  <span className="text-xl font-bold text-primary">S</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    SNIPER Assistant
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ask me about your deals, margins, or how the app works.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-1.5">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInput(prompt);
                        inputRef.current?.focus();
                      }}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground hover:border-border-highlight hover:text-foreground transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div
              className={classNames(
                "flex items-end gap-2 rounded-xl border bg-card px-3 py-2 transition-colors",
                isLoading
                  ? "border-border opacity-60"
                  : "border-border focus-within:border-border-highlight"
              )}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your data…"
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
                style={{ maxHeight: "96px" }}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className={classNames(
                  "mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                  input.trim() && !isLoading
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                <SendIcon className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Has access to your live data
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open SNIPER Assistant"}
        className={classNames(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
          open
            ? "border border-border bg-secondary text-muted-foreground hover:text-foreground"
            : "bg-foreground text-background hover:bg-foreground/90"
        )}
      >
        {open ? (
          <CloseIcon className="h-5 w-5" />
        ) : (
          <ChatIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
