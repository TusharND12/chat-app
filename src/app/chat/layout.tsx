"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { UserSync } from "@/components/chat/UserSync";
import { PresenceSync } from "@/components/chat/PresenceSync";
import { Button } from "@/components/ui/button";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn } = useAuth();

  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
          <h1 className="text-2xl font-semibold">Welcome to Chat</h1>
          <p className="text-center text-muted-foreground">
            {isSignedIn
              ? "Connecting your account..."
              : "Sign in to start messaging"}
          </p>
          {!isSignedIn && (
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          )}
        </div>
      </Unauthenticated>
      <Authenticated>
        <UserSync />
        <PresenceSync />
        {children}
      </Authenticated>
    </>
  );
}
