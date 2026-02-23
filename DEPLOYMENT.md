# Deploy Chat App from Scratch

Step-by-step: what to put where for Clerk, Convex, and Vercel.

---

## 1. Clerk (https://dashboard.clerk.com)

### 1.1 Create app (if needed)
- Sign in → **Add application** → choose a name
- You’ll see API keys on the main screen

### 1.2 Copy these values

| What | Where to find | Example |
|------|---------------|---------|
| **Publishable Key** | API Keys (pk_...) | `pk_test_abc123...` |
| **Secret Key** | API Keys (sk_...) | `sk_test_xyz789...` |

### 1.3 JWT template for Convex
1. **Configure** → **JWT Templates** → **New template**
2. Pick **Convex**
3. Name it exactly: `convex`
4. Save
5. Open the template → copy the **Issuer** URL

| What | Example |
|------|---------|
| **Issuer URL** | `https://your-app-name.clerk.accounts.dev` |

Save this for Convex.

---

## 2. Convex (https://dashboard.convex.dev)

### 2.1 Create / link project
```bash
cd chat-app
npx convex dev
```
- Log in and create or select a project

### 2.2 Dev environment variables
1. Dashboard → your project → **Settings** → **Environment Variables**
2. Choose **Development**
3. Add:

| Name | Value |
|------|-------|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://your-app-name.clerk.accounts.dev` (from Clerk step 1.3) |

### 2.3 Production environment variables
1. Same **Settings** → **Environment Variables**
2. Switch to **Production**
3. Add the same variable:

| Name | Value |
|------|-------|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://your-app-name.clerk.accounts.dev` |

### 2.4 Deploy Convex
```bash
cd chat-app
npx convex deploy
```
- Copy the **production URL**, e.g. `https://zealous-minnow-803.convex.cloud`

---

## 3. Vercel (https://vercel.com)

### 3.1 Import project
1. **Add New** → **Project**
2. Import your GitHub repo (`TusharND12/chatbot` or your fork)
3. **Root Directory** → **Edit** → set to `chat-app`

### 3.2 Environment variables
Before deploying, add these (Settings → Environment Variables):

| Name | Value | Where it comes from |
|------|-------|---------------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Clerk → API Keys |
| `CLERK_SECRET_KEY` | `sk_test_...` | Clerk → API Keys |
| `NEXT_PUBLIC_CONVEX_URL` | `https://xxx.convex.cloud` | Convex → production URL from step 2.4 |

Apply to **Production** (and optionally Preview).

### 3.3 Deploy
- Click **Deploy**
- After deploy, copy your app URL, e.g. `https://chat-app-abc123.vercel.app`

---

## 4. Clerk – add Vercel URL

1. Clerk → **Configure** → **Paths**
2. Under **Allowed redirect URLs** add:
   - `https://your-app-abc123.vercel.app`
   - `https://your-app-abc123.vercel.app/sign-in`
   - `https://your-app-abc123.vercel.app/sign-up`
3. Replace with your real Vercel URL if different

---

## Summary: What goes where

### Clerk Dashboard
- API Keys → Publishable Key, Secret Key (for Vercel)
- JWT Templates → Convex template → Issuer URL (for Convex)

### Convex Dashboard
- **Dev** env: `CLERK_JWT_ISSUER_DOMAIN` = Clerk Issuer URL
- **Prod** env: `CLERK_JWT_ISSUER_DOMAIN` = same Issuer URL
- Production deploy URL (for Vercel)

### Vercel Project
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = Clerk Publishable Key
- `CLERK_SECRET_KEY` = Clerk Secret Key
- `NEXT_PUBLIC_CONVEX_URL` = Convex production URL

### Local dev (.env.local)
Same 3 values as Vercel for local runs:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
```
Use your **dev** Convex URL for local dev (`npx convex dev` output).

---

## Troubleshooting

> **Quick fix for "No auth provider found" + WebSocket reconnects:**  
> Convex **Production** env var `CLERK_JWT_ISSUER_DOMAIN` must equal your Clerk JWT Issuer. Get it from Clerk → JWT Templates → Convex. Then run `npx convex deploy` and redeploy Vercel.

### "No auth provider found matching the given token" (deployed app stuck on "Connecting your account...")

**Cause:** Convex Production does not have `CLERK_JWT_ISSUER_DOMAIN` set, or it doesn't match the JWT issuer.

**Fix (do these in order):**

1. **Get your Clerk Issuer URL**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com) → **Configure** → **JWT Templates** → open the **Convex** template
   - Copy the **Issuer** value (e.g. `https://renewing-panda-31.clerk.accounts.dev`)

2. **Set it in Convex Production**
   - Go to [Convex Dashboard](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables**
   - Switch to **Production** (not Development)
   - Add or update: `CLERK_JWT_ISSUER_DOMAIN` = your Issuer URL (exact, no trailing slash)

3. **Redeploy Convex** (env vars apply on next deploy)
   ```bash
   cd chat-app && npx convex deploy
   ```

4. **Redeploy Vercel** (Settings → Deployments → ⋮ on latest → Redeploy)

### WebSocket reconnects / "closed with code 1005"

- Caused by the auth error above. Fix `CLERK_JWT_ISSUER_DOMAIN` in Convex Production and redeploy.

### Clerk "development keys" warning (console)

**Cause:** Vercel is using `pk_test_` / `sk_test_` keys. Clerk warns these have usage limits.

**Fix (optional for production):**
1. [Clerk Dashboard](https://dashboard.clerk.com) → top bar → **Development** → **Create production instance**
2. Copy production keys (`pk_live_` / `sk_live_`) and set in Vercel env vars
3. Add production issuer to Convex `CLERK_JWT_ISSUER_DOMAIN` if it differs

Dev keys work for deployed apps but show this warning; production keys are recommended for real production use.

### "cannot_render_single_session_enabled"

- Shown when SignIn is triggered but user is already signed in. Fixed by ensuring Convex auth works (see above).

---

## Checklist

- [ ] Clerk: JWT template named `convex`, Issuer URL copied
- [ ] Convex: `CLERK_JWT_ISSUER_DOMAIN` set in Dev and Prod
- [ ] Convex: `npx convex deploy` run, production URL copied
- [ ] Vercel: Root directory = `chat-app`
- [ ] Vercel: 3 env vars set
- [ ] Clerk: Vercel URLs added to allowed redirects
- [ ] Deploy on Vercel and test sign-in/sign-up

<!-- trigger redeploy -->
