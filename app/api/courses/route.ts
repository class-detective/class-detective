
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url =
      "https://www.sis.hawaii.edu:9350/crseavail/api/course-desc?termCode=202730&subjectCode=ECE&campusCode=MAN";

    const response = await fetch(url, {
      headers: {
        Accept: "*/*",
        Referer: "https://www.sis.hawaii.edu:9350/crseavail/202730/MAN/ECE",
        "X-Recaptcha-Token": "undefined",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to retrieve courses." },
      { status: 500 }
    );
  }
}
