# Real-time Chat App

Production-ready real-time chat built with Next.js 16, Convex, Clerk, and Tailwind CSS.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black) ![Convex](https://img.shields.io/badge/Convex-Database-ff6b35) ![Clerk](https://img.shields.io/badge/Clerk-Auth-6c47ff)

## Features

- **Authentication** – Clerk sign up / login, user profiles in Convex
- **1:1 & Group Chat** – Create groups with name and members
- **Real-time Messaging** – Live updates with Convex subscriptions
- **Message Reactions** – Right-click to add emojis (👍 ❤ 😂 😮 😢)
- **Read Receipts** – Delivered ✓ and Seen ✓✓ indicators
- **Last Seen Status** – "Last seen 5 minutes ago" in sidebar
- **Message Search** – Search inside conversations
- **Edit & Forward** – Edit own messages (with "Edited" label), forward to other chats
- **Typing Indicator** – "User is typing..." with animated dots
- **Online/Offline** – Green dot when user is active
- **Unread Badge** – Per conversation, cleared when opened
- **Day Separators** – "Today", "Yesterday" in message list
- **Responsive Layout** – Mobile-friendly sidebar and chat
- **Empty & Loading States** – Polished skeletons and empty states

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Convex** (database + realtime)
- **Clerk** (authentication)
- **Tailwind CSS** + **shadcn/ui**

## Getting Started

### Prerequisites

- Node.js 18+
- [Clerk](https://clerk.com) account
- [Convex](https://convex.dev) account

### 1. Clone & Install

```bash
git clone https://github.com/TusharND12/chatbot.git
cd chatbot/chat-app
npm install
```

### 2. Configure Clerk

1. Create an app at [clerk.com](https://clerk.com)
2. Copy **Publishable Key** and **Secret Key**
3. Go to **Configure** → **JWT Templates** → **New** → **Convex**
4. Name it `convex` and copy the **Issuer** URL

### 3. Configure Convex

```bash
npx convex dev
```

- Log in and create/link a project
- In [Convex Dashboard](https://dashboard.convex.dev) → **Settings** → **Environment Variables**:
  - Add `CLERK_JWT_ISSUER_DOMAIN` = your Clerk Issuer URL (for Dev and Prod)

### 4. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
```

(Get Convex URL from `npx convex dev` output.)

### 5. Run

```bash
# Terminal 1 – Convex
npx convex dev

# Terminal 2 – Next.js
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up and test chat in another browser/incognito.

## Deploy to Vercel

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step instructions.

## Project Structure

```
chat-app/
├── convex/              # Convex backend
│   ├── schema.ts
│   ├── auth.config.ts
│   ├── users.ts
│   ├── conversations.ts
│   ├── messages.ts
│   ├── presence.ts
│   ├── typing.ts
│   ├── reactions.ts
│   └── conversationParticipants.ts
├── src/
│   ├── app/
│   │   ├── chat/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── components/
│   │   └── chat/
│   └── lib/
├── DEPLOYMENT.md
└── README.md
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx convex dev` | Run Convex dev (sync schema, generate types) |
| `npx convex deploy` | Deploy Convex to production |

## License

MIT
