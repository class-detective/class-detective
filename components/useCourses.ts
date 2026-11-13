
"use client";

import { useEffect, useState } from "react";

interface Instructor {
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Attribute {
  code: string;
  description: string;
}

interface Meeting {
  days: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  building: string;
  room: string;
  meetingType: string;
}

interface Course {
  subject: string;
  courseNumber: string;
  title: string;
  description: string;
  crn: string;
  section: string;
  credits: number | string | null;
  attributes: Attribute[];
  instructors: Instructor[];
  meetings: Meeting[];
  seatsAvailable: number | null;
  enrollment: number | null;
  maximumEnrollment: number | null;
  waitlistAvailable: number | null;
  waitlistCount: number | null;
}

export default function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getCourses() {
      try {
        const response = await fetch("/api/courses");

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data: Course[] = await response.json();

        const courseList = data.map((course) => ({
          ...course,
          courseNumber: course.courseNumber.replace(/0$/, ""),
          attributes: course.attributes ?? [],
          instructors: course.instructors ?? [],
          meetings: course.meetings ?? [],
        }));

        courseList.sort((a, b) =>
          `${a.subject} ${a.courseNumber}`.localeCompare(
            `${b.subject} ${b.courseNumber}`,
            undefined,
            { numeric: true }
          )
        );

        setCourses(courseList);

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    getCourses();
  }, []);

  return { courses, loading, error };
}
