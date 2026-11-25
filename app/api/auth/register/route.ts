import { NextResponse } from "next/server";
import { registerAccount } from "@/lib/accounts";
import { isSupportedMajor } from "@/lib/majors";
import { createSession, createSessionCookie } from "@/lib/sessions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Registration details are required." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string"
    ? body.fullName.trim().replace(/\s+/g, " ")
    : "";
  const major = typeof body.major === "string" ? body.major : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (fullName.length < 2 || fullName.length > 100 || /[\u0000-\u001f\u007f]/.test(fullName)) {
    return NextResponse.json(
      { error: "Enter your full name (2–100 characters)." },
      { status: 400 }
    );
  }

  if (!isSupportedMajor(major)) {
    return NextResponse.json({ error: "Select a valid major." }, { status: 400 });
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be between 8 and 128 characters." },
      { status: 400 }
    );
  }

  try {
    const account = await registerAccount(email, password, fullName, major);

    if (!account) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    try {
      const { token } = await createSession({
        userId: account.id,
        email: account.email,
      });

      return NextResponse.json(
        {
          account: {
            id: account.id,
            email: account.email,
            fullName: account.fullName,
            major: account.major,
            createdAt: account.createdAt,
          },
        },
        {
          status: 201,
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": createSessionCookie(token),
          },
        }
      );
    } catch (error) {
      console.error("Automatic sign-in after registration failed:", error);

      return NextResponse.json(
        { error: "Your account was created, but automatic sign-in failed. Please log in." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Student account registration failed:", error);

    return NextResponse.json(
      { error: "Unable to create your account right now. Please try again." },
      { status: 500 }
    );
  }
}
