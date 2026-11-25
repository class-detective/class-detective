import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type StoredAccount = {
  id: string;
  email: string;
  fullName?: string;
  major?: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

function hashPassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key);
      }
    });
  });
}

function isStoredAccount(value: unknown): value is StoredAccount {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const account = value as Record<string, unknown>;

  return (
    typeof account.id === "string" &&
    typeof account.email === "string" &&
    (account.fullName === undefined || typeof account.fullName === "string") &&
    (account.major === undefined || typeof account.major === "string") &&
    typeof account.passwordHash === "string" &&
    /^[\da-f]{128}$/i.test(account.passwordHash) &&
    typeof account.passwordSalt === "string" &&
    /^[\da-f]{32}$/i.test(account.passwordSalt) &&
    typeof account.createdAt === "string"
  );
}

async function findAccount(email: string): Promise<StoredAccount | null> {
  const accountKey = createHash("sha256").update(email).digest("hex");
  const accountPath = join(process.cwd(), ".data", "accounts", `${accountKey}.json`);
  let contents: string;

  try {
    contents = await readFile(accountPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }

  let account: unknown;

  try {
    account = JSON.parse(contents);
  } catch {
    throw new Error("Stored account record is not valid JSON.");
  }

  if (!isStoredAccount(account)) {
    throw new Error("Stored account record has an invalid format.");
  }

  return account;
}

export async function registerAccount(
  email: string,
  password: string,
  fullName: string,
  major: string
): Promise<StoredAccount | null> {
  const accountsDirectory = join(process.cwd(), ".data", "accounts");
  await mkdir(accountsDirectory, { recursive: true });

  const passwordSalt = randomBytes(16);
  const passwordHash = await hashPassword(password, passwordSalt);
  const account: StoredAccount = {
    id: randomUUID(),
    email,
    fullName,
    major,
    passwordHash: passwordHash.toString("hex"),
    passwordSalt: passwordSalt.toString("hex"),
    createdAt: new Date().toISOString(),
  };
  const accountKey = createHash("sha256").update(email).digest("hex");
  const accountPath = join(accountsDirectory, `${accountKey}.json`);

  try {
    await writeFile(accountPath, JSON.stringify(account), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      return null;
    }

    throw error;
  }

  return account;
}

export async function verifyAccountCredentials(
  email: string,
  password: string
): Promise<Pick<StoredAccount, "id" | "email"> | null> {
  const account = await findAccount(email);

  if (!account) {
    await hashPassword(password, Buffer.alloc(16));
    return null;
  }

  const passwordSalt = Buffer.from(account.passwordSalt, "hex");
  const expectedHash = Buffer.from(account.passwordHash, "hex");
  const actualHash = await hashPassword(password, passwordSalt);

  if (!timingSafeEqual(actualHash, expectedHash)) {
    return null;
  }

  return { id: account.id, email: account.email };
}

export async function getAccountProfile(email: string): Promise<{
  id: string;
  email: string;
  fullName: string | null;
  major: string | null;
} | null> {
  const account = await findAccount(email);

  if (!account) return null;

  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName ?? null,
    major: account.major ?? null,
  };
}
