import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Mark conversation as read (clear unread count). Optionally set lastReadMessageId for read receipts.
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    lastReadMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    const p = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", me._id).eq("conversationId", args.conversationId)
      )
      .unique();

    if (p) {
      const updates: { unreadCount?: number; lastReadAt?: number; lastReadMessageId?: typeof args.lastReadMessageId } = {};
      if (p.unreadCount > 0) updates.unreadCount = 0;
      updates.lastReadAt = Date.now();
      if (args.lastReadMessageId) updates.lastReadMessageId = args.lastReadMessageId;
      await ctx.db.patch(p._id, updates);
    }
  },
});
