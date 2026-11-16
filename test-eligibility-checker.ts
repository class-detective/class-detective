
import { readFileSync } from "node:fs";

import { parsePrerequisites } from "./lib/prerequisiteParser";
import {
  checkEligibility,
  type TranscriptCourse,
} from "./lib/eligibilityChecker";

// Load John's transcript.
const transcriptData = JSON.parse(
  readFileSync("./public/test-transcript.json", "utf8")
) as {
  courses: TranscriptCourse[];
};

const transcript = transcriptData.courses;

// All 12 courses to evaluate.
const testCourses = [
  {
    subject: "ICS",
    courseNumber: "211",
    description: "Pre: 111 or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "314",
    description:
      "Pre: (211 or ECE 205) and [241 or ECE 362 or (MATH 301 and 372)]; or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "141",
    description:
      "Includes logic, sets, functions, matrices, algorithmic concepts, mathematical reasoning, recursion, counting techniques, and probability theory. Pre: MATH 215 or 241 or 251A. FQ",
  },
  {
    subject: "ICS",
    courseNumber: "321",
    description:
      "Introduction to relational database systems, data modeling, query processing, transaction processing, storage, and indexing. Pre: (311 or ECE 367) and 314, or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "311",
    description:
      "(4 1-hr Lec) Design and correctness of algorithms, including divide-and-conquer, greedy and dynamic programming methods. Complexity analyses using recurrence relations, probabilistic methods, and NP-completeness. Applications to order statistics, disjoint sets, B-trees and balanced trees, graphs, network flows, and string matching. Pre: 211, and [(241 or ECE 362) and (MATH 216 or 242 or 252A)] or (MATH 301 and 372); or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "111",
    description:
      "Overview of the fundamentals of computer science emphasizing problem solving, algorithm development, implementation, and debugging/testing using an object-oriented programming language. Pre: Recommended: computer experience.",
  },
  {
    subject: "ICS",
    courseNumber: "312",
    description:
      "Machine organization, machine instructions, addressing modes, assembler language, subroutine linkage, linking to higher-level languages, interface to operating systems, introduction to assemblers, loaders and compilers. Pre: (212 or ECE 205) (or concurrent), (311 or ECE 367), and 314; or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "313",
    description:
      "Syntax, semantics, control structures, variable binding and scopes, data and control abstractions. Programming in functional (LISP) and logic (Prolog) programming styles. Pre: (212 or ECE 205), (311 or ECE 367), and 314; or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "485",
    description:
      "Students will team design, build, and demonstrate video games or related interactive entertainment environments and applications. Topics will include emerging computer science techniques relevant to the development of these types of environments. Junior standing or higher. Pre: any 110(Alpha) or 111 or CINE 215. (Cross-listed as CINE 487)",
  },
  {
    subject: "ICS",
    courseNumber: "621",
    description:
      "Analysis and design of algorithms: modeling, comparison, measures, applications. Pre: graduate standing, or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "623",
    description:
      "Taxonomy of security properties: methods for defining and proving security. Randomness, pseudorandomness, and indistinguishability. Functional encryption and obfuscation. Zero knowledge. Pre: graduate standing, or consent.",
  },
  {
    subject: "ICS",
    courseNumber: "664",
    description:
      "Studies of human performance in designing and using information systems. Emphasizes concepts and methodologies from human factors, psychology, and software engineering relating to human performance. Pre: graduate standing, or consent.",
  },
];

// Evaluate each course.
const summary: {
  course: string;
  status: string;
  reasons: string;
}[] = [];

for (const course of testCourses) {
  console.log("\n================================");
  console.log(`Testing ${course.subject} ${course.courseNumber}`);
  console.log("================================");

  const prerequisites = parsePrerequisites(course);

  if (!prerequisites) {
    console.log("Could not parse prerequisites.");

    summary.push({
      course: `${course.subject} ${course.courseNumber}`,
      status: "PARSER FAILED",
      reasons: "Could not parse prerequisite description",
    });

    continue;
  }

  const result = checkEligibility(prerequisites, transcript);

  console.log("Prerequisite tree:");
  console.log(JSON.stringify(prerequisites, null, 2));

  console.log("\nEligibility result:");
  console.log(JSON.stringify(result, null, 2));

  summary.push({
    course: `${course.subject} ${course.courseNumber}`,
    status: result.status,
    reasons: result.reasons.join("; "),
  });
}

// Print a summary of all courses.
console.log("\n================================");
console.log("ELIGIBILITY TEST SUMMARY");
console.log("================================");

console.table(summary);
