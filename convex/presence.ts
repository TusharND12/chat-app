import { mutation, query } from "./_generated/server";

/** Consider user offline if last seen > 60 seconds ago */
const OFFLINE_THRESHOLD_MS = 60_000;

/**
 * Update presence (call periodically, e.g. on mount and every 30s).
 */
export const updatePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) return;

    const now = Date.now();
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("presence", {
        userId: me._id,
        lastSeenAt: now,
        updatedAt: now,
      });
    }
  },
});

/** Consider user online if last seen within this */
export const ONLINE_THRESHOLD_MS = OFFLINE_THRESHOLD_MS;

/**
 * Get online user IDs (last seen within threshold).
 */
export const getOnlineUserIds = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - OFFLINE_THRESHOLD_MS;
    const presences = await ctx.db
      .query("presence")
      .withIndex("by_last_seen", (q) => q.gte("lastSeenAt", cutoff))
      .collect();
    return presences.map((p) => p.userId);
  },
});

/**
 * Get presence map: userId -> { online, lastSeenAt } for last seen status.
 */
export const getPresenceMap = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - OFFLINE_THRESHOLD_MS;
    const presences = await ctx.db.query("presence").collect();
    const result: Record<
      string,
      { online: boolean; lastSeenAt: number }
    > = {};
    for (const p of presences) {
      result[p.userId] = {
        online: p.lastSeenAt >= cutoff,
        lastSeenAt: p.lastSeenAt,
      };
    }
    return result;
  },
});
