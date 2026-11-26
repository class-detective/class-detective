export type TranscriptCourse = {
  term: string;
  subject: string;
  courseNumber: string;
  title: string;
  level: string;
  credits: number;
  grade: string | null;
  status: "in_progress" | "completed";
};

export type Transcript = {
  schemaVersion: "1.0";
  student: { firstName: string; lastName: string; studentId: string };
  institution: string;
  courses: TranscriptCourse[];
};

export function convertCsvToTranscript(text: string): Transcript;
