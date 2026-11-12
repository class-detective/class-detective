
"use client";

import { useEffect, useState } from "react";

interface Instructor {
  name: string;
  email?: string | null;
}

interface Course {
  key: string;
  description: string;
  crn: string;
  section: string;
  instructors: Instructor[];
}

export default function GetClasses() {
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

        const data = await response.json();

        const courseList: Course[] = data
          .map((item: any) => {
            const subject = item.subjCode;

            const number = (
              item.crseNumb || item.ssbsectCrseNumb1 || ""
            ).replace(/0$/, "");

            const description = (item.textNarrative || "")
              .replace(/\s+/g, " ")
              .trim();

            if (!subject || !number) return null;

            return {
              key: `${subject} ${number}`,
              description,
              crn: item.ssbsectCrn1 || item.ssbsectCrn || "",
              section: item.ssbsectSeqNumb1 || item.ssbsectSeqNumb || "",
              instructors: item.instructors || [],
            };
          })
          .filter((course: Course | null): course is Course => course !== null);

        // Sort by course number, then section
        courseList.sort((a, b) => {
          const courseComparison = a.key.localeCompare(
            b.key,
            undefined,
            { numeric: true }
          );

          if (courseComparison !== 0) return courseComparison;

          return a.section.localeCompare(b.section);
        });

        setCourses(courseList);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    getCourses();
  }, []);

  if (loading) return <p>Loading courses...</p>;

  if (error) return <p>Error loading courses: {error}</p>;

  return (
    <div>
      <h2>Total course sections: {courses.length}</h2>

      {courses.map((course, index) => (
        <div key={`${course.crn}-${index}`}>
          <h3>{course.key}</h3>

          <p>{course.description}</p>

          <p>
            <strong>CRN:</strong> {course.crn || "Not available"}
          </p>

          <p>
            <strong>Section:</strong> {course.section || "Not available"}
          </p>

          <p>
            <strong>Professor:</strong>{" "}
            {course.instructors.length > 0
              ? course.instructors
                  .map((instructor) => instructor.name)
                  .join(", ")
              : "Not available"}
          </p>
          <br></br>
        </div>
      ))}
    </div>
  );
}
