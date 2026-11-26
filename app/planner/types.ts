export type Term = "Spring" | "Summer" | "Fall";

export type Meeting = {
  days: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  building: string;
  room: string;
  meetingType: string;
};

export type ScheduledCourse = {
  status: "scheduled";
  termCode: string;
  crn: string;
  section: string;
  code: string;
  name: string;
  credits: number;
  colorIndex?: number;
  instructors: string[];
  meetings: Meeting[];
};

export type ProvisionalCourse = {
  status: "provisional";
  termCode: string;
  referenceTermCode: string;
  crn: null;
  section: null;
  code: string;
  name: string;
  credits: number;
  colorIndex?: number;
  instructors: [];
  meetings: [];
};

export type PlannedCourse = ScheduledCourse | ProvisionalCourse;

export type SemesterPlan = {
  term: Term;
  year: number;
  courses: PlannedCourse[];
};
