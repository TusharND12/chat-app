"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, formatShortTime } from "@/lib/formatTimestamp";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateGroupModal } from "./CreateGroupModal";
import { Skeleton } from "@/components/ui/skeleton";

type SidebarProps = {
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
  onCloseSidebar?: () => void;
};

export function Sidebar({
  selectedConversationId,
  onSelectConversation,
  onCloseSidebar,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const conversations = useQuery(api.conversations.getConversations);
  const users = useQuery(api.users.getAllExceptCurrent);
  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateConversation
  );
  const onlineUserIds = useQuery(api.presence.getOnlineUserIds) ?? [];
  const presenceMap = useQuery(api.presence.getPresenceMap) ?? {};

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: { name: string }) => u.name.toLowerCase().includes(q));
  }, [users, search]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c: { name: string }) =>
      c.name.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const handleSelectUser = async (userId: Id<"users">) => {
    try {
      const conversationId = await getOrCreateConversation({ otherUserId: userId });
      onSelectConversation(conversationId);
      onCloseSidebar?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectConversation = (conversationId: Id<"conversations">) => {
    onSelectConversation(conversationId);
    onCloseSidebar?.();
  };

  const handleGroupCreated = (conversationId: Id<"conversations">) => {
    onSelectConversation(conversationId);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-medium text-sidebar-foreground">Google Chat</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>
        </div>
      </div>

      {/* Search bar - slides in */}
      {showSearch && (
        <div className="px-3 pb-2 animate-in slide-in-from-top-2 duration-150">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people and conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full rounded-lg bg-muted py-2.5 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setShowSearch(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-background"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* New chat / group button */}
      <div className="px-3 pb-2">
        <CreateGroupModal
          users={users ?? []}
          onCreated={handleGroupCreated}
          onCloseSidebar={onCloseSidebar}
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-2 py-1">
          {conversations === undefined && (
            <div className="space-y-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredConversations.length > 0 && (
            <div className="space-y-0.5">
              {filteredConversations.map((c) => (
                <ConversationItem
                  key={c.conversationId}
                  name={c.name}
                  isGroup={c.isGroup}
                  memberCount={c.memberCount ?? 0}
                  otherUser={c.otherUser}
                  lastMessage={c.lastMessage}
                  unreadCount={c.unreadCount}
                  isSelected={selectedConversationId === c.conversationId}
                  onClick={() => handleSelectConversation(c.conversationId)}
                  isOnline={!c.isGroup && onlineUserIds.includes(c.otherUser._id as Id<"users">)}
                  lastSeenAt={
                    !c.isGroup ? presenceMap[c.otherUser._id as string]?.lastSeenAt : undefined
                  }
                />
              ))}
            </div>
          )}

          {/* All users section */}
          {(search || (conversations && conversations.length === 0)) && (
            <>
              <p className="mb-1 mt-4 px-3 text-xs font-medium text-muted-foreground">
                {search ? "People" : "Start a conversation"}
              </p>
              {filteredUsers.length === 0 ? (
                <div className="rounded-lg py-8 text-center text-sm text-muted-foreground">
                  {search ? "No people found" : "No other users yet"}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredUsers.map((u: { _id: Id<"users">; name: string; imageUrl?: string }) => (
                    <UserItem
                      key={u._id}
                      user={u}
                      isOnline={onlineUserIds.includes(u._id)}
                      lastSeenAt={presenceMap[u._id]?.lastSeenAt}
                      onClick={() => handleSelectUser(u._id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!search && conversations && conversations.length > 0 && (
            <>
              <p className="mb-1 mt-4 px-3 text-xs font-medium text-muted-foreground">
                All people
              </p>
              <div className="space-y-0.5">
                {(users ?? []).map((u: { _id: Id<"users">; name: string; imageUrl?: string }) => (
                  <UserItem
                    key={u._id}
                    user={u}
                    isOnline={onlineUserIds.includes(u._id)}
                    lastSeenAt={presenceMap[u._id]?.lastSeenAt}
                    onClick={() => handleSelectUser(u._id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationItem({
  name,
  isGroup,
  memberCount,
  otherUser,
  lastMessage,
  unreadCount,
  isSelected,
  onClick,
  isOnline,
}: {
  name: string;
  isGroup?: boolean;
  memberCount: number;
  otherUser: { _id: Id<"users"> | string; name: string; imageUrl?: string };
  lastMessage: { content: string; createdAt: number } | null;
  unreadCount: number;
  isSelected: boolean;
  onClick: () => void;
  isOnline: boolean;
  lastSeenAt?: number;
}) {
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100",
        isSelected
          ? "bg-accent"
          : "hover:bg-muted/80"
      )}
    >
      <div className="relative shrink-0">
        {isGroup ? (
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        ) : (
          <Avatar className="size-10">
            <AvatarImage src={otherUser.imageUrl} alt={name} />
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {(name ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        {isOnline && !isGroup && (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar bg-google-green" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "truncate text-sm",
            hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
          )}>
            {name ?? "Chat"}
            {isGroup && memberCount > 0 && (
              <span className="text-muted-foreground font-normal"> ({memberCount})</span>
            )}
          </span>
          {lastMessage && (
            <span className={cn(
              "shrink-0 text-xs",
              hasUnread ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {formatShortTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "min-w-0 flex-1 truncate text-xs leading-relaxed",
            hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {lastMessage?.content ?? "No messages yet"}
          </span>
          {hasUnread && (
            <Badge className="h-5 min-w-5 shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function UserItem({
  user,
  isOnline,
  lastSeenAt,
  onClick,
}: {
  user: { _id: Id<"users">; name: string; imageUrl?: string };
  isOnline: boolean;
  lastSeenAt?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 hover:bg-muted/80"
    >
      <div className="relative shrink-0">
        <Avatar className="size-10">
          <AvatarImage src={user.imageUrl} alt={user.name} />
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
            {user.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar bg-google-green" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {isOnline ? "Active now" : lastSeenAt ? `Last seen ${formatRelativeTime(lastSeenAt)}` : "Offline"}
        </span>
      </div>
    </button>
  );
}
