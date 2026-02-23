"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Send, Smile, X, RotateCcw } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

type MessageInputProps = {
  conversationId: Id<"conversations">;
  replyingTo?: { messageId: Id<"messages">; content: string; senderName: string } | null;
  onCancelReply?: () => void;
};

export function MessageInput({ conversationId, replyingTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const sendMessage = useMutation(api.messages.send);
  const setTyping = useMutation(api.typing.setTyping);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId, replyingTo]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [content]);

  const clearTyping = useCallback(() => {
    setTyping({ conversationId, isTyping: false });
  }, [conversationId, setTyping]);

  const scheduleClearTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(clearTyping, 2000);
  }, [clearTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setError(null);
    setTyping({ conversationId, isTyping: true });
    scheduleClearTyping();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = content.trim();
    if (!text) return;

    setContent("");
    setError(null);
    setShowEmoji(false);
    clearTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      await sendMessage({
        conversationId,
        content: text,
        ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
      });
      onCancelReply?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setContent(text);
    }
  };

  const handleRetry = async () => {
    const text = content.trim();
    if (!text) return;
    setContent("");
    setError(null);
    try {
      await sendMessage({
        conversationId,
        content: text,
        ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setContent(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + emoji.length;
        el.focus();
      });
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-background">
      {error && (
        <div className="flex items-center justify-between gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <span>Couldn&apos;t send message. Check your connection.</span>
          <button
            type="button"
            onClick={handleRetry}
            className="flex shrink-0 items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-destructive/10"
          >
            <RotateCcw className="size-3" />
            Retry
          </button>
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <div className="h-8 w-0.5 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary">Replying to {replyingTo.senderName}</p>
            <p className="truncate text-xs text-muted-foreground">{replyingTo.content}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Cancel reply"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="relative px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-3 py-2 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Emoji"
            >
              <Smile className="size-5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-12 left-0 z-50">
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmoji(false)}
                />
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!content.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10 disabled:text-muted-foreground disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="size-5" />
          </button>
        </div>
        <p className="mt-1 px-1 text-[10px] text-muted-foreground/60">
          *bold* _italic_ `code` ~strike~ · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
