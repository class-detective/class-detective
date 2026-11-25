import { NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/accounts";
import {
  clearSessionCookie,
  getSessionToken,
  revokeSessionToken,
  verifySessionToken,
} from "@/lib/sessions";

export async function GET(request: Request) {
  try {
    const session = await verifySessionToken(getSessionToken(request));

    if (!session) {
      return NextResponse.json(
        { error: "Not signed in." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const account = await getAccountProfile(session.email);

    if (!account || account.id !== session.userId) {
      return NextResponse.json(
        { error: "Not signed in." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { user: account },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unable to read student account session:", error);

    return NextResponse.json(
      { error: "Unable to verify your session." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await revokeSessionToken(getSessionToken(request));

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": clearSessionCookie(),
      },
    });
  } catch (error) {
    console.error("Unable to end student account session:", error);

    return NextResponse.json(
      { error: "Unable to log out right now. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
