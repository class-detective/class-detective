
"use client";

import { useEffect, useState } from "react";
import useCourses from "@/components/useCourses";
import { parsePrerequisites } from "@/lib/prerequisiteParser";
import {
  checkEligibility,
  type TranscriptCourse,
  type EligibilityResult,
} from "@/lib/eligibilityChecker";

const PASSING_GRADES = new Set([
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
]);

export default function CourseEligibility() {
  const { courses, loading, error } = useCourses();

  const [transcript, setTranscript] = useState<TranscriptCourse[] | null>(
    null
  );
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const [transcriptError, setTranscriptError] = useState("");

  // Load transcript
  useEffect(() => {
    async function loadTranscript() {
      try {
        const response = await fetch("/test-transcript.json");

        if (!response.ok) {
          throw new Error("Could not load transcript.");
        }

        const transcriptData = await response.json();

        setTranscript(transcriptData.courses as TranscriptCourse[]);
      } catch (err) {
        setTranscriptError(
          err instanceof Error
            ? err.message
            : "Something went wrong loading the transcript."
        );
      } finally {
        setTranscriptLoading(false);
      }
    }

    loadTranscript();
  }, []);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Course retrieval error:", error);
    }

    if (transcriptError) {
      console.error("Transcript retrieval error:", transcriptError);
    }
  }, [error, transcriptError]);

  // Calculate eligibility and remove already-completed courses
  useEffect(() => {
    if (
      loading ||
      transcriptLoading ||
      !transcript ||
      error ||
      transcriptError
    ) {
      return;
    }

    if (courses.length === 0) {
      console.warn("No UH courses were retrieved.");
      return;
    }

    // Identify courses the student has already passed.
    const completedCourseKeys = new Set(
      transcript
        .filter((course) => {
          const grade = course.grade?.trim().toUpperCase();

          return (
            course.status?.toLowerCase() === "completed" &&
            grade !== undefined &&
            PASSING_GRADES.has(grade)
          );
        })
        .map(
          (course) =>
            `${course.subject.trim().toUpperCase()}-${course.courseNumber
              .trim()
              .toUpperCase()}`
        )
    );

    // Remove every section of courses already passed.
    const remainingCourses = courses.filter((course) => {
      const key = `${course.subject.trim().toUpperCase()}-${course.courseNumber
        .trim()
        .toUpperCase()}`;

      return !completedCourseKeys.has(key);
    });

    const eligibilityByCourse = new Map<string, EligibilityResult>();

    // Evaluate each unique course only once.
    for (const course of remainingCourses) {
      const key = `${course.subject.toUpperCase()}-${course.courseNumber.toUpperCase()}`;

      if (eligibilityByCourse.has(key)) continue;

      const description = course.description || "";
      const hasPrerequisites = /\b(?:Pre|Prerequisite):/i.test(description);

      let result: EligibilityResult;

      if (!hasPrerequisites) {
        result = {
          status: "eligible",
          reasons: ["No required prerequisite listed"],
        };
      } else {
        const prerequisites = parsePrerequisites(course);

        if (!prerequisites) {
          result = {
            status: "needs_review",
            reasons: [
              "The prerequisite description could not be interpreted automatically.",
            ],
          };
        } else {
          result = checkEligibility(prerequisites, transcript);
        }
      }

      eligibilityByCourse.set(key, result);
    }

    // Attach eligibility results to the remaining sections.
    const coursesWithEligibility = remainingCourses.map((course) => {
      const key = `${course.subject.toUpperCase()}-${course.courseNumber.toUpperCase()}`;

      return {
        ...course,
        eligibility: eligibilityByCourse.get(key)!,
      };
    });

    const needsReview = coursesWithEligibility.filter(
      (course) => course.eligibility.status === "needs_review"
    );

    const output = {
      courses: coursesWithEligibility,
      needsReview,
    };

    console.log(JSON.stringify(output, null, 2));

    console.log("Course sections retrieved:", courses.length);
    console.log("Already completed courses removed:", completedCourseKeys.size);
    console.log("Remaining course sections:", remainingCourses.length);
    console.log("Unique courses evaluated:", eligibilityByCourse.size);
    console.log("Courses needing review:", needsReview.length);
  }, [
    courses,
    loading,
    error,
    transcript,
    transcriptLoading,
    transcriptError,
  ]);

  return null;
}
