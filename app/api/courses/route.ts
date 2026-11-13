
import { NextResponse } from "next/server";

type ApiRecord = Record<string, unknown>;

function toRecords(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) {
    return data as ApiRecord[];
  }

  if (data && typeof data === "object") {
    return [data as ApiRecord];
  }

  return [];
}

function getString(
  item: ApiRecord,
  ...fields: string[]
): string {
  for (const field of fields) {
    const value = item[field];

    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }

  return "";
}

function formatTime(time: string): string {
  if (!time) return "";

  const normalized = time.padStart(4, "0");
  const hours = Number(normalized.slice(0, 2));
  const minutes = normalized.slice(2, 4);

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
}

function getDays(meeting: ApiRecord): string {
  return [
    meeting.monDay,
    meeting.tueDay,
    meeting.wedDay,
    meeting.thuDay,
    meeting.friDay,
    meeting.satDay,
    meeting.sunDay,
  ]
    .filter(Boolean)
    .map(String)
    .join("");
}

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

    const endpoints = [
      "section-counts",
      "courses",
      "course-desc",
      "base-section",
      "meetings",
      "section-attrib",
    ];

    // Request all six endpoints simultaneously.
    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        const url = new URL(
          `https://www.sis.hawaii.edu:9350/crseavail/api/${endpoint}`
        );

        url.searchParams.set("termCode", termCode);
        url.searchParams.set("subjectCode", subjectCode);
        url.searchParams.set("campusCode", campusCode);

        const response = await fetch(url.toString(), {
          method: "GET",
          headers,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `${endpoint} failed with status ${response.status}`
          );
        }

        return toRecords(await response.json());
      })
    );

    const [
      sectionData,
      courseData,
      descriptionData,
      instructorData,
      meetingData,
      attributeData,
    ] = results;

    // Helper for finding records by CRN.
    const getCrn = (item: ApiRecord) =>
      getString(
        item,
        "crn",
        "ssbsectCrn",
        "ssbsectCrn1"
      );

    // Create lookup maps for information that belongs to one section.
    const courseMap = new Map<string, ApiRecord>();
    const descriptionMap = new Map<string, ApiRecord>();

    for (const item of courseData) {
      const crn = getCrn(item);
      if (crn) courseMap.set(crn, item);
    }

    for (const item of descriptionData) {
      const crn = getCrn(item);
      if (crn) descriptionMap.set(crn, item);
    }

    // Group instructors by CRN.
    const instructorMap = new Map<string, {
      firstName: string;
      lastName: string;
      email: string | null;
    }[]>();

    for (const item of instructorData) {
      const crn = getCrn(item);
      if (!crn) continue;

      const firstName = getString(item, "spridenFirstName");
      const lastName = getString(item, "spridenLastName");

      if (!firstName && !lastName) continue;

      const instructor = {
        firstName,
        lastName,
        email: getString(item, "goremalEmailAddress") || null,
      };

      const existing = instructorMap.get(crn) || [];

      const alreadyExists = existing.some(
        (person) =>
          person.firstName === firstName &&
          person.lastName === lastName
      );

      if (!alreadyExists) {
        existing.push(instructor);
      }

      instructorMap.set(crn, existing);
    }

    // Group attributes by CRN.
    const attributeMap = new Map<string, {
      code: string;
      description: string;
    }[]>();

    for (const item of attributeData) {
      const crn = getCrn(item);
      if (!crn) continue;

      const code = getString(item, "attrCode", "code");
      const description = getString(item, "desc");

      const existing = attributeMap.get(crn) || [];

      if (
        code &&
        !existing.some((attribute) => attribute.code === code)
      ) {
        existing.push({ code, description });
      }

      attributeMap.set(crn, existing);
    }

    // Group meetings by CRN.
    const meetingMap = new Map<string, {
      days: string;
      startTime: string;
      endTime: string;
      startDate: string;
      endDate: string;
      building: string;
      room: string;
      meetingType: string;
    }[]>();

    for (const item of meetingData) {
      const crn = getCrn(item);
      if (!crn) continue;

      const meeting = {
        days: getDays(item),
        startTime: formatTime(getString(item, "beginTime")),
        endTime: formatTime(getString(item, "endTime")),
        startDate: getString(item, "startDate"),
        endDate: getString(item, "endDate"),
        building: getString(item, "bldgCode"),
        room: getString(item, "roomCode"),
        meetingType: getString(item, "mtypCode"),
      };

      const existing = meetingMap.get(crn) || [];
      existing.push(meeting);
      meetingMap.set(crn, existing);
    }

    // Combine everything into one record per section.
    const combinedCourses = sectionData.map((section) => {
      const crn = getCrn(section);

      const course = courseMap.get(crn) || {};
      const description = descriptionMap.get(crn) || {};

      return {
        subject: getString(section, "subjCode", "ssbsectSubjCode"),
        courseNumber: getString(section, "crseNumb", "ssbsectCrseNumb"),
        title: getString(course, "title"),
        description: getString(description, "textNarrative"),

        crn,
        section: getString(section, "seqNumb", "ssbsectSeqNumb"),

        credits:
          section.creditHrs ??
          section.totCreditHrs ??
          null,

        attributes: attributeMap.get(crn) || [],
        instructors: instructorMap.get(crn) || [],
        meetings: meetingMap.get(crn) || [],

        seatsAvailable: section.seatsAvail ?? null,
        enrollment: section.enrl ?? null,
        maximumEnrollment: section.maxEnrl ?? null,
        waitlistAvailable: section.waitAvail ?? null,
        waitlistCount: section.waitCount ?? null,
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
