import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    await auth();
    const body = await req.json();
    const { recipientUserIds, senderName, body: messageBody } = body as {
      recipientUserIds?: string[];
      senderName?: string;
      body?: string;
    };
    if (!recipientUserIds?.length || !senderName) {
      return NextResponse.json({ error: "Missing recipientUserIds or senderName" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
    }

    const title = `${senderName}`;
    const bodyText = (messageBody && messageBody.slice(0, 100)) || "New message";
    const allTokens: string[] = [];

    for (const userId of recipientUserIds) {
      const docId = String(userId).trim();
      if (!docId) continue;
      const doc = await admin.db.collection("fcm_tokens").doc(docId).get();
      const data = doc.data();
      const raw = data?.tokens;
      const tokens = Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string") : [];
      allTokens.push(...tokens);
    }

    if (allTokens.length === 0) {
      console.warn("FCM send: no tokens found for recipientUserIds", recipientUserIds);
      return NextResponse.json({ ok: true, sent: 0, tokensFound: 0 });
    }

    const tokens = [...new Set(allTokens)];
    const message = {
      notification: { title, body: bodyText },
      data: {
        title: String(title),
        body: String(bodyText),
      },
      tokens,
      webpush: {
        notification: { title, body: bodyText },
        fcmOptions: { link: "/chat" },
      },
    };

    const res = await admin.messaging.sendEachForMulticast(message);
    if (res.failureCount > 0) {
      res.responses.forEach((r, i) => {
        if (!r.success) console.warn("FCM send failed for token", i, r.error?.message);
      });
    }
    return NextResponse.json({ ok: true, sent: res.successCount, tokensFound: tokens.length });
  } catch (e) {
    console.error("FCM send error:", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
