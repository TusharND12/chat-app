import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getFirebaseAdmin, FieldValue } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, userId: convexUserId } = body as { token?: string; userId?: string };
    if (!token || !convexUserId) {
      return NextResponse.json({ error: "Missing token or userId" }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
    }

    const docRef = admin.db.collection("fcm_tokens").doc(convexUserId);
    await docRef.set(
      { tokens: FieldValue.arrayUnion(token), updatedAt: Date.now() },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("FCM register error:", e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
