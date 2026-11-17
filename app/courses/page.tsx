"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import useCourses from "@/components/useCourses";
import { courseHref } from "@/lib/courseInfo";
import {
  formatCredits,
  groupSections,
  matchesSearch,
  type CourseGroup,
} from "@/lib/courseSearch";

type Section = ReturnType<typeof useCourses>["courses"][number];

// /api/courses currently returns ICS courses for term 202730.
const SEMESTER_LABEL = "Spring 2027";
const DEPARTMENT_LABEL = "ICS";

export default function CoursesPage() {
  const { courses, loading, error } = useCourses();
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const allCourses = useMemo(() => groupSections(courses), [courses]);
  const results = useMemo(
    () => allCourses.filter((course) => matchesSearch(course, query)),
    [allCourses, query]
  );

  return (
    <main className="w-full flex-1 bg-[#f0f6f1] px-5 py-10 text-[#16362e] sm:px-8 lg:px-12 lg:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#102e25] sm:text-4xl">
            Browse Courses
          </h1>
          <p className="mt-2 text-base text-[#557166] sm:text-lg">
            Search {DEPARTMENT_LABEL} courses offered in {SEMESTER_LABEL}.
          </p>
        </header>

        {/* Search bar */}
        <div className="mt-8">
          <label htmlFor="course-search" className="sr-only">
            Search by course code or name
          </label>
          <div className="relative">
            <Image
              src="/images/features/search.png"
              alt=""
              width={22}
              height={22}
              className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 opacity-55"
            />
            <input
              id="course-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by course code or name"
              autoComplete="off"
              className="block h-14 w-full rounded-xl border border-[#bfcec5] bg-white py-3 pl-12 pr-4 text-base text-[#17382e] shadow-sm outline-none transition-colors placeholder:text-[#82968c] focus:border-[#278447] focus:ring-2 focus:ring-[#278447]/20"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-[#cfddd4] bg-white px-3 py-1 font-semibold text-[#2c5246]">
              Department: {DEPARTMENT_LABEL}
            </span>
            <span className="rounded-full border border-[#cfddd4] bg-white px-3 py-1 font-semibold text-[#2c5246]">
              Semester: {SEMESTER_LABEL}
            </span>
            {!loading && !error && (
              <span className="ml-auto text-[#557166]" aria-live="polite">
                {results.length} of {allCourses.length} courses
              </span>
            )}
          </div>
        </div>

        {/* Results */}
        <section aria-label="Search results" className="mt-6">
          {loading && <StatusMessage>Loading courses…</StatusMessage>}

          {!loading && error && (
            <StatusMessage tone="error">
              We couldn&apos;t load courses right now. Please try again in a moment.
            </StatusMessage>
          )}

          {!loading && !error && results.length === 0 && (
            <StatusMessage>
              {allCourses.length === 0
                ? "No courses are listed for this semester yet."
                : `No courses match "${query.trim()}".`}
            </StatusMessage>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="space-y-3">
              {results.map((course) => (
                <CourseRow
                  key={course.key}
                  course={course}
                  open={openKey === course.key}
                  onToggle={() =>
                    setOpenKey((current) => (current === course.key ? null : course.key))
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function CourseRow({
  course,
  open,
  onToggle,
}: {
  course: CourseGroup<Section>;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `sections-${course.key}`;
  const sectionCount = course.sections.length;

  return (
    <li className="overflow-hidden rounded-2xl border border-[#dbe6df] bg-white shadow-[0_6px_20px_rgba(24,63,46,0.06)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-[#f7fbf8] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#278447] sm:px-6"
      >
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="text-lg font-extrabold text-[#102e25] sm:text-xl">
            {course.subject} {course.courseNumber}
          </p>
          <p className="truncate text-sm font-medium text-[#3d5f53] sm:text-base">
            {course.title}
          </p>
        </div>

        <div className="flex w-full items-center gap-4 text-sm text-[#557166] sm:w-auto">
          <span>{formatCredits(course.credits)}</span>
          <span>
            {sectionCount} {sectionCount === 1 ? "section" : "sections"}
          </span>
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              course.seatsOpen > 0
                ? "bg-[#e3f6df] text-[#1f6b37]"
                : "bg-[#f3e9e7] text-[#8a3b2e]"
            }`}
          >
            {course.seatsOpen > 0 ? `${course.seatsOpen} seats open` : "Full"}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`ml-auto h-5 w-5 shrink-0 sm:ml-0 fill-current transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
          </svg>
        </div>
      </button>

      {open && (
        <div id={panelId} className="border-t border-[#e4ece7] bg-[#fbfdfb] px-5 py-4 sm:px-6">
          <SectionTable sections={course.sections} />
          <Link
            href={courseHref(course.subject, course.courseNumber)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#123f35] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0b3029] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278447]"
          >
            View course details <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </li>
  );
}

function SectionTable({ sections }: { sections: Section[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-[#6b8479]">
          <tr>
            <th className="py-2 pr-4 font-semibold">CRN</th>
            <th className="py-2 pr-4 font-semibold">Section</th>
            <th className="py-2 pr-4 font-semibold">Instructor</th>
            <th className="py-2 pr-4 font-semibold">Days &amp; time</th>
            <th className="py-2 font-semibold">Seats</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e4ece7] text-[#21443a]">
          {sections.map((section) => (
            <tr key={section.crn || section.section}>
              <td className="py-2 pr-4 font-mono">{section.crn}</td>
              <td className="py-2 pr-4">{section.section}</td>
              <td className="py-2 pr-4">{formatInstructors(section)}</td>
              <td className="py-2 pr-4">{formatMeetings(section)}</td>
              <td className="py-2">
                {section.seatsAvailable ?? "?"}
                {section.maximumEnrollment !== null && ` / ${section.maximumEnrollment}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      className={`rounded-2xl border px-6 py-10 text-center text-base ${
        tone === "error"
          ? "border-[#ecd2cc] bg-[#fdf5f3] text-[#8a3b2e]"
          : "border-[#dbe6df] bg-white text-[#557166]"
      }`}
    >
      {children}
    </p>
  );
}

function formatInstructors(section: Section): string {
  if (section.instructors.length === 0) return "TBA";
  return section.instructors
    .map((person) => `${person.firstName} ${person.lastName}`.trim())
    .join(", ");
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
