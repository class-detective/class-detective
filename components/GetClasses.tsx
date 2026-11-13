
"use client";

import { useEffect, useState } from "react";

interface Instructor {
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Attribute {
  code: string;
  description: string;
}

interface Meeting {
  days: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  building: string;
  room: string;
  meetingType: string;
}

interface Course {
  subject: string;
  courseNumber: string;
  title: string;
  description: string;

  crn: string;
  section: string;
  credits: number | string | null;

  attributes: Attribute[];
  instructors: Instructor[];
  meetings: Meeting[];

  seatsAvailable: number | null;
  enrollment: number | null;
  maximumEnrollment: number | null;
  waitlistAvailable: number | null;
  waitlistCount: number | null;
}

export default function GetClasses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getCourses() {
      try {
        const response = await fetch("/api/courses");

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data: Course[] = await response.json();

        // Remove the extra trailing zero from course numbers.
        const courseList = data.map((course) => ({
          ...course,
          courseNumber: course.courseNumber.replace(/0$/, ""),
        }));

        courseList.sort((a, b) => {
          const courseComparison = (
            `${a.subject} ${a.courseNumber}`
          ).localeCompare(
            `${b.subject} ${b.courseNumber}`,
            undefined,
            { numeric: true }
          );

          if (courseComparison !== 0) {
            return courseComparison;
          }

          return a.section.localeCompare(b.section);
        });

        setCourses(courseList);

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    getCourses();
  }, []);

  if (loading) return <p>Loading courses...</p>;

  if (error) return <p>Error loading courses: {error}</p>;
  console.log(courses);
  return (
    <div>
      <h2>Total course sections: {courses.length}</h2>

      {courses.map((course, index) => (
        <div key={`${course.crn}-${index}`}>
          <h3>
            <strong>Course: </strong>
            {course.subject} {course.courseNumber}
            {course.title ? ` - ${course.title}` : ""}
          </h3>

          <p>
            <strong>Description: </strong>
            {course.description || "Not available"}
          </p>

          <p>
            <strong>Credits: </strong>
            {course.credits ?? "Not available"}
          </p>

          <p>
            <strong>CRN: </strong>
            {course.crn || "Not available"}
          </p>

          <p>
            <strong>Section: </strong>
            {course.section || "Not available"}
          </p>

          <p>
            <strong>Professor: </strong>
            {course.instructors.length > 0
              ? course.instructors
                  .map((instructor) =>
                    `${instructor.firstName} ${instructor.lastName}`.trim()
                  )
                  .join(", ")
              : "Not available"}
          </p>

          <p>
            <strong>Attributes: </strong>
            {course.attributes?.length
              ? course.attributes
                  .map((attribute) =>
                    `${attribute.code} - ${attribute.description}`
                  )
                  .join(", ")
              : "None"}
          </p>
          <p>
            <strong>Seats Available: </strong>
            {course.seatsAvailable ?? "Not available"}
          </p>

          <p>
            <strong>Enrollment: </strong>
            {course.enrollment ?? "Not available"} /{" "}
            {course.maximumEnrollment ?? "Not available"}
          </p>

          <p>
            <strong>Waitlist: </strong>
            {course.waitlistCount ?? "Not available"} enrolled;{" "}
            {course.waitlistAvailable ?? "Not available"} available
          </p>

          <h4>Meeting Schedule</h4>

          {course.meetings.length > 0 ? (
            course.meetings.map((meeting, meetingIndex) => (
              <div key={meetingIndex}>
                <p>
                  <strong>Days: </strong>
                  {meeting.days || "Not available"}
                </p>

                <p>
                  <strong>Time: </strong>
                  {meeting.startTime && meeting.endTime
                    ? `${meeting.startTime} - ${meeting.endTime}`
                    : "Not available"}
                </p>

                <p>
                  <strong>Dates: </strong>
                  {meeting.startDate} - {meeting.endDate}
                </p>

                <p>
                  <strong>Location: </strong>
                  {meeting.building} {meeting.room}
                </p>

                <p>
                  <strong>Meeting Type: </strong>
                  {meeting.meetingType || "Not available"}
                </p>
              </div>
            ))
          ) : (
            <p>No meeting information available.</p>
          )}

          <hr />
        </div>
      ))}
    </div>
  );
}