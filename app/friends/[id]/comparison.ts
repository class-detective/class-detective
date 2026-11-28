export const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof days)[number];
export type Semester = `${"Spring" | "Summer" | "Fall"} ${number}`;
export type Meeting = { day: Day; start: number; end: number; startDate?: string; endDate?: string };
export type Course = { code: string; name: string; sectionId: string | null; section?: string | null; meetings: Meeting[] };
export type Plan = { courses: Course[]; published: boolean };
export type Owner = "mine" | "friend" | "both";
export type Block = Meeting & { key: string; course: Course; owner: Owner; lane: number; lanes: number };
export type Gap = Meeting;

export function timeLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour % 24 < 12 ? "AM" : "PM"}`;
}

export function sameSection(a: Course, b: Course) {
  return a.sectionId !== null && a.sectionId === b.sectionId && a.code === b.code;
}

export function buildComparison(mine: Course[], friend: Course[], mode: Owner = "both") {
  const blocks: Block[] = [];
  const add = (courses: Course[], owner: "mine" | "friend") => {
    for (const [i, course] of courses.entries()) {
      for (const [j, meeting] of course.meetings.entries()) {
        if (!Number.isInteger(meeting.start) || !Number.isInteger(meeting.end) || meeting.start < 0 || meeting.end > 1440 || meeting.start >= meeting.end || !days.includes(meeting.day)) continue;
        const matching = mode === "both" && blocks.find((b) => b.owner === "mine" && owner === "friend" && sameSection(b.course, course) && b.day === meeting.day && b.start === meeting.start && b.end === meeting.end);
        if (matching) { matching.owner = "both"; continue; }
        if (blocks.some((b) => b.owner === owner && b.course === course && b.day === meeting.day && b.start === meeting.start && b.end === meeting.end)) continue;
        blocks.push({ ...meeting, course, owner, key: `${owner}-${i}-${j}`, lane: 0, lanes: 1 });
      }
    }
  };
  if (mode !== "friend") add(mine, "mine");
  if (mode !== "mine") add(friend, "friend");
  for (const day of days) {
    const ordered = blocks.filter((b) => b.day === day).sort((a, b) => a.start - b.start || a.end - b.end);
    let group: Block[] = [], ends: number[] = [], groupEnd = -1;
    const finish = () => { for (const block of group) block.lanes = ends.length; group = []; ends = []; groupEnd = -1; };
    for (const block of ordered) {
      if (block.start >= groupEnd) finish();
      let lane = ends.findIndex((end) => end <= block.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = block.end;
      block.lane = lane;
      group.push(block);
      groupEnd = Math.max(groupEnd, block.end);
    }
    finish();
  }
  const columns = days.filter((day, i) => i < 5 || blocks.some((b) => b.day === day));
  const firstHour = Math.min(480, ...blocks.map((b) => Math.floor(b.start / 60) * 60));
  const lastHour = Math.max(1020, ...blocks.map((b) => Math.ceil(b.end / 60) * 60));
  return { blocks, columns, firstHour, lastHour };
}

export function sharedGaps(mine: Course[], friend: Course[], minimum = 1): Gap[] {
  const minimumDuration = Math.max(1, minimum);
  const own = buildComparison(mine, [], "mine").blocks;
  const theirs = buildComparison([], friend, "friend").blocks;
  const gaps: Gap[] = [];
  for (const day of days) {
    const a = own.filter((b) => b.day === day), b = theirs.filter((block) => block.day === day);
    if (!a.length || !b.length) continue;
    const start = Math.max(Math.min(...a.map((m) => m.start)), Math.min(...b.map((m) => m.start)));
    const end = Math.min(Math.max(...a.map((m) => m.end)), Math.max(...b.map((m) => m.end)));
    if (end <= start) continue;
    let cursor = start;
    for (const m of [...a, ...b].sort((x, y) => x.start - y.start)) {
      if (m.end <= start || m.start >= end) continue;
      if (Math.min(m.start, end) - cursor >= minimumDuration) gaps.push({ day, start: cursor, end: Math.min(m.start, end) });
      cursor = Math.max(cursor, Math.min(m.end, end));
    }
    if (end - cursor >= minimumDuration) gaps.push({ day, start: cursor, end });
  }
  return gaps;
}

export function alignCourses(mine: Course[], friend: Course[]) {
  const usedMine = new Set<number>();
  const usedFriend = new Set<number>();
  const orderedMine: Course[] = [];
  const orderedFriend: Course[] = [];

  for (const matches of [sameSection, (a: Course, b: Course) => a.code === b.code]) {
    mine.forEach((course, index) => {
      if (usedMine.has(index)) return;
      const match = friend.findIndex((other, otherIndex) => !usedFriend.has(otherIndex) && matches(course, other));
      if (match === -1) return;
      usedMine.add(index);
      usedFriend.add(match);
      orderedMine.push(course);
      orderedFriend.push(friend[match]);
    });
  }

  return {
    mine: [...orderedMine, ...mine.filter((_, index) => !usedMine.has(index))],
    friend: [...orderedFriend, ...friend.filter((_, index) => !usedFriend.has(index))],
  };
}

