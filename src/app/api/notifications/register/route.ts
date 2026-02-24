import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getFirebaseAdmin, FieldValue } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { token, userId: convexUserId } = (body || {}) as { token?: string; userId?: string };
    if (!token || convexUserId == null || convexUserId === "") {
      return NextResponse.json({ error: "Missing token or userId" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Firebase not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON in env (Vercel: Project Settings → Environment Variables).",
        },
        { status: 503 }
      );
    }

    const docId = String(convexUserId).trim();
    if (!docId) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    const docRef = admin.db.collection("fcm_tokens").doc(docId);
    await docRef.set(
      { tokens: FieldValue.arrayUnion(token), updatedAt: Date.now() },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("FCM register error:", e);
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
