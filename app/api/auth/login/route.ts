import { NextResponse } from "next/server";
import { verifyAccountCredentials } from "@/lib/accounts";
import { createSession, createSessionCookie } from "@/lib/sessions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Login details are required." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!password || password.length > 128) {
    return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  }

  try {
    const user = await verifyAccountCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 }
      );
    }

    const { token } = await createSession({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      { user },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": createSessionCookie(token),
        },
      }
    );
  } catch (error) {
    console.error("Student account login failed:", error);

    return NextResponse.json(
      { error: "Unable to log in right now. Please try again." },
      { status: 500 }
    );
  }
}
