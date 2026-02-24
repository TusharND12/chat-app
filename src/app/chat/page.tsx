"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { UserButton } from "@clerk/nextjs";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { GroupInfo } from "@/components/chat/GroupInfo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationRegistration } from "@/components/chat/NotificationRegistration";
import { subscribeToForegroundMessages } from "@/lib/firebase";
import { Menu, ArrowLeft } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatTimestamp";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<"conversations"> | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSidebar, closeSidebar]);

  // Ask for notification permission once on first load (shows browser Allow/Block popup)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Fire and forget; actual token registration happens in NotificationRegistration
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Foreground FCM: show notification when tab is open and a push is received
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    subscribeToForegroundMessages().then((unsub) => {
      cleanup = unsub;
    });
    return () => cleanup?.();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 md:hidden transition-opacity duration-200",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 border-r border-border bg-sidebar transition-transform duration-200 ease-out md:relative md:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <Sidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onCloseSidebar={closeSidebar}
        />
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Chat header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
          {/* Mobile menu button */}
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted md:hidden"
            onClick={openSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>

          {selectedConversationId ? (
            <>
              {/* Mobile back button */}
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted md:hidden"
                onClick={() => setSelectedConversationId(null)}
                aria-label="Back to list"
              >
                <ArrowLeft className="size-5" />
              </button>
              <ChatHeader
                conversationId={selectedConversationId}
                onLeaveGroup={() => setSelectedConversationId(null)}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center gap-3 px-2">
              <div className="flex size-9 items-center justify-center">
                <svg className="size-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
              </div>
              <span className="text-sm text-muted-foreground">
                Select a chat to start messaging
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1">
            <NotificationRegistration />
            <ThemeToggle className="shrink-0" />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Chat content */}
        <div className="relative flex-1 overflow-hidden">
          {selectedConversationId ? (
            <ChatArea
              conversationId={selectedConversationId}
              onBack={() => setSelectedConversationId(null)}
            />
          ) : (
            <EmptyChatState onStartChat={openSidebar} />
          )}
        </div>
      </main>
    </div>
  );
}

function ChatHeader({
  conversationId,
  onLeaveGroup,
}: {
  conversationId: Id<"conversations">;
  onLeaveGroup?: () => void;
}) {
  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });
  const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const presenceMap = useQuery(api.presence.getPresenceMap) ?? {};

  if (!conversation) return null;

  const othersTyping = (typingUsers ?? []).filter(
    (u: { _id: Id<"users"> }) => u._id !== currentUser?._id
  );
  const otherUserId = conversation.otherUser?._id as string | undefined;
  const presence = otherUserId ? presenceMap[otherUserId] : undefined;

  const statusText = othersTyping.length > 0
    ? `${othersTyping.map((u: { name: string }) => u.name).join(", ")} typing...`
    : conversation.isGroup
      ? `${conversation.memberCount} members`
      : presence?.online
        ? "Active now"
        : presence?.lastSeenAt
          ? `Last seen ${formatRelativeTime(presence.lastSeenAt)}`
          : "";

  return (
    <div className="flex flex-1 items-center gap-3 min-w-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-sm font-medium text-foreground">
            {conversation.name}
          </h2>
          {!conversation.isGroup && presence?.online && (
            <span className="size-2 rounded-full bg-google-green" />
          )}
        </div>
        {statusText && (
          <p className={cn(
            "truncate text-xs",
            othersTyping.length > 0 ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {statusText}
          </p>
        )}
      </div>

      {conversation.isGroup && (
        <GroupInfo
          conversationId={conversationId}
          conversationName={conversation.name ?? "Group"}
          onLeaveSuccess={onLeaveGroup}
        />
      )}
    </div>
  );
}

function EmptyChatState({ onStartChat }: { onStartChat: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      {/* Google Chat-style illustration */}
      <div className="rounded-full bg-accent p-8">
        <svg className="size-16 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          <path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z" opacity="0.3"/>
        </svg>
      </div>
      <div className="max-w-sm space-y-2">
        <h2 className="text-xl font-normal text-foreground">
          Welcome to Chats
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Send messages, share files, and collaborate with people. Select a conversation from the sidebar or start a new one.
        </p>
      </div>
      <button
        type="button"
        onClick={onStartChat}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-google-blue-hover md:hidden"
      >
        Start a chat
      </button>
    </div>
  );
}
