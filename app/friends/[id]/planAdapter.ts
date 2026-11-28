import type { Course, Day, Meeting, Plan, Semester } from "./comparison";
import type { Plans } from "./friendPlanService";

export type PlannerMeeting = {
  days: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
};
export type PlannerCourse = {
  status: "scheduled" | "provisional";
  termCode: string;
  crn: string | null;
  section: string | null;
  code: string;
  name: string;
  meetings: PlannerMeeting[];
};
export type PlannerSemester = {
  term: "Spring" | "Summer" | "Fall";
  year: number;
  courses: PlannerCourse[];
};

const dayCodes: Record<string, Day> = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri", S: "Sat", U: "Sun" };

export function plannerTermCode(plan: Pick<PlannerSemester, "term" | "year">) {
  return plan.term === "Fall" ? `${plan.year + 1}10` : `${plan.year}${plan.term === "Spring" ? "30" : "40"}`;
}

export function parseMeetingTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return (hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + minute;
}

export function adaptMeeting(meeting: PlannerMeeting): Meeting[] {
  const compact = meeting.days.toUpperCase().replace(/[\s,/-]/g, "");
  const start = parseMeetingTime(meeting.startTime), end = parseMeetingTime(meeting.endTime);
  if (!/^[MTWRFSU]+$/.test(compact) || start === null || end === null || start >= end) return [];
  return [...new Set(compact)].map((code) => ({ day: dayCodes[code], start, end, startDate: meeting.startDate, endDate: meeting.endDate }));
}

export function adaptPlannerSemester(semester: PlannerSemester, publishedTerms: ReadonlySet<string>): Plan {
  const termCode = plannerTermCode(semester);
  const published = publishedTerms.has(termCode);
  const courses: Course[] = semester.courses.map((course) => {
    const scheduled = published && course.status === "scheduled" && course.termCode === termCode && !!course.crn?.trim();
    const code = course.code.trim().toUpperCase().replace(/\s+/g, " ");
    const meetings = scheduled ? course.meetings.flatMap(adaptMeeting) : [];
    return { code, name: course.name, sectionId: scheduled ? `${termCode}:${course.crn}` : null, section: scheduled ? course.section : null, meetings };
  });
  return { published, courses };
}

export function adaptPlannerPlans(semesters: readonly PlannerSemester[], publishedTerms: ReadonlySet<string>): Plans {
  const plans: Plans = {};
  for (const semester of semesters) {
    const key: Semester = `${semester.term} ${semester.year}`;
    plans[key] = adaptPlannerSemester(semester, publishedTerms);
  }
  return plans;
}
