import { isAsynchronous, schedule } from "./courseData";
import { getCourseColorIndex } from "./courseColors";
import type { Meeting, PlannedCourse, ScheduledCourse } from "./types";

export const week = [
  { code: "M", label: "Mon", name: "Monday" },
  { code: "T", label: "Tue", name: "Tuesday" },
  { code: "W", label: "Wed", name: "Wednesday" },
  { code: "R", label: "Thu", name: "Thursday" },
  { code: "F", label: "Fri", name: "Friday" },
  { code: "S", label: "Sat", name: "Saturday" },
  { code: "U", label: "Sun", name: "Sunday" },
];

export type ScheduleBlock = {
  course: ScheduledCourse;
  meeting: Meeting;
  day: string;
  start: number;
  end: number;
  lane: number;
  lanes: number;
  colorIndex: number;
  key: string;
};

function placeLanes(blocks: ScheduleBlock[]) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  let group: ScheduleBlock[] = [];
  let ends: number[] = [];
  let groupEnd = -1;
  function finish() {
    for (const block of group) block.lanes = ends.length;
    group = [];
    ends = [];
    groupEnd = -1;
  }
  for (const block of sorted) {
    if (block.start >= groupEnd) finish();
    let lane = ends.findIndex((end) => end <= block.start);
    if (lane === -1) lane = ends.length;
    ends[lane] = block.end;
    block.lane = lane;
    group.push(block);
    groupEnd = Math.max(groupEnd, block.end);
  }
  finish();
  return sorted;
}

export function buildSchedule(courses: PlannedCourse[]) {
  const scheduled = courses.filter((course): course is ScheduledCourse => course.status === "scheduled");
  const blocks: ScheduleBlock[] = [];
  const untimed: { course: ScheduledCourse; reason: string }[] = [];
  for (const [colorIndex, course] of scheduled.entries()) {
    const seen = new Set<string>();
    const missing: Meeting[] = [];
    for (const meeting of course.meetings) {
      const timing = schedule(meeting);
      if (!timing) {
        missing.push(meeting);
        continue;
      }
      for (const day of timing.weekdays) {
        const key = `${course.crn}-${day}-${timing.start}-${timing.end}-${meeting.startDate}-${meeting.endDate}`;
        if (seen.has(key)) continue;
        seen.add(key);
        blocks.push({ course, meeting, day, start: timing.start, end: timing.end, lane: 0, lanes: 1, colorIndex: getCourseColorIndex(course, colorIndex), key });
      }
    }
    if (missing.length || !course.meetings.length) {
      const asynchronous = missing.length > 0 && missing.every(isAsynchronous);
      untimed.push({ course, reason: asynchronous ? "Asynchronous meeting" : "Meeting time not listed" });
    }
  }
  const columns = week.filter((day, index) => index < 5 || blocks.some((block) => block.day === day.code));
  const firstHour = Math.min(8 * 60, ...blocks.map((block) => Math.floor(block.start / 60) * 60));
  const lastHour = Math.max(17 * 60, ...blocks.map((block) => Math.ceil(block.end / 60) * 60));
  const positioned = columns.flatMap((day) => placeLanes(blocks.filter((block) => block.day === day.code)));
  return { columns, blocks: positioned, untimed, firstHour, lastHour };
}

export function hourLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12} ${hour % 24 < 12 ? "AM" : "PM"}`;
}
