"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Info, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type GroupInfoProps = {
  conversationId: Id<"conversations">;
  conversationName: string;
  onLeaveSuccess?: () => void;
  triggerClassName?: string;
};

export function GroupInfo({
  conversationId,
  conversationName,
  onLeaveSuccess,
  triggerClassName,
}: GroupInfoProps) {
  const [open, setOpen] = useState(false);
  const members = useQuery(
    api.conversations.getGroupMembers,
    open ? { conversationId } : "skip"
  );
  const leaveGroup = useMutation(api.conversations.leaveGroup);
  const currentUser = useQuery(api.users.getCurrentUser);

  const handleLeave = async () => {
    try {
      await leaveGroup({ conversationId });
      onLeaveSuccess?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", triggerClassName)}
          aria-label="Group info"
        >
          <Info className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-base font-medium">{conversationName}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border p-1">
          <div className="flex flex-col">
            {members?.map((m) => (
              <div
                key={m._id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={m.imageUrl} alt={m.name} />
                  <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                    {m.name?.slice(0, 2).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium">{m.name}</span>
                {m._id === currentUser?._id && (
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">You</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            onClick={handleLeave}
          >
            <LogOut className="size-4" />
            Leave group
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
