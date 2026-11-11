
"use client";

import { useEffect, useState } from "react";

interface Course {
  key: string;
  description: string;
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

        const courseMap = new Map<string, Course>();

        for (const item of data) {
          const subject = item.subjCode;
          const number = (item.crseNumb || item.ssbsectCrseNumb1 || "")
            .replace(/0$/, "");

          const description = (item.textNarrative || "")
            .replace(/\s+/g, " ")
            .trim();

          if (!subject || !number) continue;

          const key = `${subject} ${number}`;

          if (!courseMap.has(key)) {
            courseMap.set(key, { key, description });
          }
        }

        const sortedCourses = [...courseMap.values()].sort((a, b) =>
          a.key.localeCompare(b.key, undefined, { numeric: true })
        );

        setCourses(sortedCourses);
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
      <h2>Total unique courses: {courses.length}</h2>

      {courses.map((course) => (
        <div key={course.key}>
          <h3>{course.key}</h3>
          <p>{course.description}</p>
        </div>
      ))}
    </div>
  );
}
