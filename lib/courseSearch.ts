// Helpers for the Browse Courses page: group the section list from
// /api/courses into one entry per course, and match a search query.

export interface SearchableSection {
  subject: string;
  courseNumber: string;
  title: string;
  credits: number | string | null;
  seatsAvailable: number | null;
}

export interface CourseGroup<T extends SearchableSection> {
  key: string;          // "ICS-314"
  subject: string;      // "ICS"
  courseNumber: string; // "314"
  title: string;
  credits: number | string | null;
  seatsOpen: number;    // open seats across all sections
  sections: T[];
}

/** One entry per course, sorted by course number (ICS 111 before ICS 1110). */
export function groupSections<T extends SearchableSection>(
  sections: T[]
): CourseGroup<T>[] {
  const groups = new Map<string, CourseGroup<T>>();

  for (const section of sections) {
    const subject = section.subject.trim().toUpperCase();
    const courseNumber = section.courseNumber.trim().toUpperCase();
    const key = `${subject}-${courseNumber}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        subject,
        courseNumber,
        title: section.title,
        credits: section.credits,
        seatsOpen: 0,
        sections: [],
      };
      groups.set(key, group);
    }

    group.sections.push(section);
    group.seatsOpen += Math.max(0, section.seatsAvailable ?? 0);
    group.title ||= section.title;
  }

  return [...groups.values()].sort((a, b) =>
    `${a.subject} ${a.courseNumber}`.localeCompare(
      `${b.subject} ${b.courseNumber}`,
      undefined,
      { numeric: true }
    )
  );
}

/**
 * Matches a course code with or without the space ("ICS 314", "ics314",
 * "314") or any part of the title ("software").
 */
export function matchesSearch(
  group: Pick<CourseGroup<SearchableSection>, "subject" | "courseNumber" | "title">,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const code = `${group.subject}${group.courseNumber}`.toLowerCase();
  const compactQuery = q.replace(/\s+/g, "");

  return code.includes(compactQuery) || group.title.toLowerCase().includes(q);
}

export function formatCredits(credits: number | string | null): string {
  if (credits === null || credits === "") return "Credits vary";
  return `${credits} ${String(credits) === "1" ? "credit" : "credits"}`;
}
