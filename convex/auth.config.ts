import { AuthConfig } from "convex/server";

/**
 * Convex auth configuration for Clerk.
 * Set CLERK_JWT_ISSUER_DOMAIN in Convex Dashboard (Dev + Prod)
 * Use your Clerk Frontend API URL from the JWT templates "convex" template.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
