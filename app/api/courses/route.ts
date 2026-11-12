
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const termCode = searchParams.get("termCode") || "202730";
    const subjectCode = searchParams.get("subjectCode") || "ECE";
    const campusCode = searchParams.get("campusCode") || "MAN";

    const headers = {
      Accept: "*/*",
      Referer: `https://www.sis.hawaii.edu:9350/crseavail/${termCode}/${campusCode}/${subjectCode}`,
      "X-Recaptcha-Token": "undefined",
    };

    // Create the three API URLs
    const endpoints = [
      "course-desc",
      "base-section",
      "courses",
    ];

    const urls = endpoints.map((endpoint) => {
      const url = new URL(
        `https://www.sis.hawaii.edu:9350/crseavail/api/${endpoint}`
      );

      url.searchParams.set("termCode", termCode);
      url.searchParams.set("subjectCode", subjectCode);
      url.searchParams.set("campusCode", campusCode);

      return url.toString();
    });

    // Fetch all three endpoints
    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          method: "GET",
          headers,
          cache: "no-store",
        })
      )
    );

    // Check for failed requests
    for (const response of responses) {
      if (!response.ok) {
        throw new Error(`UH API failed: ${response.status}`);
      }
    }

    // Convert responses to JSON
    const [descriptionData, instructorData, courseData] =
      await Promise.all(responses.map((response) => response.json()));

    // Ensure all responses are arrays
    const descriptions = Array.isArray(descriptionData)
      ? descriptionData
      : [descriptionData];

    const instructors = Array.isArray(instructorData)
      ? instructorData
      : [instructorData];

    const courseSections = Array.isArray(courseData)
      ? courseData
      : [courseData];

    // Organize descriptions by CRN
    const descriptionMap = new Map();

    for (const item of descriptions) {
      const crn = item.ssbsectCrn1 || item.ssbsectCrn;

      if (crn) {
        descriptionMap.set(crn, item);
      }
    }

    // Organize instructors by CRN
    const instructorMap = new Map();

    for (const instructor of instructors) {
      const crn = instructor.ssbsectCrn;

      if (!crn) continue;

      const name = [
        instructor.spridenFirstName,
        instructor.spridenLastName,
      ]
        .filter(Boolean)
        .join(" ");

      if (!name) continue;

      if (!instructorMap.has(crn)) {
        instructorMap.set(crn, []);
      }

      const existing = instructorMap.get(crn);

      if (
        !existing.some(
          (person: { name: string; email: string | null }) =>
            person.name === name
        )
      ) {
        existing.push({
          name,
          email: instructor.goremalEmailAddress || null,
        });
      }
    }

    // Combine all information using CRN
    const combinedCourses = courseSections.map((section) => {
      const crn = section.ssbsectCrn1 || section.ssbsectCrn;

      const description = descriptionMap.get(crn) || {};

      return {
        ...section,
        title: section.title || description.title || "",
        textNarrative: description.textNarrative || "",
        instructors: instructorMap.get(crn) || [],
      };
    });

    return NextResponse.json(combinedCourses);

  } catch (error) {
    console.error("UH course retrieval error:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve course information.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
