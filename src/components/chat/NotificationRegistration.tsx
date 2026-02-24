"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getFcmToken } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

/**
 * Notifications control: always visible bell. Click to enable or see status.
 */
export function NotificationRegistration() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const registerToken = useMutation(api.fcmTokens.register);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (currentUser !== undefined && error === "Loading…") setError(null);
  }, [currentUser, error]);

  const handleClick = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("Notifications not supported.");
      return;
    }
    if (currentUser === undefined) {
      setError("Loading…");
      return;
    }
    if (!currentUser?._id) {
      setError("Sign in to enable notifications.");
      return;
    }
    if (permission === "denied") {
      setError("Notifications blocked. Allow them in your browser settings and reload.");
      return;
    }
    if (permission === "granted") {
      requestAndRegister();
      return;
    }
    requestAndRegister();
  };

  const requestAndRegister = async () => {
    if (!currentUser?._id) return;
    setRegistering(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setRegistering(false);
        return;
      }
      const result = await getFcmToken();
      if ("error" in result) {
        setError(result.error);
        setRegistering(false);
        return;
      }
      const { token } = result;
      const apiUrl = "/api/notifications/register";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId: currentUser._id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || `Server error (${res.status}). Check FIREBASE_SERVICE_ACCOUNT_JSON in .env.local and restart.`);
        setRegistering(false);
        return;
      }
      try {
        await registerToken({ token, userAgent: navigator.userAgent });
      } catch {
        // Token is already in Firestore; Convex sync is optional
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      if (msg === "Failed to fetch") {
        setError("Network error. Check dev server is running and FIREBASE_SERVICE_ACCOUNT_JSON in .env.local.");
      } else {
        setError(msg);
      }
    }
    setRegistering(false);
  };

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";
  const title = error
    ? error
    : isGranted
      ? "Notifications on"
      : isDenied
        ? "Notifications blocked"
        : "Enable notifications";

  return (
    <div className="relative flex shrink-0 flex-col items-end">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={`h-9 w-9 shrink-0 rounded-full border-2 ${error ? "border-destructive/50" : ""}`}
        onClick={handleClick}
        disabled={registering}
        title={title}
        aria-label="Notifications"
        aria-describedby={error ? "notification-error" : undefined}
      >
        {registering ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : isGranted ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : isDenied ? (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </Button>
      {error && (
        <div
          id="notification-error"
          className="absolute right-0 top-full z-50 mt-1 max-w-[260px] rounded border border-border bg-popover px-2 py-1.5 text-xs shadow-md"
          role="alert"
        >
          <p className="text-destructive">{error}</p>
          {error.includes("localhost:3000") && (
            <a
              href="https://localhost:3000"
              className="mt-1 block font-medium text-primary underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open with HTTPS →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
