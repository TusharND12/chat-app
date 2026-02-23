"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";

type CreateGroupModalProps = {
  users: { _id: Id<"users">; name: string; imageUrl?: string }[];
  onCreated: (conversationId: Id<"conversations">) => void;
  onCloseSidebar?: () => void;
};

export function CreateGroupModal({
  users,
  onCreated,
  onCloseSidebar,
}: CreateGroupModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<Id<"users">>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const createGroup = useMutation(api.conversations.createGroup);

  const toggleUser = (userId: Id<"users">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Group name is required");
      return;
    }
    if (selectedIds.size < 1) {
      setError("Select at least 1 member");
      return;
    }
    try {
      const conversationId = await createGroup({
        name: trimmed,
        memberIds: Array.from(selectedIds),
      });
      setOpen(false);
      setName("");
      setSelectedIds(new Set());
      onCreated(conversationId);
      onCloseSidebar?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-4 text-primary" />
          </div>
          New group
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Create a group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Group name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="mt-1 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Add members {selectedIds.size > 0 && `(${selectedIds.size} selected)`}
            </label>
            <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">
              {users.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No other users yet</p>
              ) : (
                users.map((u) => (
                  <label
                    key={u._id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedIds.has(u._id)}
                      onCheckedChange={() => toggleUser(u._id)}
                    />
                    <span className="text-sm">{u.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-google-blue-hover"
          >
            Create group
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
