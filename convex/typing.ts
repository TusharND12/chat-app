import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Typing indicator expires after 2 seconds */
const TYPING_EXPIRY_MS = 2_000;

/**
 * Set typing state. Call when user types; indicator auto-expires after 2s.
 */
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return;

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    const isParticipant = participants.some((p) => p.userId === me._id);
    if (!isParticipant) return;

    const existing = await ctx.db
      .query("typing")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", me._id).eq("conversationId", args.conversationId)
      )
      .unique();

    const now = Date.now();

    if (args.isTyping) {
      if (existing) {
        await ctx.db.patch(existing._id, { updatedAt: now });
      } else {
        await ctx.db.insert("typing", {
          conversationId: args.conversationId,
          userId: me._id,
          updatedAt: now,
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Get typing users for a conversation (filter out expired).
 */
export const getTypingUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - TYPING_EXPIRY_MS;
    const typing = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const active = typing.filter((t) => t.updatedAt >= cutoff);
    const users = await Promise.all(
      active.map(async (t) => await ctx.db.get(t.userId))
    );
    return users.filter(Boolean).map((u) => ({ _id: u!._id, name: u!.name }));
  },
});
