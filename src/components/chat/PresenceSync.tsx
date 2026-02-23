"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";

const PRESENCE_INTERVAL_MS = 30_000;

/**
 * Updates presence periodically so other users see us as online.
 */
export function PresenceSync() {
  const updatePresence = useMutation(api.presence.updatePresence);

  useEffect(() => {
    updatePresence();
    const id = setInterval(updatePresence, PRESENCE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [updatePresence]);

  return null;
}
