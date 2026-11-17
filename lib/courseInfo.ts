// Helpers for the course info page (/courses/ICS-314).

/** "ICS-314" -> { subject: "ICS", courseNumber: "314" } */
export function parseCourseKey(
  courseKey: string
): { subject: string; courseNumber: string } | null {
  const match = decodeURIComponent(courseKey)
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{2,5})[-\s]?(\d{3}[A-Z]?)$/);

  return match ? { subject: match[1], courseNumber: match[2] } : null;
}

/** Link to a course's info page. */
export function courseHref(subject: string, courseNumber: string): string {
  return `/courses/${encodeURIComponent(`${subject}-${courseNumber}`.toUpperCase())}`;
}

/**
 * UH course descriptions put the prerequisites inline, e.g.
 * "Team-oriented development... Pre: 211 and 241, or consent."
 * Splits that into the description and the prerequisite text.
 */
export function splitDescription(description: string): {
  summary: string;
  prerequisites: string | null;
} {
  const text = description.replace(/\s+/g, " ").trim();
  const match = text.match(/\b(?:Pre|Prerequisites?):\s*/i);

  if (!match || match.index === undefined) {
    return { summary: text, prerequisites: null };
  }

  const before = text.slice(0, match.index).trim();
  const afterLabel = text.slice(match.index + match[0].length);

  // The prerequisite text runs to the end of its sentence. A period inside
  // something like "ICS 211." followed by more text ends it.
  const end = afterLabel.search(/\.(\s|$)/);
  const prerequisites = (end === -1 ? afterLabel : afterLabel.slice(0, end)).trim();
  const rest = end === -1 ? "" : afterLabel.slice(end + 1).trim();

  return {
    summary: [before, rest].filter(Boolean).join(" "),
    prerequisites: prerequisites || null,
  };
}
