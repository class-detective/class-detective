
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get request parameters
    const termCode = searchParams.get("termCode") || "202730";
    const subjectCode = searchParams.get("subjectCode") || "ECE";
    const campusCode = searchParams.get("campusCode") || "MAN";

    // Common UH API request headers
    const headers = {
      Accept: "*/*",
      Referer: `https://www.sis.hawaii.edu:9350/crseavail/${termCode}/${campusCode}/${subjectCode}`,
      "X-Recaptcha-Token": "undefined",
    };

    // Build course description API URL
    const courseUrl = new URL(
      "https://www.sis.hawaii.edu:9350/crseavail/api/course-desc"
    );

    courseUrl.searchParams.set("termCode", termCode);
    courseUrl.searchParams.set("subjectCode", subjectCode);
    courseUrl.searchParams.set("campusCode", campusCode);

    // Build instructor information API URL
    const instructorUrl = new URL(
      "https://www.sis.hawaii.edu:9350/crseavail/api/base-section"
    );

    instructorUrl.searchParams.set("termCode", termCode);
    instructorUrl.searchParams.set("subjectCode", subjectCode);
    instructorUrl.searchParams.set("campusCode", campusCode);

    // Fetch both APIs at the same time
    const [courseResponse, instructorResponse] = await Promise.all([
      fetch(courseUrl.toString(), {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetch(instructorUrl.toString(), {
        method: "GET",
        headers,
        cache: "no-store",
      }),
    ]);

    // Check for errors
    if (!courseResponse.ok) {
      throw new Error(
        `Course API failed: ${courseResponse.status}`
      );
    }

    if (!instructorResponse.ok) {
      throw new Error(
        `Instructor API failed: ${instructorResponse.status}`
      );
    }

    // Convert responses to JSON
    const courseData = await courseResponse.json();
    const instructorData = await instructorResponse.json();

    // Make sure the responses are arrays
    const courses = Array.isArray(courseData)
      ? courseData
      : [courseData];

    const instructors = Array.isArray(instructorData)
      ? instructorData
      : [instructorData];

    // Organize instructors by CRN
    const instructorMap = new Map();

    for (const instructor of instructors) {
      const crn = instructor.ssbsectCrn;

      if (!crn) continue;

      const firstName = instructor.spridenFirstName || "";
      const lastName = instructor.spridenLastName || "";

      const fullName = `${firstName} ${lastName}`.trim();

      if (!instructorMap.has(crn)) {
        instructorMap.set(crn, []);
      }

      if (
        fullName &&
        !instructorMap.get(crn).some(
          (existing: { name: string }) =>
            existing.name === fullName
        )
      ) {
        instructorMap.get(crn).push({
          name: fullName,
          email: instructor.goremalEmailAddress || null,
        });
      }
    }

    // Combine course and instructor information
    const combinedCourses = courses.map((course) => {
      const crn =
        course.ssbsectCrn1 || course.ssbsectCrn;

      return {
        ...course,
        instructors: instructorMap.get(crn) || [],
      };
    });

    // Return combined information
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
