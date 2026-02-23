import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Send a message. Updates conversation.updatedAt, increments unread for other participants.
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    replyToMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const isParticipant = participants.some((p) => p.userId === me._id);
    if (!isParticipant) throw new Error("Not a participant of this conversation");

    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      content,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      replyToMessageId: args.replyToMessageId,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
    });

    for (const p of participants) {
      if (p.userId !== me._id) {
        await ctx.db.patch(p._id, {
          unreadCount: p.unreadCount + 1,
        });
      }
    }

    return messageId;
  },
});

/**
 * Get messages for a conversation (paginated, most recent first for infinite scroll).
 */
export const list = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { messages: [], nextCursor: null };

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return { messages: [], nextCursor: null };

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    const isParticipant = participants.some((p) => p.userId === me._id);
    if (!isParticipant) return { messages: [], nextCursor: null };

    const limit = args.limit ?? 50;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(limit + 1);

    const hasMore = messages.length > limit;
    const toReturn = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? toReturn[toReturn.length - 1]._id : null;

    const others = participants.filter((p) => p.userId !== me._id);
    let maxLastReadCreatedAt: number | null = null;
    for (const p of others) {
      if (p.lastReadMessageId) {
        const lastReadMsg = await ctx.db.get(p.lastReadMessageId);
        if (lastReadMsg) {
          if (maxLastReadCreatedAt === null || lastReadMsg.createdAt > maxLastReadCreatedAt) {
            maxLastReadCreatedAt = lastReadMsg.createdAt;
          }
        }
      }
    }

    const withSender = await Promise.all(
      toReturn.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        const isFromMe = m.senderId === me._id;
        const delivered = true;
        const seen =
          isFromMe &&
          !m.deleted &&
          maxLastReadCreatedAt !== null &&
          maxLastReadCreatedAt >= m.createdAt;
        let replyTo: { content: string; senderName: string } | undefined;
        if (m.replyToMessageId) {
          const replyMsg = await ctx.db.get(m.replyToMessageId);
          if (replyMsg) {
            const replySender = await ctx.db.get(replyMsg.senderId);
            replyTo = {
              content: replyMsg.deleted ? "This message was deleted" : replyMsg.content,
              senderName: replySender?.name ?? "Unknown",
            };
          }
        }
        return {
          _id: m._id,
          content: m.deleted ? "This message was deleted" : m.content,
          senderId: m.senderId,
          senderName: sender?.name ?? "Unknown",
          senderImageUrl: sender?.imageUrl,
          createdAt: m.createdAt,
          deleted: m.deleted,
          editedAt: m.editedAt,
          replyToMessageId: m.replyToMessageId,
          replyTo,
          readStatus: isFromMe && !m.deleted ? { delivered, seen } : undefined,
        };
      })
    );

    return {
      messages: withSender.reverse(),
      nextCursor,
    };
  },
});

/**
 * Edit a message (only sender, not deleted).
 */
export const edit = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    if (msg.senderId !== me._id) throw new Error("Can only edit own messages");
    if (msg.deleted) throw new Error("Cannot edit deleted message");

    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");

    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      content,
      updatedAt: now,
      editedAt: now,
    });
  },
});

/**
 * Forward a message to another conversation.
 */
export const forward = mutation({
  args: {
    messageId: v.id("messages"),
    targetConversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    const sourceMsg = await ctx.db.get(args.messageId);
    if (!sourceMsg) throw new Error("Message not found");
    const contentToForward = sourceMsg.deleted
      ? "This message was deleted"
      : sourceMsg.content;

    const targetParticipants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.targetConversationId)
      )
      .collect();
    const isParticipant = targetParticipants.some((p) => p.userId === me._id);
    if (!isParticipant) throw new Error("Not a participant of target conversation");

    const now = Date.now();
    const newId = await ctx.db.insert("messages", {
      conversationId: args.targetConversationId,
      senderId: me._id,
      content: contentToForward,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.targetConversationId, { updatedAt: now });
    for (const p of targetParticipants) {
      if (p.userId !== me._id) {
        await ctx.db.patch(p._id, {
          unreadCount: p.unreadCount + 1,
        });
      }
    }
    return newId;
  },
});

/**
 * Search messages in a conversation by content.
 */
export const search = query({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
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
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    if (!participants.some((p) => p.userId === me._id)) return [];

    const searchQuery = args.query.trim().toLowerCase();
    if (!searchQuery) return [];

    const limit = args.limit ?? 50;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created", (q0) =>
        q0.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .collect();

    const matched = messages.filter(
      (m) =>
        !m.deleted &&
        m.content.toLowerCase().includes(searchQuery)
    ).slice(0, limit);

    const withSender = await Promise.all(
      matched.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        return {
          _id: m._id,
          content: m.content,
          senderId: m.senderId,
          senderName: sender?.name ?? "Unknown",
          createdAt: m.createdAt,
          editedAt: m.editedAt,
        };
      })
    );
    return withSender.reverse();
  },
});

/**
 * Soft delete a message (only sender can delete).
 */
export const softDelete = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    if (msg.senderId !== me._id) throw new Error("Can only delete own messages");

    await ctx.db.patch(args.messageId, {
      content: "[Message deleted]",
      deleted: true,
      updatedAt: Date.now(),
    });
  },
});
