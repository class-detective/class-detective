export const calendarRoot = "https://manoa.hawaii.edu/registrar/academic-calendar/";
export const knownPublishedTerms = ["202640", "202710", "202730"];

const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export function calendarLinks(html: string) {
  const links = new Map<string, { url: string; term: string; year: number }>();
  for (const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], calendarRoot);
      if (url.origin !== new URL(calendarRoot).origin) continue;
      const path = /^\/registrar\/academic-calendar\/(spring|summer|fall)-(\d{4})\/?$/.exec(url.pathname);
      if (!path) continue;
      const [, term, yearText] = path;
      const year = Number(yearText);
      const code = term === "fall" ? `${year + 1}10` : `${year}${term === "spring" ? "30" : "40"}`;
      links.set(code, { url: new URL(url.pathname, calendarRoot).href, term, year });
    } catch { continue; }
  }
  return links;
}

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;|&#xA0;/gi, " ").replace(/&ndash;|&#8211;|&mdash;/gi, "–").replace(/\s+/g, " ").trim();
}

export function publicationDate(html: string, term: string, year: number): string | null {
  const dates: string[] = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => plainText(cell[1]));
    if (cells.length < 2) continue;
    const event = cells.slice(1).join(" ");
    const publication = /\bschedule (?:is )?published in (?:class availability|browse classes)\b/i.test(event);
    const summerRegistration = term === "summer" && /^summer sessions registration begins for\b/i.test(event);
    if (!publication && !summerRegistration) continue;
    const date = /^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/.exec(cells[0]);
    if (!date) continue;
    const month = months.indexOf(date[1].toLowerCase());
    if (month < 0) continue;
    const dateYear = date[3] ? Number(date[3]) : term === "spring" && month >= 7 ? year - 1 : year;
    const day = Number(date[2]);
    const stamp = new Date(Date.UTC(dateYear, month, day));
    if (stamp.getUTCMonth() !== month || stamp.getUTCDate() !== day) continue;
    dates.push(stamp.toISOString().slice(0, 10));
  }
  return dates.sort()[0] ?? null;
}

export function hawaiiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

export async function publishedTerms(load: (url: string) => Promise<string>, today = hawaiiDate()) {
  const terms = new Set(knownPublishedTerms);
  const links = calendarLinks(await load(calendarRoot));
  if (links.size === 0) throw new Error("No recognized semester calendars were found.");
  let complete = true;
  await Promise.all([...links].filter(([code]) => !terms.has(code) && code > "202730").map(async ([code, calendar]) => {
    try {
      const date = publicationDate(await load(calendar.url), calendar.term, calendar.year);
      if (date && date <= today) terms.add(code);
    } catch { complete = false; }
  }));
  return { terms: [...terms].sort(), complete };
}
