
import type { Prerequisite } from "./prerequisiteParser";

export type EligibilityStatus =
  | "eligible"
  | "not_eligible"
  | "pending"
  | "needs_review"
  | "need_approval";

export interface TranscriptCourse {
  subject: string;
  courseNumber: string;
  grade: string | null;
  status: string;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
}

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

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function uniqueReasons(reasons: string[]): string[] {
  return [...new Set(reasons)];
}

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

  const passed = matchingCourses.some(
    (course) =>
      normalizeStatus(course.status) === "completed" &&
      course.grade !== null &&
      passingGrades.has(course.grade.trim().toUpperCase())
  );

  if (passed) {
    return {
      status: "eligible",
      reasons: [`Completed ${subject} ${courseNumber} with a passing grade`],
    };
  }

  const inProgress = matchingCourses.some(
    (course) => normalizeStatus(course.status) === "in_progress"
  );

  if (inProgress) {
    return {
      status: "pending",
      reasons: [`${subject} ${courseNumber} is currently in progress`],
    };
  }

  const unsuccessful = matchingCourses.some(
    (course) =>
      normalizeStatus(course.status) === "completed" &&
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
// Every requirement must be satisfied.
//
// Priority:
// 1. not_eligible
// 2. needs_review
// 3. pending
// 4. need_approval
// 5. eligible
function combineAnd(
  results: EligibilityResult[]
): EligibilityResult {
  const unresolvedResults = results.filter(
    (result) => result.status !== "eligible"
  );

  if (results.some((result) => result.status === "not_eligible")) {
    return {
      status: "not_eligible",
      reasons: uniqueReasons(
        unresolvedResults.flatMap((result) => result.reasons)
      ),
    };
  }

  if (results.some((result) => result.status === "needs_review")) {
    return {
      status: "needs_review",
      reasons: uniqueReasons(
        unresolvedResults.flatMap((result) => result.reasons)
      ),
    };
  }

  if (results.some((result) => result.status === "pending")) {
    return {
      status: "pending",
      reasons: uniqueReasons(
        unresolvedResults.flatMap((result) => result.reasons)
      ),
    };
  }

  if (results.some((result) => result.status === "need_approval")) {
    return {
      status: "need_approval",
      reasons: uniqueReasons(
        unresolvedResults.flatMap((result) => result.reasons)
      ),
    };
  }

  return {
    status: "eligible",
    reasons: ["All required courses have been completed successfully"],
  };
}

// Combine results for OR requirements.
// Only one alternative needs to be satisfied.
//
// An in-progress alternative can still satisfy the requirement.
// Do not treat all alternatives as independently required courses.
function combineOr(
  results: EligibilityResult[]
): EligibilityResult {
  const eligible = results.find(
    (result) => result.status === "eligible"
  );

  if (eligible) {
    return eligible;
  }

  const pending = results.filter(
    (result) => result.status === "pending"
  );

  if (pending.length > 0) {
    return {
      status: "pending",
      reasons: uniqueReasons(
        pending.flatMap((result) => result.reasons)
      ),
    };
  }

  const needsReview = results.filter(
    (result) => result.status === "needs_review"
  );

  if (needsReview.length > 0) {
    return {
      status: "needs_review",
      reasons: uniqueReasons(
        needsReview.flatMap((result) => result.reasons)
      ),
    };
  }

  if (results.some((result) => result.status === "need_approval")) {
    return {
      status: "need_approval",
      reasons: [
        "The other prerequisite alternatives have not been satisfied. Instructor or department consent can be used instead.",
      ],
    };
  }

  // None of the alternatives is satisfied.
  // Do not list every missing alternative as if all were required.
  const failed = results.some((result) =>
    result.reasons.some((reason) =>
      reason.includes("does not have a passing grade")
    )
  );

  return {
    status: "not_eligible",
    reasons: [
      failed
        ? "None of the alternative prerequisite courses have been satisfied with a passing grade."
        : "None of the alternative prerequisite courses have been satisfied.",
    ],
  };
}

// Checks whether a manual-review requirement is mandatory within
// a concurrent group.
//
// For AND, every branch is required, so any manual-review requirement
// is mandatory.
//
// For OR, another branch may be enough, so every branch would need
// manual review before review is unavoidable.
function hasMandatoryReview(
  prerequisite: Prerequisite
): boolean {
  switch (prerequisite.type) {
    case "STANDING":
    case "REVIEW":
      return true;

    case "AND":
      return prerequisite.requirements.some(hasMandatoryReview);

    case "OR":
      return prerequisite.requirements.every(hasMandatoryReview);

    case "CONCURRENT":
      return hasMandatoryReview(prerequisite.requirement);

    default:
      return false;
  }
}

function evaluateConcurrent(
  requirement: Prerequisite,
  transcript: TranscriptCourse[]
): EligibilityResult {
  const result = evaluatePrerequisite(requirement, transcript);

  if (result.status === "eligible") {
    return result;
  }

  if (result.status === "pending") {
    if (hasMandatoryReview(requirement)) {
      return {
        status: "needs_review",
        reasons: [
          ...result.reasons,
          "Concurrent enrollment may be permitted, but another requirement in this group must be manually verified",
        ],
      };
    }

    return {
      status: "eligible",
      reasons: [
        ...result.reasons,
        "Concurrent enrollment is permitted for this prerequisite",
      ],
    };
  }

  // A failed course cannot automatically be waived by concurrent enrollment.
  if (
    result.status === "not_eligible" &&
    result.reasons.some((reason) =>
      reason.includes("does not have a passing grade")
    )
  ) {
    return result;
  }

  // Missing or uncertain prerequisites need manual confirmation.
  return {
    status: "needs_review",
    reasons: [
      ...result.reasons,
      "This prerequisite may be taken concurrently, but concurrent enrollment must be verified",
    ],
  };
}

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
        status: "need_approval",
        reasons: ["Instructor or department consent is required"],
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

export function checkEligibility(
  prerequisite: Prerequisite,
  transcript: TranscriptCourse[]
): EligibilityResult {
  return evaluatePrerequisite(prerequisite, transcript);
}
