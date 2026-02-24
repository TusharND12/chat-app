import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/clerk(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    // CSP blocks connections to domains not listed here. Console errors for domains like
    // overbridgenet.com are from browser extensions/injected scripts—do not add them.
    contentSecurityPolicy: {
      directives: {
        "script-src": ["blob:"],
        "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com", "https://images.clerkstage.dev"],
        "connect-src": [
          "https://*.convex.cloud",
          "wss://*.convex.cloud",
          "https://www.google-analytics.com",
          "https://*.google-analytics.com",
          "https://firebaseinstallations.googleapis.com",
          "https://*.firebaseinstallations.googleapis.com",
          "https://fcmregistrations.googleapis.com",
          "https://*.googleapis.com",
        ],
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
