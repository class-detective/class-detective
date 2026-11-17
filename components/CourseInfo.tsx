"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import useCourses from "@/components/useCourses";
import { parseCourseKey, splitDescription } from "@/lib/courseInfo";
import { formatCredits, groupSections } from "@/lib/courseSearch";

type Section = ReturnType<typeof useCourses>["courses"][number];

// /api/courses currently returns courses for term 202730.
const SEMESTER_LABEL = "Spring 2027";

export default function CourseInfo({
  params,
}: {
  params: Promise<{ courseKey: string }>;
}) {
  const { courseKey } = use(params);
  const wanted = parseCourseKey(courseKey);
  const { courses, loading, error } = useCourses();

  const course = useMemo(() => {
    const key = parseCourseKey(courseKey);
    if (!key) return null;
    return (
      groupSections(courses).find(
        (group) => group.subject === key.subject && group.courseNumber === key.courseNumber
      ) ?? null
    );
  }, [courses, courseKey]);

  return (
    <main className="w-full flex-1 bg-[#f0f6f1] px-5 py-10 text-[#16362e] sm:px-8 lg:px-12 lg:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#278447] hover:underline"
        >
          <span aria-hidden="true">←</span> Back to search
        </Link>

        {loading && <StatusMessage>Loading course…</StatusMessage>}

        {!loading && error && (
          <StatusMessage tone="error">
            We couldn&apos;t load course information right now. Please try again in a moment.
          </StatusMessage>
        )}

        {!loading && !error && !course && (
          <StatusMessage>
            {wanted
              ? `${wanted.subject} ${wanted.courseNumber} isn't offered in ${SEMESTER_LABEL}, or isn't in our course list yet.`
              : "That doesn't look like a course code."}{" "}
            <Link href="/courses" className="font-semibold text-[#278447] hover:underline">
              Browse all courses
            </Link>
          </StatusMessage>
        )}

        {!loading && !error && course && <CourseDetails course={course} />}
      </div>
    </main>
  );
}

function CourseDetails({
  course,
}: {
  course: ReturnType<typeof groupSections<Section>>[number];
}) {
  // Every section of a course carries the same description.
  const description = course.sections.find((s) => s.description)?.description ?? "";
  const { summary, prerequisites } = splitDescription(description);

  const attributes = uniqueBy(
    course.sections.flatMap((section) => section.attributes),
    (attribute) => attribute.code
  );

  return (
    <>
      <header className="mt-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#102e25] sm:text-4xl">
          {course.subject} {course.courseNumber}
          <span className="font-bold text-[#3d5f53]"> · {course.title}</span>
        </h1>

        {attributes.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Course attributes">
            {attributes.map((attribute) => (
              <li
                key={attribute.code}
                title={attribute.description}
                className="rounded-full border border-[#cfddd4] bg-white px-3 py-1 text-sm font-semibold text-[#2c5246]"
              >
                {attribute.description || attribute.code}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#2c4a40] sm:text-lg">
          {summary || "No description is listed for this course."}
        </p>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Card title="Course Information">
          <dl className="divide-y divide-[#e4ece7] text-sm sm:text-base">
            <InfoRow label="Credits" value={formatCredits(course.credits)} />
            <InfoRow label="Department" value={course.subject} />
            <InfoRow label="Semester" value={SEMESTER_LABEL} />
            <InfoRow
              label="Sections"
              value={`${course.sections.length} ${course.sections.length === 1 ? "section" : "sections"}`}
            />
            <InfoRow
              label="Seats open"
              value={course.seatsOpen > 0 ? String(course.seatsOpen) : "Full"}
            />
          </dl>
        </Card>

        <Card title="Prerequisites">
          {prerequisites ? (
            <p className="text-base leading-relaxed text-[#21443a]">{prerequisites}</p>
          ) : (
            <p className="text-base text-[#557166]">No prerequisites are listed.</p>
          )}
          <p className="mt-4 text-sm text-[#6b8479]">
            Course numbers without a department refer to {course.subject} courses.
          </p>
        </Card>
      </div>

      <section aria-labelledby="sections-title" className="mt-8">
        <h2 id="sections-title" className="text-xl font-extrabold text-[#102e25] sm:text-2xl">
          Sections
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[#dbe6df] bg-white shadow-[0_6px_20px_rgba(24,63,46,0.06)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f7fbf8] text-xs uppercase tracking-wide text-[#6b8479]">
              <tr>
                <th className="px-4 py-3 font-semibold">CRN</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold">Instructor</th>
                <th className="px-4 py-3 font-semibold">Days &amp; time</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Seats</th>
                <th className="px-4 py-3 font-semibold">Waitlist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4ece7] text-[#21443a]">
              {course.sections.map((section) => (
                <tr key={section.crn || section.section}>
                  <td className="px-4 py-3 font-mono">{section.crn}</td>
                  <td className="px-4 py-3">{section.section}</td>
                  <td className="px-4 py-3">
                    <Instructors section={section} />
                  </td>
                  <td className="px-4 py-3">{formatMeetings(section)}</td>
                  <td className="px-4 py-3">{formatLocation(section)}</td>
                  <td className="px-4 py-3">
                    {section.seatsAvailable ?? "?"}
                    {section.maximumEnrollment !== null && ` / ${section.maximumEnrollment}`}
                  </td>
                  <td className="px-4 py-3">{section.waitlistCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#dbe6df] bg-white px-6 py-5 shadow-[0_6px_20px_rgba(24,63,46,0.06)]">
      <h2 className="mb-3 text-xl font-extrabold text-[#102e25]">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="font-semibold text-[#3d5f53]">{label}</dt>
      <dd className="text-right text-[#21443a]">{value}</dd>
    </div>
  );
}

function Instructors({ section }: { section: Section }) {
  if (section.instructors.length === 0) return <>TBA</>;

  return (
    <>
      {section.instructors.map((person, index) => {
        const name = `${person.firstName} ${person.lastName}`.trim();
        return (
          <span key={`${name}-${index}`}>
            {index > 0 && ", "}
            {person.email ? (
              <a href={`mailto:${person.email}`} className="text-[#278447] hover:underline">
                {name}
              </a>
            ) : (
              name
            )}
          </span>
        );
      })}
    </>
  );
}

function StatusMessage({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mt-6 rounded-2xl border px-6 py-10 text-center text-base ${
        tone === "error"
          ? "border-[#ecd2cc] bg-[#fdf5f3] text-[#8a3b2e]"
          : "border-[#dbe6df] bg-white text-[#557166]"
      }`}
    >
      {children}
    </p>
  );
}

function formatMeetings(section: Section): string {
  const meetings = section.meetings.filter((meeting) => meeting.days || meeting.startTime);
  if (meetings.length === 0) return "TBA";
  return meetings
    .map((meeting) =>
      [meeting.days, meeting.startTime && `${meeting.startTime}–${meeting.endTime}`]
        .filter(Boolean)
        .join(" ")
    )
    .join("; ");
}

function formatLocation(section: Section): string {
  const places = section.meetings
    .map((meeting) => [meeting.building, meeting.room].filter(Boolean).join(" "))
    .filter(Boolean);
  return places.length > 0 ? [...new Set(places)].join("; ") : "TBA";
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
