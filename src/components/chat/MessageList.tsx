"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageContent } from "./MessageContent";
import { formatTimestamp, formatDayLabel, formatExactTimestamp } from "@/lib/formatTimestamp";
import { ChevronDown, Trash2, Pencil, Forward, CornerUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ForwardModal } from "./ForwardModal";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

type MessageListProps = {
  conversationId: Id<"conversations">;
  searchQuery?: string;
  searchResults?: { _id: Id<"messages">; content: string; senderName: string; senderId: Id<"users">; createdAt: number; editedAt?: number }[];
  onReply?: (msg: { _id: Id<"messages">; content: string; senderName: string }) => void;
  onToggleSearch?: () => void;
};

export function MessageList({
  conversationId,
  searchQuery,
  searchResults,
  onReply,
}: MessageListProps) {
  const data = useQuery(api.messages.list, { conversationId, limit: 50 });
  const conversation = useQuery(api.conversations.getConversation, { conversationId });
  const reactionsMap = useQuery(api.reactions.getByConversation, { conversationId }) ?? {};
  const messages = data?.messages ?? [];
  const isLoading = data === undefined;

  const viewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const userScrolledUpRef = useRef(false);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<Id<"messages"> | null>(null);
  const [forwardModal, setForwardModal] = useState<{
    messageId: Id<"messages">;
    messageContent: string;
  } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);

  const currentUser = useQuery(api.users.getCurrentUser);
  const markAsRead = useMutation(api.conversationParticipants.markAsRead);

  const lastMessageIdRef = useRef<Id<"messages"> | null>(null);

  const handleScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (nearBottom) {
      setShowNewMessagesButton(false);
      userScrolledUpRef.current = false;
      if (lastMessageIdRef.current) {
        markAsRead({ conversationId, lastReadMessageId: lastMessageIdRef.current });
      }
    } else {
      userScrolledUpRef.current = true;
    }
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [conversationId]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1] as { _id: Id<"messages">; senderId: Id<"users"> };
    lastMessageIdRef.current = lastMsg._id;
    markAsRead({ conversationId, lastReadMessageId: lastMsg._id });
  }, [messages, conversationId, markAsRead]);

  useEffect(() => {
    if (!messages) return;
    const prevLen = prevMessagesLengthRef.current;
    const newLen = messages.length;

    if (newLen > prevLen) {
      const lastMsg = messages[newLen - 1] as { _id: Id<"messages">; senderId: Id<"users"> };
      const isFromMe = lastMsg?.senderId === currentUser?._id;
      if (isFromMe) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        queueMicrotask(() => {
          setShowNewMessagesButton(false);
          userScrolledUpRef.current = false;
        });
      } else if (userScrolledUpRef.current) {
        queueMicrotask(() => setShowNewMessagesButton(true));
      } else {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevMessagesLengthRef.current = newLen;
  }, [messages, currentUser?._id]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessagesButton(false);
    userScrolledUpRef.current = false;
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className={cn("h-4", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const showSearchResults = searchQuery && searchResults && searchResults.length > 0;

  if (!messages || messages.length === 0) {
    if (!showSearchResults) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-accent p-6">
            <svg className="size-10 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Send a message to start the conversation
            </p>
          </div>
        </div>
      );
    }
  }

  // Group consecutive messages by same sender within 2 minutes
  function shouldGroupWithPrevious(
    current: (typeof messages)[0],
    previous: (typeof messages)[0] | undefined
  ): boolean {
    if (!previous) return false;
    if (current.senderId !== previous.senderId) return false;
    if (current.deleted || previous.deleted) return false;
    return current.createdAt - previous.createdAt < 2 * 60 * 1000;
  }

  function groupMessagesWithDaySeparators(
    msgs: typeof messages
  ): Array<{ type: "separator"; label: string } | { type: "message"; message: (typeof messages)[0]; isGrouped: boolean; isLastInGroup: boolean }> {
    const result: Array<{ type: "separator"; label: string } | { type: "message"; message: (typeof messages)[0]; isGrouped: boolean; isLastInGroup: boolean }> = [];
    let lastDay = "";
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const dayKey = new Date(m.createdAt).toDateString();
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        result.push({ type: "separator", label: formatDayLabel(m.createdAt) });
      }
      const isGrouped = shouldGroupWithPrevious(m, msgs[i - 1]);
      const nextMsg = msgs[i + 1];
      const isLastInGroup = !nextMsg || !shouldGroupWithPrevious(nextMsg, m) || new Date(nextMsg.createdAt).toDateString() !== dayKey;
      result.push({ type: "message", message: m, isGrouped, isLastInGroup });
    }
    return result;
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={viewportRef}
        className="h-full overflow-y-auto overflow-x-hidden"
      >
        <div className="flex flex-col px-4 py-4">
          {showSearchResults ? (
            <>
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Search results for &ldquo;{searchQuery}&rdquo;
              </p>
              {searchResults!.map((m) => (
                <MessageRow
                  key={m._id}
                  message={{
                    ...m,
                    senderImageUrl: undefined,
                    deleted: false,
                    readStatus: undefined,
                    editedAt: m.editedAt,
                  }}
                  isOwn={m.senderId === currentUser?._id}
                  isGroup={conversation?.isGroup ?? false}
                  reactions={reactionsMap?.[m._id] ?? []}
                  conversationId={conversationId}
                  isGrouped={false}
                  isLastInGroup={true}
                  isHovered={hoveredMessageId === m._id}
                  onMouseEnter={() => setHoveredMessageId(m._id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  isEditing={editingMessageId === m._id}
                  onCancelEdit={() => setEditingMessageId(null)}
                  onForward={() => setForwardModal({ messageId: m._id, messageContent: m.content })}
                  onEditRequest={() => setEditingMessageId(m._id)}
                  onReply={onReply ? () => onReply({ _id: m._id, content: m.content, senderName: m.senderName }) : undefined}
                />
              ))}
            </>
          ) : (
            groupMessagesWithDaySeparators(messages).map((item) =>
              item.type === "separator" ? (
                <div key={item.label} className="flex items-center gap-3 py-4">
                  <div className="flex-1 border-t border-border" />
                  <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {item.label}
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>
              ) : (
                <MessageRow
                  key={item.message._id}
                  message={item.message}
                  isOwn={item.message.senderId === currentUser?._id}
                  isGroup={conversation?.isGroup ?? false}
                  reactions={reactionsMap?.[item.message._id] ?? []}
                  conversationId={conversationId}
                  isGrouped={item.isGrouped}
                  isLastInGroup={item.isLastInGroup}
                  isHovered={hoveredMessageId === item.message._id}
                  onMouseEnter={() => setHoveredMessageId(item.message._id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  isEditing={editingMessageId === item.message._id}
                  onCancelEdit={() => setEditingMessageId(null)}
                  onForward={() => setForwardModal({ messageId: item.message._id, messageContent: item.message.content })}
                  onEditRequest={() => setEditingMessageId(item.message._id)}
                  onReply={onReply ? () => onReply({ _id: item.message._id, content: item.message.content, senderName: item.message.senderName }) : undefined}
                />
              )
            )
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {forwardModal && (
        <ForwardModal
          open
          onClose={() => setForwardModal(null)}
          messageId={forwardModal.messageId}
          messageContent={forwardModal.messageContent}
          currentConversationId={conversationId}
        />
      )}

      {showNewMessagesButton && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={scrollToBottom}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground google-shadow-2 transition-colors hover:bg-google-blue-hover"
          >
            <ChevronDown className="size-3.5" />
            New messages
          </button>
        </div>
      )}
    </div>
  );
}

function MessageRow({
  message,
  isOwn,
  isGroup,
  reactions,
  conversationId,
  isGrouped,
  isLastInGroup,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  isEditing,
  onCancelEdit,
  onForward,
  onEditRequest,
  onReply,
}: {
  message: {
    _id: Id<"messages">;
    content: string;
    senderName: string;
    senderImageUrl?: string;
    createdAt: number;
    deleted: boolean;
    senderId: Id<"users">;
    editedAt?: number;
    replyTo?: { content: string; senderName: string };
    readStatus?: { delivered: boolean; seen: boolean };
  };
  isOwn: boolean;
  isGroup: boolean;
  reactions: { emoji: string; count: number; hasReacted: boolean }[];
  conversationId: Id<"conversations">;
  isGrouped: boolean;
  isLastInGroup: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  onForward: () => void;
  onEditRequest: () => void;
  onReply?: () => void;
}) {
  const softDelete = useMutation(api.messages.softDelete);
  const editMessage = useMutation(api.messages.edit);
  const toggleReaction = useMutation(api.reactions.toggle);
  const [editText, setEditText] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!onReply || message.deleted) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 60) onReply();
  };

  useEffect(() => {
    if (isEditing) setEditText(message.content);
  }, [isEditing, message.content]);

  const handleSaveEdit = async () => {
    if (!isOwn || message.deleted || editText.trim() === message.content) {
      onCancelEdit();
      return;
    }
    setSaving(true);
    try {
      await editMessage({ messageId: message._id, content: editText.trim() });
      onCancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (message.deleted || !isOwn) return;
    await softDelete({ messageId: message._id });
  };

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-lg px-3 py-0.5 transition-colors duration-100",
        !isGrouped && "mt-3 pt-2",
        isHovered && "bg-muted/50"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Avatar */}
      <div className="w-8 shrink-0">
        {!isGrouped && (
          <Avatar className="size-8">
            <AvatarImage src={message.senderImageUrl} alt={message.senderName} />
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {message.senderName?.slice(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {!isGrouped && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className={cn(
              "text-sm font-medium",
              isOwn ? "text-google-blue" : "text-foreground"
            )}>
              {isOwn ? "You" : message.senderName}
            </span>
            <span className="text-xs text-muted-foreground" title={formatExactTimestamp(message.createdAt)}>
              {formatTimestamp(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className="text-xs italic text-muted-foreground">(edited)</span>
            )}
          </div>
        )}

        {message.replyTo && (
          <div className="mb-1 flex items-start gap-2 rounded-md border-l-2 border-primary/40 bg-muted/50 py-1 pl-2 pr-3">
            <CornerUpLeft className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{message.replyTo.senderName}</p>
              <p className="truncate text-xs text-muted-foreground">{message.replyTo.content}</p>
            </div>
          </div>
        )}

        {isEditing && isOwn && !message.deleted ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving || editText.trim() === message.content}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed">
            <MessageContent content={message.content} deleted={message.deleted} />
          </div>
        )}

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => {
                  if (message.deleted) return;
                  toggleReaction({ messageId: message._id, emoji: r.emoji });
                }}
                disabled={message.deleted}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  r.hasReacted
                    ? "border-primary/30 bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {isOwn && isLastInGroup && message.readStatus && !message.deleted && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span className={message.readStatus.seen ? "text-google-blue" : ""}>
              {message.readStatus.seen ? "Seen" : "Delivered"}
            </span>
          </div>
        )}
      </div>

      {/* Hover action bar */}
      {isHovered && !message.deleted && !isEditing && (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-0.5 google-shadow-1 animate-in fade-in-0 zoom-in-95 duration-100">
          {REACTION_EMOJIS.slice(0, 4).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleReaction({ messageId: message._id, emoji })}
              className="flex size-7 items-center justify-center rounded-md text-base transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
          <div className="mx-0.5 h-5 w-px bg-border" />
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Reply"
            >
              <CornerUpLeft className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onForward}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Forward"
          >
            <Forward className="size-3.5" />
          </button>
          {isOwn && (
            <>
              <button
                type="button"
                onClick={onEditRequest}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Edit"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
