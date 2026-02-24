import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Production-ready schema for real-time chat app
 * - Users: Synced from Clerk, stores profile for display
 * - Conversations: One-to-one chat threads
 * - Messages: Individual messages with soft delete support
 * - Presence: Online/offline status
 * - Typing: Typing indicators with auto-expiry
 * - ConversationParticipants: Junction table for unread counts
 */
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_name", ["name"]),

  conversations: defineTable({
    name: v.optional(v.string()), // Group name (null = 1:1)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_updated", ["updatedAt"]),

  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastReadMessageId: v.optional(v.id("messages")),
    lastReadAt: v.optional(v.number()),
    unreadCount: v.number(), // Denormalized for performance
    joinedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    deleted: v.boolean(), // Soft delete
    createdAt: v.number(),
    updatedAt: v.number(),
    editedAt: v.optional(v.number()), // When last edited (for "Edited" label)
    replyToMessageId: v.optional(v.id("messages")), // For reply threading
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),

  presence: defineTable({
    userId: v.id("users"),
    lastSeenAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_last_seen", ["lastSeenAt"]),

  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_user_emoji", ["messageId", "userId", "emoji"]),

  typing: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  fcmTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),
});
