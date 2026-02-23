"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type TypingIndicatorProps = {
  conversationId: Id<"conversations">;
};

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });
  const currentUser = useQuery(api.users.getCurrentUser);

  // Only show when others are typing, not when you are typing
  const othersTyping = (typingUsers ?? []).filter(
    (u: { _id: Id<"users">; name: string }) => u._id !== currentUser?._id
  );

  if (!othersTyping.length) return null;

  const names = othersTyping.map((u: { name: string }) => u.name).join(", ");
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border/50 px-6 py-1.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-150">
      <span className="flex gap-0.5">
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:120ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:240ms]" />
      </span>
      <span className="text-xs text-muted-foreground">
        {names} {othersTyping.length === 1 ? "is" : "are"} typing
      </span>
    </div>
  );
}
