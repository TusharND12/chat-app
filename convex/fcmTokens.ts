import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Register FCM token for the current user (web push / Android).
 */
export const register = mutation({
  args: {
    token: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User not found");

    const existing = await ctx.db
      .query("fcmTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { userId: me._id, updatedAt: now, userAgent: args.userAgent });
      return existing._id;
    }

    return await ctx.db.insert("fcmTokens", {
      userId: me._id,
      token: args.token,
      userAgent: args.userAgent,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Unregister FCM token (e.g. on logout).
 */
export const unregister = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return;

    const row = await ctx.db
      .query("fcmTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (row && row.userId === me._id) {
      await ctx.db.delete(row._id);
    }
  },
});

/**
 * Get other participants' user IDs in a conversation (for push notifications).
 * Returns everyone in the conversation except the current user.
 */
export const getOtherParticipantIds = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return [];

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    return participants.filter((p) => p.userId !== me._id).map((p) => p.userId);
  },
});
