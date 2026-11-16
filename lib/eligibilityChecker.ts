
import type { Prerequisite } from "./prerequisiteParser";

// Possible eligibility results.
export type EligibilityStatus =
  | "eligible"
  | "not_eligible"
  | "pending"
  | "needs_review";

// Transcript course format.
export interface TranscriptCourse {
  subject: string;
  courseNumber: string;
  grade: string | null;
  status: string;
}

// Result returned by the eligibility checker.
export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
}

// Grades that satisfy the C-or-better requirement.
const passingGrades = new Set([
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
]);

function normalizeSubject(subject: string): string {
  return subject.trim().toUpperCase();
}

function normalizeCourseNumber(courseNumber: string): string {
  return courseNumber.trim().toUpperCase();
}

// Remove duplicate reasons while preserving their order.
function uniqueReasons(reasons: string[]): string[] {
  return [...new Set(reasons)];
}

// Check whether a student has completed a particular course.
function checkCourse(
  subject: string,
  courseNumber: string,
  transcript: TranscriptCourse[]
): EligibilityResult {
  const matchingCourses = transcript.filter(
    (course) =>
      normalizeSubject(course.subject) === normalizeSubject(subject) &&
      normalizeCourseNumber(course.courseNumber) ===
        normalizeCourseNumber(courseNumber)
  );

  if (matchingCourses.length === 0) {
    return {
      status: "not_eligible",
      reasons: [`Missing ${subject} ${courseNumber}`],
    };
  }

  // A passing completed attempt satisfies the prerequisite.
  const passed = matchingCourses.some(
    (course) =>
      course.status.toLowerCase() === "completed" &&
      course.grade !== null &&
      passingGrades.has(course.grade.trim().toUpperCase())
  );

  if (passed) {
    return {
      status: "eligible",
      reasons: [`Completed ${subject} ${courseNumber} with a passing grade`],
    };
  }

  // Check whether the course is currently being taken.
  const inProgress = matchingCourses.some(
    (course) => course.status.toLowerCase() === "in_progress"
  );

  if (inProgress) {
    return {
      status: "pending",
      reasons: [`${subject} ${courseNumber} is currently in progress`],
    };
  }

  // Check for completed courses without a passing grade.
  const unsuccessful = matchingCourses.some(
    (course) =>
      course.status.toLowerCase() === "completed" &&
      course.grade !== null &&
      !passingGrades.has(course.grade.trim().toUpperCase())
  );

  if (unsuccessful) {
    return {
      status: "not_eligible",
      reasons: [
        `${subject} ${courseNumber} does not have a passing grade of C or better`,
      ],
    };
  }

  return {
    status: "needs_review",
    reasons: [
      `${subject} ${courseNumber} has an unrecognized transcript status or grade`,
    ],
  };
}

// Combine results for AND requirements.

function combineAnd(
  results: EligibilityResult[]
): EligibilityResult {
  // A missing or failed required prerequisite takes priority.
  if (results.some((result) => result.status === "not_eligible")) {
    return {
      status: "not_eligible",
      reasons: uniqueReasons(
        results
          .filter((result) => result.status !== "eligible")
          .flatMap((result) => result.reasons)
      ),
    };
  }

  // An in-progress prerequisite makes the overall result pending.
  if (results.some((result) => result.status === "pending")) {
    return {
      status: "pending",
      reasons: uniqueReasons(
        results
          .filter((result) => result.status !== "eligible")
          .flatMap((result) => result.reasons)
      ),
    };
  }

  // Only use needs_review when no required course is missing or pending.
  if (results.some((result) => result.status === "needs_review")) {
    return {
      status: "needs_review",
      reasons: uniqueReasons(
        results
          .filter((result) => result.status !== "eligible")
          .flatMap((result) => result.reasons)
      ),
    };
  }

  return {
    status: "eligible",
    reasons: ["All required courses have been completed successfully"],
  };
}


// Combine results for OR requirements.
function combineOr(
  results: EligibilityResult[]
): EligibilityResult {
  // Any satisfied alternative is enough.
  const eligible = results.find(
    (result) => result.status === "eligible"
  );

  if (eligible) {
    return eligible;
  }

  // Collect reasons from every unsatisfied alternative.
  const reasons = uniqueReasons(
    results.flatMap((result) => result.reasons)
  );

  // An in-progress alternative could satisfy the requirement.
  if (results.some((result) => result.status === "pending")) {
    return {
      status: "pending",
      reasons,
    };
  }

  // An uncertain alternative still requires manual review.
  if (results.some((result) => result.status === "needs_review")) {
    return {
      status: "needs_review",
      reasons,
    };
  }

  return {
    status: "not_eligible",
    reasons: [
      "None of the alternative prerequisite courses have been satisfied",
      ...reasons,
    ],
  };
}

// Evaluate a prerequisite that may be satisfied through concurrent enrollment.
function evaluateConcurrent(
  requirement: Prerequisite,
  transcript: TranscriptCourse[]
): EligibilityResult {
  const result = evaluatePrerequisite(requirement, transcript);

  // A completed prerequisite already satisfies the requirement.
  if (result.status === "eligible") {
    return result;
  }

  // An in-progress prerequisite can satisfy a concurrent requirement.
  if (result.status === "pending") {
    return {
      status: "eligible",
      reasons: [
        ...result.reasons,
        "Concurrent enrollment is permitted for this prerequisite",
      ],
    };
  }

  // Missing or uncertain courses cannot automatically count as satisfied.
  return {
    status: "needs_review",
    reasons: [
      ...result.reasons,
      "This prerequisite may be taken concurrently, but concurrent enrollment must be verified",
    ],
  };
}

// Recursively evaluate the prerequisite tree.
function evaluatePrerequisite(
  prerequisite: Prerequisite,
  transcript: TranscriptCourse[]
): EligibilityResult {
  switch (prerequisite.type) {
    case "COURSE":
      return checkCourse(
        prerequisite.subject,
        prerequisite.courseNumber,
        transcript
      );

    case "CONSENT":
      return {
        status: "not_eligible",
        reasons: [
          "Instructor consent is an exception and does not automatically satisfy the prerequisite",
        ],
      };

    case "NO_REQUIREMENT":
      return {
        status: "eligible",
        reasons: ["No required prerequisite listed"],
      };

    case "STANDING":
      return {
        status: "needs_review",
        reasons: [
          `${prerequisite.level.toLowerCase()} standing must be verified`,
        ],
      };

    case "REVIEW":
      return {
        status: "needs_review",
        reasons: [
          `Prerequisite requires manual review: ${prerequisite.description}`,
        ],
      };

    case "CONCURRENT":
      return evaluateConcurrent(
        prerequisite.requirement,
        transcript
      );

    case "AND":
      return combineAnd(
        prerequisite.requirements.map((requirement) =>
          evaluatePrerequisite(requirement, transcript)
        )
      );

    case "OR":
      return combineOr(
        prerequisite.requirements.map((requirement) =>
          evaluatePrerequisite(requirement, transcript)
        )
      );
  }
}

// Main function used by the rest of the application.
export function checkEligibility(
  prerequisite: Prerequisite,
  transcript: TranscriptCourse[]
): EligibilityResult {
  return evaluatePrerequisite(prerequisite, transcript);
}
