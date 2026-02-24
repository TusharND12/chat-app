"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getFcmToken } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing } from "lucide-react";

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

  const requestAndRegister = async () => {
    if (!currentUser?._id || typeof window === "undefined" || !("Notification" in window)) return;
    setRegistering(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPermission(perm);
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
      await registerToken({ token, userAgent: navigator.userAgent });
      const res = await fetch("/api/notifications/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId: currentUser._id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || `Server error (${res.status}). Check FIREBASE_SERVICE_ACCOUNT_JSON.`);
        setRegistering(false);
        return;
      }
      setPermission("granted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
    setRegistering(false);
  };

  const canRequest = permission === "default" || permission === null;
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
        onClick={canRequest ? requestAndRegister : undefined}
        disabled={registering}
        title={title}
        aria-label="Notifications"
        aria-describedby={error ? "notification-error" : undefined}
      >
        {isGranted ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : isDenied ? (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </Button>
      {error && (
        <p
          id="notification-error"
          className="absolute right-0 top-full z-50 mt-1 max-w-[240px] rounded border border-border bg-popover px-2 py-1.5 text-xs text-destructive shadow-md"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
