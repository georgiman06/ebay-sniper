"use client";

import { useState, useCallback, useRef } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  toolUsed?: string | null;
  error?: boolean;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}-${Date.now()}`;

export function useChat(pageContext?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading) return;

      const userMsg: Message = {
        id: newId(),
        role: "user",
        content: userText.trim(),
      };

      const assistantId = newId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
        toolUsed: null,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      // Build the history the backend expects — only role+content, no UI fields
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userText.trim() },
      ];

      abortRef.current = new AbortController();

      try {
        const res = await fetch(`${BASE}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
          },
          body: JSON.stringify({
            messages: history,
            page_context: pageContext ?? null,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE lines come in "data: {...}\n\n" chunks
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const event = JSON.parse(raw);

              if (event.type === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.delta, toolUsed: null }
                      : m
                  )
                );
              } else if (event.type === "tool_use") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, toolUsed: event.name } : m
                  )
                );
              } else if (event.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, isStreaming: false, toolUsed: null }
                      : m
                  )
                );
              } else if (event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: event.message ?? "Something went wrong.",
                          isStreaming: false,
                          error: true,
                        }
                      : m
                  )
                );
              }
            } catch {
              // malformed SSE line — skip
            }
          }
        }
      } catch (e: unknown) {
        if ((e as Error)?.name === "AbortError") return;
        const msg = (e as Error)?.message ?? "Connection error.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: msg, isStreaming: false, error: true }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      }
    },
    [messages, isLoading, pageContext]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, cancelStream };
}
