
"use client";

import { useEffect, useState } from "react";
import useCourses from "@/components/useCourses";
import { parsePrerequisites } from "@/lib/prerequisiteParser";
import {
  checkEligibility,
  type TranscriptCourse,
  type EligibilityResult,
} from "@/lib/eligibilityChecker";

export default function CourseEligibility() {
  const { courses, loading, error } = useCourses();

  const [transcript, setTranscript] = useState<TranscriptCourse[] | null>(null);
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

  // Calculate eligibility
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

    const eligibilityByCourse = new Map<string, EligibilityResult>();

    for (const course of courses) {
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

    const coursesWithEligibility = courses.map((course) => {
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
