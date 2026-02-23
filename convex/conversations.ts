import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get or create a 1:1 conversation between current user and target user.
 */
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    if (args.otherUserId === me._id) {
      throw new Error("Cannot create conversation with yourself");
    }

    const myParticipations = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    for (const p of myParticipations) {
      const allParticipants = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation", (q) => q.eq("conversationId", p.conversationId))
        .collect();

      const others = allParticipants.filter((op) => op.userId !== me._id);
      if (others.length === 1 && others[0].userId === args.otherUserId) {
        return p.conversationId;
      }
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: me._id,
      unreadCount: 0,
      joinedAt: now,
    });
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: args.otherUserId,
      unreadCount: 0,
      joinedAt: now,
    });

    return conversationId;
  },
});

/**
 * Create a group conversation with multiple members.
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User profile not found");

    const name = args.name.trim();
    if (!name) throw new Error("Group name is required");
    if (args.memberIds.length < 1) throw new Error("Select at least 1 member");

    const uniqueMembers = new Set(args.memberIds);
    if (uniqueMembers.has(me._id)) {
      throw new Error("Do not include yourself in member list");
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      name,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: me._id,
      unreadCount: 0,
      joinedAt: now,
    });
    for (const userId of uniqueMembers) {
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        userId,
        unreadCount: 0,
        joinedAt: now,
      });
    }

    return conversationId;
  },
});

/**
 * Get all conversations for current user with last message and other user info.
 */
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return [];

    const myParticipations = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const result = [];
    for (const p of myParticipations) {
      const conv = await ctx.db.get(p.conversationId);
      if (!conv) continue;

      const allParticipants = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation", (q) => q.eq("conversationId", p.conversationId))
        .collect();

      const isGroup = conv.name && allParticipants.length > 2;
      let displayName: string;
      let otherUser: { _id: string; name: string; imageUrl?: string };

      if (isGroup && conv.name) {
        displayName = conv.name;
        const firstOther = allParticipants.find((op) => op.userId !== me._id);
        const ou = firstOther ? await ctx.db.get(firstOther.userId) : null;
        otherUser = ou
          ? { _id: ou._id, name: displayName, imageUrl: ou.imageUrl }
          : { _id: me._id, name: displayName, imageUrl: undefined };
      } else {
        const other = allParticipants.find((op) => op.userId !== me._id);
        if (!other) continue;
        const ou = await ctx.db.get(other.userId);
        if (!ou) continue;
        otherUser = { _id: ou._id, name: ou.name, imageUrl: ou.imageUrl };
        displayName = ou.name;
      }

      const lastMessage = await ctx.db
        .query("messages")
        .withIndex("by_conversation_created", (q) =>
          q.eq("conversationId", p.conversationId)
        )
        .order("desc")
        .first();

      result.push({
        conversationId: p.conversationId,
        isGroup: !!isGroup,
        name: displayName,
        memberCount: allParticipants.length,
        otherUser,
        lastMessage: lastMessage
          ? {
              content: lastMessage.deleted ? "This message was deleted" : lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
            }
          : null,
        unreadCount: p.unreadCount,
        updatedAt: conv.updatedAt,
      });
    }

    result.sort((a, b) => b.updatedAt - a.updatedAt);

    const deduped: typeof result = [];
    const seenOtherUserIds = new Set<string>();
    for (const r of result) {
      if (!r.isGroup) {
        const key = r.otherUser._id.toString();
        if (seenOtherUserIds.has(key)) continue;
        seenOtherUserIds.add(key);
      }
      deduped.push(r);
    }
    return deduped;
  },
});

/**
 * Get a single conversation by ID (with participants).
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return null;

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const isParticipant = participants.some((p) => p.userId === me._id);
    if (!isParticipant) return null;

    const conv = await ctx.db.get(args.conversationId);
    const isGroup = conv?.name && participants.length > 2;

    let displayName: string;
    let otherUser: { _id: string; name: string; imageUrl?: string } | null = null;

    if (isGroup && conv?.name) {
      displayName = conv.name;
    } else {
      const other = participants.find((p) => p.userId !== me._id);
      const ou = other ? await ctx.db.get(other.userId) : null;
      otherUser = ou ? { _id: ou._id, name: ou.name, imageUrl: ou.imageUrl } : null;
      displayName = ou?.name ?? "Unknown";
    }

    return {
      conversationId: args.conversationId,
      isGroup: !!isGroup,
      name: displayName,
      memberCount: participants.length,
      otherUser,
    };
  },
});

/**
 * Get group members (for group conversations only).
 */
export const getGroupMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return [];

    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return [];

    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const isParticipant = participants.some((p) => p.userId === me._id);
    if (!isParticipant) return [];

    const isGroup = !!conv.name && participants.length > 2;
    if (!isGroup) return [];

    const members: { _id: typeof me._id; name: string; imageUrl?: string }[] = [];
    for (const p of participants) {
      const u = await ctx.db.get(p.userId);
      if (u) {
        members.push({
          _id: u._id,
          name: u.name ?? "",
          imageUrl: u.imageUrl,
        });
      }
    }
    return members;
  },
});

/**
 * Leave a group conversation.
 */
export const leaveGroup = mutation({
  args: { conversationId: v.id("conversations") },
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

    const conv = await ctx.db.get(args.conversationId);
    const isGroup = conv?.name && participants.length > 2;
    if (!isGroup) throw new Error("Can only leave group conversations");

    const myParticipation = participants.find((p) => p.userId === me._id);
    if (!myParticipation) throw new Error("You are not a member of this group");

    await ctx.db.delete(myParticipation._id);
  },
});
