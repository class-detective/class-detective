import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SESSION_COOKIE = "class_detective_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type UserSession = {
  userId: string;
  email: string;
  expiresAt: number;
};

function getSessionPath(token: string): string {
  const sessionKey = createHash("sha256").update(token).digest("hex");
  return join(process.cwd(), ".data", "sessions", `${sessionKey}.json`);
}

function isUserSession(value: unknown): value is UserSession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.userId === "string" &&
    typeof session.email === "string" &&
    typeof session.expiresAt === "number"
  );
}

export async function createSession(
  user: Pick<UserSession, "userId" | "email">
): Promise<{ token: string; session: UserSession }> {
  const sessionsDirectory = join(process.cwd(), ".data", "sessions");
  await mkdir(sessionsDirectory, { recursive: true });

  const session: UserSession = {
    ...user,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(32).toString("base64url");

    try {
      await writeFile(getSessionPath(token), JSON.stringify(session), {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });

      return { token, session };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to create a unique session token.");
}

export async function verifySessionToken(
  token: string | null
): Promise<UserSession | null> {
  if (!token || !/^[\da-zA-Z_-]{43}$/.test(token)) {
    return null;
  }

  let contents: string;

  try {
    contents = await readFile(getSessionPath(token), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }

  let value: unknown;

  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error("Stored session record is not valid JSON.");
  }

  if (!isUserSession(value)) {
    throw new Error("Stored session record has an invalid format.");
  }

  if (value.expiresAt <= Math.floor(Date.now() / 1000)) {
    await revokeSessionToken(token);
    return null;
  }

  return value;
}

export async function revokeSessionToken(token: string | null): Promise<void> {
  if (!token || !/^[\da-zA-Z_-]{43}$/.test(token)) {
    return;
  }

  try {
    await unlink(getSessionPath(token));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}

export function getSessionToken(request: Request): string | null {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  const sessionCookie = cookies
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));

  return sessionCookie?.slice(SESSION_COOKIE.length + 1) || null;
}

export function createSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
