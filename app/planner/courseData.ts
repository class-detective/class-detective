import type { Meeting, PlannedCourse, ScheduledCourse, SemesterPlan } from "./types";

type RecordData = Record<string, unknown>;

type CourseResult = Omit<ScheduledCourse, "credits"> & { credits: number | null };

const cacheDuration = 5 * 60 * 1000;
const cacheLimit = 30;
const courseCache = new Map<string, { courses: CourseResult[]; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<CourseResult[]>>();

export async function fetchCourses(term: string, subject: string, force = false): Promise<CourseResult[]> {
  const normalizedSubject = subject.trim().toUpperCase();
  const key = `${term}:${normalizedSubject}`;
  const now = Date.now();
  for (const [cachedKey, entry] of courseCache) {
    if (entry.expiresAt <= now) courseCache.delete(cachedKey);
  }
  const cached = courseCache.get(key);
  if (cached && !force) {
    courseCache.delete(key);
    courseCache.set(key, cached);
    return cached.courses;
  }
  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = (async () => {
    const params = new URLSearchParams({ termCode: term, subjectCode: normalizedSubject, campusCode: "MAN" });
    const response = await fetch(`/api/courses?${params}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("Unable to retrieve course data. Try again later.");
    const courses = readResults(await response.json(), term);
    if (courses.length > 0) {
      courseCache.set(key, { courses, expiresAt: Date.now() + cacheDuration });
      if (courseCache.size > cacheLimit) {
        const oldestKey = courseCache.keys().next().value;
        if (oldestKey !== undefined) courseCache.delete(oldestKey);
      }
    }
    return courses;
  })();

  pendingRequests.set(key, request);
  try {
    return await request;
  } finally {
    pendingRequests.delete(key);
  }
}

function record(value: unknown): RecordData | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordData : null;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

export function termCode(semester: Pick<SemesterPlan, "term" | "year">): string {
  if (semester.term === "Fall") return `${semester.year + 1}10`;
  return `${semester.year}${semester.term === "Spring" ? "30" : "40"}`;
}

export function readResults(data: unknown, term: string): CourseResult[] {
  if (!Array.isArray(data)) throw new Error("The course API returned an unexpected response.");
  const result = new Map<string, CourseResult>();
  for (const raw of data) {
    const item = record(raw);
    if (!item) continue;
    const subject = text(item.subject);
    const number = text(item.courseNumber).replace(/^(\d{3})0$/, "$1");
    const crn = text(item.crn);
    if (!subject || !number || !crn) continue;
    const creditText = text(item.credits);
    const credits = /^\d+(?:\.\d+)?$/.test(creditText) ? Number(creditText) : null;
    const instructors = Array.isArray(item.instructors) ? item.instructors.flatMap((raw) => {
      const person = record(raw);
      if (!person) return [];
      const name = [text(person.firstName), text(person.lastName)].filter(Boolean).join(" ");
      return name ? [name] : [];
    }) : [];
    const meetings: Meeting[] = Array.isArray(item.meetings) ? item.meetings.flatMap((raw) => {
      const meeting = record(raw);
      if (!meeting) return [];
      return [{
        days: text(meeting.days), startTime: text(meeting.startTime), endTime: text(meeting.endTime),
        startDate: text(meeting.startDate), endDate: text(meeting.endDate),
        building: text(meeting.building), room: text(meeting.room), meetingType: text(meeting.meetingType),
      }];
    }) : [];
    result.set(crn, { status: "scheduled", termCode: term, crn, section: text(item.section), code: `${subject} ${number}`.toUpperCase(), name: text(item.title), credits: credits !== null && Number.isFinite(credits) ? credits : null, instructors, meetings });
  }
  if (data.length > 0 && result.size === 0) throw new Error("The course API response does not contain recognizable class sections.");
  return [...result.values()];
}

function minutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 1 || hours > 12 || mins > 59) return null;
  return (hours % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + mins;
}

function days(value: string): string[] | null {
  const compact = value.toUpperCase().replace(/[\s,/-]/g, "");
  return /^[MTWRFSU]+$/.test(compact) ? [...new Set(compact)] : null;
}

function dateValue(value: string): number | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : us ? [Number(us[3]), Number(us[1]), Number(us[2])] : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const stamp = Date.UTC(year, month - 1, day);
  const check = new Date(stamp);
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? stamp : null;
}

export function schedule(meeting: Meeting) {
  const weekdays = days(meeting.days);
  const start = minutes(meeting.startTime);
  const end = minutes(meeting.endTime);
  if (!weekdays || start === null || end === null || start >= end) return null;
  return { weekdays, start, end, first: dateValue(meeting.startDate), last: dateValue(meeting.endDate) };
}

export function isAsynchronous(meeting: Meeting): boolean {
  return !meeting.startTime.trim() && !meeting.endTime.trim() && /\bASYNC(?:HRONOUS)?\b/i.test(`${meeting.room} ${meeting.building} ${meeting.meetingType}`);
}

export function hasUnknownMeetings(course: Pick<PlannedCourse, "meetings">): boolean {
  return course.meetings.length === 0 || course.meetings.some((meeting) => !schedule(meeting) && !isAsynchronous(meeting));
}

export function conflicts(a: Pick<PlannedCourse, "meetings">, b: Pick<PlannedCourse, "meetings">): boolean {
  return a.meetings.some((first) => b.meetings.some((second) => {
    const x = schedule(first);
    const y = schedule(second);
    if (!x || !y) return false;
    if (x.first !== null && x.last !== null && y.first !== null && y.last !== null && x.first <= x.last && y.first <= y.last && (x.last < y.first || y.last < x.first)) return false;
    return x.weekdays.some((day) => y.weekdays.includes(day)) && x.start < y.end && y.start < x.end;
  }));
}

export type { CourseResult };

export const knownPublishedTerm = "202730";

export function termLabel(code: string): string {
  const year = Number(code.slice(0, 4));
  const suffix = code.slice(4);
  if (suffix === "10") return `Fall ${year - 1}`;
  if (suffix === "30") return `Spring ${year}`;
  if (suffix === "40") return `Summer ${year}`;
  return code;
}

export type PublicationInfo = { terms: string[]; complete: boolean };

export const fallbackPublication: PublicationInfo = { terms: ["202640", "202710", knownPublishedTerm], complete: false };
let publicationCache: { value: PublicationInfo; expiresAt: number } | null = null;
let publicationRequest: Promise<PublicationInfo> | null = null;

export function fetchPublishedTerms(force = false): Promise<PublicationInfo> {
  if (publicationCache && publicationCache.expiresAt > Date.now() && !force) return Promise.resolve(publicationCache.value);
  if (publicationRequest) return publicationRequest;
  publicationRequest = (async () => {
    try {
      const response = await fetch("/api/planner/terms", { cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error("Unable to check publication.");
      const data = await response.json();
      if (!Array.isArray(data.terms) || !data.terms.every((term: unknown) => typeof term === "string" && /^\d{4}(10|30|40)$/.test(term))) throw new Error("Unexpected publication response.");
      const value = { terms: [...new Set<string>([...fallbackPublication.terms, ...data.terms])].sort(), complete: data.complete === true };
      if (!value.complete && publicationCache) value.terms = [...new Set([...value.terms, ...publicationCache.value.terms])].sort();
      publicationCache = { value, expiresAt: Date.now() + (value.complete ? cacheDuration : 30000) };
      return value;
    } catch {
      return { terms: publicationCache?.value.terms ?? fallbackPublication.terms, complete: false };
    } finally {
      publicationRequest = null;
    }
  })();
  return publicationRequest;
}

export function latestReferenceTerm(info: PublicationInfo): string {
  return [...info.terms].sort().at(-1) ?? knownPublishedTerm;
}

export function courseCanBeSelected(courses: PlannedCourse[], candidate: PlannedCourse): boolean {
  const same = courses.find((course) => course.code === candidate.code);
  if (same && (same.status !== "provisional" || candidate.status !== "scheduled")) return false;
  return !courses.some((course) => course.code !== candidate.code && (
    (candidate.crn !== null && course.crn === candidate.crn) || conflicts(course, candidate)
  ));
}

export function upsertCourse(courses: PlannedCourse[], candidate: PlannedCourse): PlannedCourse[] {
  if (!courseCanBeSelected(courses, candidate)) return courses;
  return courses.some((course) => course.code === candidate.code)
    ? courses.map((course) => course.code === candidate.code ? candidate : course)
    : [...courses, candidate];
}
