
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

function tokenize(text: string): string[] {
  const pattern =
    /\b(?:and|or|consent)\b|ANY_110_ALPHA|AGGREGATE_REQUIREMENT|JUNIOR_STANDING|SENIOR_STANDING|GRADUATE_STANDING|CONCURRENT|[A-Za-z]+\s*\d+[A-Za-z]?|\d+[A-Za-z]?|[A-Za-z_]+|[()]/gi;

  return (text.match(pattern) || []).map((token) => token.trim());
}

function combine(
  type: "AND" | "OR",
  requirements: Prerequisite[]
): Prerequisite {
  if (requirements.length === 1) {
    return requirements[0];
  }

  return { type, requirements };
}

export function parsePrerequisites(
  course: CourseInfo
): Prerequisite | null {
  const description = course.description;

  if (!description?.trim()) {
    return null;
  }

  // Find the prerequisite section.
  // Stop at the final period, but allow punctuation inside the expression.
  const match = description.match(
    /\b(?:Pre|Prerequisite):\s*([\s\S]*?)(?=\.\s|\.?$)/i
  );

  const textBeforePrerequisites = match
    ? description.slice(0, match.index ?? 0)
    : description;

  const prefixRequirements: Prerequisite[] = [];

  // Detect standing requirements before the prerequisite section.
  const standingRegex =
    /\b(graduate|senior|junior)\s+standing(?:\s+or\s+higher)?\b/gi;

  let standingMatch: RegExpExecArray | null;

  while ((standingMatch = standingRegex.exec(textBeforePrerequisites))) {
    prefixRequirements.push({
      type: "STANDING",
      level: standingMatch[1].toUpperCase() as
        | "JUNIOR"
        | "SENIOR"
        | "GRADUATE",
    });
  }

  // Detect major restrictions without assuming a specific major.
  const majorRegex =
    /\b([A-Za-z][A-Za-z &'-]*?)\s+majors?\s+only\b/gi;

  let majorMatch: RegExpExecArray | null;

  while ((majorMatch = majorRegex.exec(textBeforePrerequisites))) {
    prefixRequirements.push({
      type: "REVIEW",
      description: `${majorMatch[1].trim()} majors only`,
    });
  }

  if (!match) {
    return prefixRequirements.length > 0
      ? combine("AND", prefixRequirements)
      : null;
  }

  let prerequisiteText = match[1].trim();

  // Recommended courses are not mandatory prerequisites.
  if (/^Recommended\s*:/i.test(prerequisiteText)) {
    return prefixRequirements.length > 0
      ? combine("AND", prefixRequirements)
      : { type: "NO_REQUIREMENT" };
  }

  // Store aggregate requirement descriptions separately.
  // This works with any subject code.
  const aggregateDescriptions: string[] = [];

  prerequisiteText = prerequisiteText.replace(
    /\b(?:at\s+least\s+)?two\s+(\d{3})[- ]level\s+([A-Za-z]+)\s+(?:classes|courses)\b/gi,
    (_fullMatch, level: string, subject: string) => {
      aggregateDescriptions.push(
        `At least two ${level}-level ${subject.toUpperCase()} classes`
      );

      return " AGGREGATE_REQUIREMENT ";
    }
  );

  // Normalize square brackets and special phrases.
  prerequisiteText = prerequisiteText
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(
      /\bany\s+110\s*\(\s*alpha\s*\)/gi,
      " ANY_110_ALPHA "
    )
    .replace(/\(\s*or\s+concurrent\s*\)/gi, " CONCURRENT ");

  // A semicolon followed by "or" represents ONE OR operator.
  // Consume both the semicolon and the word "or".
  prerequisiteText = prerequisiteText.replace(
    /;\s*or\b/gi,
    " OR "
  );

  // Remaining semicolons and commas separate AND requirements.
  prerequisiteText = prerequisiteText
    .replace(/;/g, " AND ")
    .replace(/,\s*(?=(?:and|or)\b)/gi, " ")
    .replace(/,/g, " AND ");

  // Convert standing phrases into single tokens.
  prerequisiteText = prerequisiteText
    .replace(
      /\bjunior\s+standing(?:\s+or\s+higher)?\b/gi,
      " JUNIOR_STANDING "
    )
    .replace(
      /\bsenior\s+standing(?:\s+or\s+higher)?\b/gi,
      " SENIOR_STANDING "
    )
    .replace(
      /\bgraduate\s+standing(?:\s+or\s+higher)?\b/gi,
      " GRADUATE_STANDING "
    );

  const tokens = tokenize(prerequisiteText);

  let position = 0;
  let lastSubject = course.subject.toUpperCase();
  let aggregateIndex = 0;

  function parsePrimary(): Prerequisite {
    const token = tokens[position];

    if (!token) {
      throw new Error("Unexpected end of prerequisite.");
    }

    let result: Prerequisite;

    if (token === "(") {
      position++;

      const previousSubject = lastSubject;

      result = parseExpression();

      if (tokens[position] !== ")") {
        console.error("Parenthesis parsing details:", {
          course: `${course.subject} ${course.courseNumber}`,
          tokens,
          position,
          currentToken: tokens[position],
          remainingTokens: tokens.slice(position),
          prerequisiteText,
        });

        throw new Error(
          `Expected closing parenthesis, found "${tokens[position] ?? "end of input"}"`
        );
      }

      position++;

      // Do not allow a subject inside a group to leak outside it.
      lastSubject = previousSubject;
    } else {
      position++;

      const lowerToken = token.toLowerCase();

      if (lowerToken === "consent") {
        result = { type: "CONSENT" };
      } else if (lowerToken === "junior_standing") {
        result = {
          type: "STANDING",
          level: "JUNIOR",
        };
      } else if (lowerToken === "senior_standing") {
        result = {
          type: "STANDING",
          level: "SENIOR",
        };
      } else if (lowerToken === "graduate_standing") {
        result = {
          type: "STANDING",
          level: "GRADUATE",
        };
      } else if (lowerToken === "any_110_alpha") {
        result = {
          type: "REVIEW",
          description: "Any 110 (Alpha) course",
        };
      } else if (lowerToken === "aggregate_requirement") {
        result = {
          type: "REVIEW",
          description:
            aggregateDescriptions[aggregateIndex++] ??
            "Aggregate course requirement",
        };
      } else {
        const courseMatch = token.match(
          /^([A-Za-z]+)\s*(\d+[A-Za-z]?)$/i
        );

        const numberOnlyMatch = token.match(
          /^(\d+[A-Za-z]?)$/i
        );

        if (courseMatch) {
          lastSubject = courseMatch[1].toUpperCase();

          result = {
            type: "COURSE",
            subject: lastSubject,
            courseNumber: courseMatch[2].toUpperCase(),
          };
        } else if (numberOnlyMatch) {
          result = {
            type: "COURSE",
            subject: lastSubject,
            courseNumber: numberOnlyMatch[1].toUpperCase(),
          };
        } else {
          result = {
            type: "REVIEW",
            description: token,
          };
        }
      }
    }

    // CONCURRENT applies to the immediately preceding course or group.
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

    return combine("AND", requirements);
  }

  function parseExpression(): Prerequisite {
    const requirements: Prerequisite[] = [parseAnd()];

    while (tokens[position]?.toLowerCase() === "or") {
      position++;
      requirements.push(parseAnd());
    }

    return combine("OR", requirements);
  }

  try {
    const parsedRequirement: Prerequisite =
      tokens.length > 0
        ? parseExpression()
        : { type: "NO_REQUIREMENT" };

    // Never silently accept an expression the parser did not understand.
    if (position !== tokens.length) {
      console.error("Unparsed prerequisite tokens:", {
        course: `${course.subject} ${course.courseNumber}`,
        tokens,
        position,
        remainingTokens: tokens.slice(position),
        prerequisiteText,
      });

      return {
        type: "REVIEW",
        description: prerequisiteText,
      };
    }

    if (prefixRequirements.length > 0) {
      return combine("AND", [
        ...prefixRequirements,
        parsedRequirement,
      ]);
    }

    return parsedRequirement;
  } catch (error) {
    console.error(
      `Prerequisite parsing error for ${course.subject} ${course.courseNumber}:`,
      error
    );

    return {
      type: "REVIEW",
      description: prerequisiteText,
    };
  }
}
