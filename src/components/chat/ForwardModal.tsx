"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ForwardModalProps = {
  open: boolean;
  onClose: () => void;
  messageId: Id<"messages">;
  messageContent: string;
  currentConversationId: Id<"conversations">;
  onForwarded?: () => void;
};

export function ForwardModal({
  open,
  onClose,
  messageId,
  messageContent,
  currentConversationId,
  onForwarded,
}: ForwardModalProps) {
  const conversations = useQuery(api.conversations.getConversations);
  const forwardMessage = useMutation(api.messages.forward);

  const targetConversations =
    conversations?.filter(
      (c: { conversationId: Id<"conversations"> }) =>
        c.conversationId !== currentConversationId
    ) ?? [];

  const handleSelect = async (targetId: Id<"conversations">) => {
    try {
      await forwardMessage({
        messageId,
        targetConversationId: targetId,
      });
      onForwarded?.();
      onClose();
    } catch (e) {
      console.error("Forward failed:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-xl border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Forward message</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            &ldquo;{messageContent}&rdquo;
          </p>
        </div>
        <ScrollArea className="max-h-64">
          <div className="space-y-0.5">
            {targetConversations.map(
              (c: {
                conversationId: Id<"conversations">;
                name: string;
                otherUser: { imageUrl?: string };
              }) => (
                <button
                  key={c.conversationId}
                  type="button"
                  onClick={() => handleSelect(c.conversationId)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={c.otherUser?.imageUrl} />
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {c.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{c.name}</span>
                </button>
              )
            )}
          </div>
        </ScrollArea>
        {targetConversations.length === 0 && (
          <p className="rounded-lg bg-muted/30 py-8 text-center text-sm text-muted-foreground">
            No other conversations to forward to
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
