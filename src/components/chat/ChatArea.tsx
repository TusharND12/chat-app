"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type ReplyingTo = {
  messageId: Id<"messages">;
  content: string;
  senderName: string;
};
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Search, X } from "lucide-react";

type ChatAreaProps = {
  conversationId: Id<"conversations">;
  onBack?: () => void;
};

export function ChatArea({ conversationId }: ChatAreaProps) {
  const markAsRead = useMutation(api.conversationParticipants.markAsRead);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);

  const handleReply = useCallback((msg: { _id: Id<"messages">; content: string; senderName: string }) => {
    setReplyingTo({ messageId: msg._id, content: msg.content, senderName: msg.senderName });
  }, []);
  const handleCancelReply = useCallback(() => setReplyingTo(null), []);

  useEffect(() => setReplyingTo(null), [conversationId]);
  useEffect(() => { setShowSearch(false); setSearchQuery(""); }, [conversationId]);

  const searchResults = useQuery(
    api.messages.search,
    searchQuery.trim()
      ? { conversationId, query: searchQuery.trim(), limit: 20 }
      : "skip"
  );

  useEffect(() => {
    markAsRead({ conversationId });
  }, [conversationId, markAsRead]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Search bar */}
      {showSearch && (
        <div className="shrink-0 border-b border-border bg-background px-4 py-2 animate-in slide-in-from-top-1 duration-150">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full rounded-lg bg-muted py-2 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => { setShowSearch(false); setSearchQuery(""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-background"
            >
              <X className="size-4" />
            </button>
          </div>
          {searchQuery.trim() && (
            <p className="mt-1.5 px-1 text-xs text-muted-foreground">
              {searchResults === undefined
                ? "Searching..."
                : searchResults.length === 0
                  ? "No messages found"
                  : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>
      )}

      <MessageList
        conversationId={conversationId}
        searchQuery={searchQuery.trim() || undefined}
        searchResults={searchResults}
        onReply={handleReply}
        onToggleSearch={() => setShowSearch(!showSearch)}
      />
      <TypingIndicator conversationId={conversationId} />
      <MessageInput
        conversationId={conversationId}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
}
