"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";

/**
 * Syncs Clerk user to Convex users table on mount.
 * Place inside Authenticated so we always have a user.
 */
export function UserSync() {
  const { user } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  useEffect(() => {
    if (!user) return;

    createOrUpdateUser({
      clerkId: user.id,
      name: user.fullName ?? user.firstName ?? "Anonymous",
      imageUrl: user.imageUrl,
      email: user.primaryEmailAddress?.emailAddress,
    }).catch(console.error);
  }, [user?.id, user?.fullName, user?.firstName, user?.imageUrl, user?.primaryEmailAddress?.emailAddress, createOrUpdateUser]);

  return null;
}
