import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ALLOWED_EMOJIS = ["👍", "❤", "😂", "😮", "😢"] as const;

/**
 * Toggle reaction: add if not present, remove if already reacted.
 */
export const toggle = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    if (!ALLOWED_EMOJIS.includes(args.emoji as (typeof ALLOWED_EMOJIS)[number])) {
      throw new Error("Invalid emoji");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", msg.conversationId))
      .collect();
    const isParticipant = participants.some((p) => p.userId === me._id);
    if (!isParticipant) throw new Error("Not a participant");

    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_message_user_emoji", (q) =>
        q
          .eq("messageId", args.messageId)
          .eq("userId", me._id)
          .eq("emoji", args.emoji)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        userId: me._id,
        emoji: args.emoji,
        createdAt: now,
      });
    }
  },
});

/**
 * Get reactions for all messages in a conversation.
 * Returns map: messageId -> [{ emoji, count, hasReacted }]
 */
export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const me = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .unique()
      : null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const result: Record<
      string,
      { emoji: string; count: number; hasReacted: boolean }[]
    > = {};

    for (const msg of messages) {
      const reactions = await ctx.db
        .query("messageReactions")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      const byEmoji = new Map<
        string,
        { count: number; userIds: Set<string> }
      >();
      for (const r of reactions) {
        if (!byEmoji.has(r.emoji)) {
          byEmoji.set(r.emoji, { count: 0, userIds: new Set() });
        }
        const entry = byEmoji.get(r.emoji)!;
        entry.count++;
        entry.userIds.add(r.userId);
      }

      result[msg._id] = Array.from(byEmoji.entries()).map(
        ([emoji, { count, userIds }]) => ({
          emoji,
          count,
          hasReacted: me ? userIds.has(me._id) : false,
        })
      );
    }

    return result;
  },
});
