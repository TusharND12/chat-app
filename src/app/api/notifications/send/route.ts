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
      return NextResponse.json({ ok: true, sent: 0, tokensFound: 0 });
    }

    const message = {
      notification: { title, body: bodyText },
      data: { title, body: bodyText },
      tokens: [...new Set(allTokens)],
    };

    const res = await admin.messaging.sendEachForMulticast(message);
    return NextResponse.json({ ok: true, sent: res.successCount, tokensFound: message.tokens.length });
  } catch (e) {
    console.error("FCM send error:", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
