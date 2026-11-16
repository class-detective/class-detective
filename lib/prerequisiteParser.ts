
export type Prerequisite =
  | {
      type: "COURSE";
      subject: string;
      courseNumber: string;
    }
  | {
      type: "AND" | "OR";
      requirements: Prerequisite[];
    }
  | {
      type: "CONSENT";
    }
  | {
      type: "NO_REQUIREMENT";
    }
  | {
      type: "STANDING";
      level: "JUNIOR" | "SENIOR" | "GRADUATE";
    }
  | {
      type: "CONCURRENT";
      requirement: Prerequisite;
    }
  | {
      type: "REVIEW";
      description: string;
    };

interface CourseInfo {
  subject: string;
  courseNumber: string;
  description: string;
}

export function parsePrerequisites(
  course: CourseInfo
): Prerequisite | null {
  const description = course.description;

  if (!description) return null;

  // Find the prerequisite section.
  const match = description.match(
    /\b(?:Pre|Prerequisite):\s*([\s\S]*?)(?:\.|$)/i
  );

  // Find academic standing requirements that appear before
  // the prerequisite section.
  const textBeforePrerequisites = match
    ? description.slice(0, match.index)
    : description;

  const standingMatch = textBeforePrerequisites.match(
    /\b(graduate|senior|junior)\s+standing(?:\s+or\s+higher)?\b/i
  );

  let standingRequirement: Prerequisite | null = null;

  if (standingMatch) {
    standingRequirement = {
      type: "STANDING",
      level: standingMatch[1].toUpperCase() as
        | "JUNIOR"
        | "SENIOR"
        | "GRADUATE",
    };
  }

  // No prerequisite section.
  if (!match) {
    return standingRequirement;
  }

  let prerequisiteText = match[1].trim();

  // Recommended experience is not a required prerequisite.
  if (/^Recommended\s*:/i.test(prerequisiteText)) {
    return standingRequirement || {
      type: "NO_REQUIREMENT",
    };
  }

  // Normalize special UH prerequisite notation.
  prerequisiteText = prerequisiteText
    .replace(
      /\bany\s+110\s*\(\s*alpha\s*\)/gi,
      "ANY_110_ALPHA"
    )
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")

    // Mark the preceding parenthesized requirement as
    // something that may be taken concurrently.
    .replace(
      /\(\s*or\s+concurrent\s*\)/gi,
      " CONCURRENT "
    )

    // Commas separate required groups unless followed by
    // an explicit AND or OR.
    .replace(/,\s*(?=(?:and|or)\b)/gi, " ")
    .replace(/,/g, " AND ")

    // Semicolons are treated as separators.
    .replace(/;/g, " ");

  const tokens =
    prerequisiteText.match(
      /ANY_110_ALPHA|\b(?:and|or|consent|graduate\s+standing|junior\s+standing(?:\s+or\s+higher)?|senior\s+standing(?:\s+or\s+higher)?|concurrent)\b|[A-Za-z]+\s*\d+[A-Za-z]*|\d+[A-Za-z]*|[A-Za-z]+|[()]/gi
    ) || [];

  let position = 0;

  // Default subject is the department of the course being evaluated.
  let lastSubject = course.subject;

  function parsePrimary(): Prerequisite {
    const token = tokens[position];

    if (!token) {
      throw new Error("Unexpected end of prerequisite.");
    }

    let result: Prerequisite;

    // Handle parentheses.
    if (token === "(") {
      position++;

      // Save the subject before entering this group.
      const previousSubject = lastSubject;

      result = parseExpression();

      if (tokens[position] !== ")") {
        throw new Error("Missing closing parenthesis.");
      }

      position++;

      // Restore subject inheritance after leaving the group.
      lastSubject = previousSubject;
    } else {
      position++;

      const lowerToken = token.toLowerCase();

      // Instructor consent.
      if (lowerToken === "consent") {
        result = { type: "CONSENT" };
      }

      // Academic standing.
      else if (
        lowerToken === "graduate standing" ||
        lowerToken === "junior standing" ||
        lowerToken === "junior standing or higher" ||
        lowerToken === "senior standing" ||
        lowerToken === "senior standing or higher"
      ) {
        const level:
          | "JUNIOR"
          | "SENIOR"
          | "GRADUATE" =
          lowerToken.startsWith("graduate")
            ? "GRADUATE"
            : lowerToken.startsWith("senior")
              ? "SENIOR"
              : "JUNIOR";

        result = {
          type: "STANDING",
          level,
        };
      }

      // Special notation that needs further interpretation.
      else if (lowerToken === "any_110_alpha") {
        result = {
          type: "REVIEW",
          description: "Any 110 (Alpha) course",
        };
      }

      // Course requirement.
      else {
        const courseMatch = token.match(
          /^([A-Za-z]+)?\s*(\d+[A-Za-z]*)$/i
        );

        if (courseMatch) {
          const subject = courseMatch[1]?.toUpperCase();

          if (subject) {
            lastSubject = subject;
          }

          result = {
            type: "COURSE",
            subject: lastSubject,
            courseNumber: courseMatch[2],
          };
        } else {
          // Preserve unknown requirements instead of silently
          // treating them as satisfied.
          result = {
            type: "REVIEW",
            description: token,
          };
        }
      }
    }

    // Handle a concurrent-enrollment qualifier following
    // a parenthesized prerequisite group.
    if (tokens[position]?.toLowerCase() === "concurrent") {
      position++;

      result = {
        type: "CONCURRENT",
        requirement: result,
      };
    }

    return result;
  }

  // AND has higher precedence than OR.
  function parseAnd(): Prerequisite {
    const requirements: Prerequisite[] = [parsePrimary()];

    while (tokens[position]?.toLowerCase() === "and") {
      position++;
      requirements.push(parsePrimary());
    }

    return requirements.length === 1
      ? requirements[0]
      : {
          type: "AND",
          requirements,
        };
  }

  function parseExpression(): Prerequisite {
    const requirements: Prerequisite[] = [parseAnd()];

    while (tokens[position]?.toLowerCase() === "or") {
      position++;
      requirements.push(parseAnd());
    }

    return requirements.length === 1
      ? requirements[0]
      : {
          type: "OR",
          requirements,
        };
  }

  try {
    const result =
      tokens.length > 0
        ? parseExpression()
        : {
            type: "NO_REQUIREMENT" as const,
          };

    // If some words could not be interpreted, send the entire
    // prerequisite description for manual review.
    if (position !== tokens.length) {
      return {
        type: "REVIEW",
        description: prerequisiteText,
      };
    }

    // Combine standing requirements with course prerequisites.
    if (standingRequirement) {
      return {
        type: "AND",
        requirements: [standingRequirement, result],
      };
    }

    return result;
  } catch (error) {
    console.error(
      `Prerequisite parsing error for ${course.subject} ${course.courseNumber}:`,
      error
    );

    // Return a review result instead of breaking the course search.
    return {
      type: "REVIEW",
      description: prerequisiteText,
    };
  }
}
