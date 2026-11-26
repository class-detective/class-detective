import { connection, NextResponse } from "next/server";
import { knownPublishedTerms, publishedTerms } from "./publication";

let cached: { value: Awaited<ReturnType<typeof publishedTerms>>; expiresAt: number } | null = null;
let pending: Promise<Awaited<ReturnType<typeof publishedTerms>>> | null = null;

async function loadCalendar(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Unable to retrieve the academic calendar.");
  return response.text();
}

export async function GET() {
  await connection();
  try {
    if (!cached || cached.expiresAt <= Date.now()) {
      if (!pending) {
        pending = publishedTerms(loadCalendar).then((value) => {
          cached = { value, expiresAt: Date.now() + (value.complete ? 5 * 60 * 1000 : 30000) };
          return value;
        }).finally(() => { pending = null; });
      }
      await pending;
    }
    return NextResponse.json(cached?.value ?? { terms: knownPublishedTerms, complete: false });
  } catch {
    return NextResponse.json({ terms: cached?.value.terms ?? knownPublishedTerms, complete: false });
  }
}
