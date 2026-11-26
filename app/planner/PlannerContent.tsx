"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { PlannedCourse, SemesterPlan, Term } from "./types";
import { conflicts, fetchCourses, hasUnknownMeetings, isAsynchronous, schedule, termCode, fallbackPublication, fetchPublishedTerms, latestReferenceTerm, courseCanBeSelected, upsertCourse } from "./courseData";
import type { CourseResult, PublicationInfo } from "./courseData";
import WeeklySchedule from "./WeeklySchedule";
import CourseColorPicker from "./CourseColorPicker";
import EligibilityIndicator, { EligibilityDetails } from "./EligibilityIndicator";
import type { EligibilityResults } from "./EligibilityIndicator";
import { assignCourseColors, getCourseColorIndex, isCourseColorIndex } from "./courseColors";

const terms: Term[] = ["Spring", "Summer", "Fall"];
const inputClass = "w-full rounded-lg border border-[#dce9df] bg-white px-3 py-2.5 text-sm text-[#102e25] outline-none focus:border-[#236a3c] focus:ring-2 focus:ring-[#236a3c]/20";
const primaryButton = "rounded-lg bg-[#0a2d26] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#174d2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]";
const removeButton = "rounded-md px-2 py-1 text-xs font-semibold text-[#a33d3d] transition hover:bg-[#fff0f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33d3d]";

function DismissNotification({ onDismiss, label }: { onDismiss: () => void; label: string }) {
  return (
    <button type="button" onClick={onDismiss} aria-label={label} title={label} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

function semesterKey(semester: Pick<SemesterPlan, "term" | "year">) {
  return `${semester.year}-${semester.term}`;
}

function sortSemesters(semesters: SemesterPlan[]) {
  return [...semesters].sort((a, b) => a.year - b.year || terms.indexOf(a.term) - terms.indexOf(b.term));
}

function sumCredits(courses: PlannedCourse[]) {
  return courses.reduce((total, course) => total + course.credits, 0);
}

function formatCredits(credits: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(credits);
}

function parseSearch(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized.length < 2) return null;
  const compact = /^([A-Z]{1,10})(\d+[A-Z0-9]*)$/.exec(normalized);
  const match = compact ?? /^([A-Z][A-Z0-9]{0,9})(?:\s+(\d+[A-Z0-9]*))?$/.exec(normalized);
  return match ? { subject: match[1], number: match[2] } : null;
}

function validateSemesterYear(term: Term, value: string, now = new Date()): string {
  const normalized = value.trim();
  if (!/^\d{4}$/.test(normalized)) return "Enter a valid four-digit year.";

  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", year: "numeric", month: "numeric" }).formatToParts(now);
  const currentYear = Number(parts.find((part) => part.type === "year")?.value);
  const currentMonth = Number(parts.find((part) => part.type === "month")?.value);
  const year = Number(normalized);
  const maxYear = currentYear + 5;

  if (year < currentYear) return "You cannot add a past semester.";
  if (year > maxYear) return `Choose a year no later than ${maxYear}.`;
  if (year === currentYear && ((term === "Spring" && currentMonth >= 6) || (term === "Summer" && currentMonth >= 9))) return "You cannot add a past semester.";
  return "";
}

function groupCourses(results: CourseResult[]) {
  const groups = new Map<string, CourseResult[]>();
  for (const course of results) {
    const sections = groups.get(course.code);
    if (sections) sections.push(course);
    else groups.set(course.code, [course]);
  }
  return Array.from(groups, ([code, sections]) => ({
    code,
    name: sections.find((section) => section.name)?.name || "Title unavailable",
    sections,
  }));
}

function CourseDetailsLink({ code }: { code: string }) {
  const href = `/courses/${encodeURIComponent(code.trim().replace(/\s+/g, "-"))}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Course details for ${code} (opens in a new tab)`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#b7cdbd] px-3 py-2 text-xs font-semibold text-[#102e25] transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">
      Course Details
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M15 3h6v6M21 3l-9 9" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
    </a>
  );
}

function MeetingDetails({ course, showWarning = true }: { course: Pick<PlannedCourse, "meetings">; showWarning?: boolean }) {
  return (
    <div className="mt-2 space-y-2">
      {course.meetings.map((meeting, index) => {
        const asynchronous = isAsynchronous(meeting);
        const timing = schedule(meeting);
        const location = [meeting.building, meeting.room].filter(Boolean).join(" ");
        return (
          <div key={index}>
            <p className="text-sm font-semibold leading-relaxed text-[#102e25]">
              {asynchronous ? (/\bONLINE\b/i.test(location) ? "Online · Asynchronous" : "Asynchronous") : timing ? `${meeting.days} · ${meeting.startTime}–${meeting.endTime}` : [meeting.days, "Meeting time not listed"].filter(Boolean).join(" · ")}
            </p>
            {!asynchronous && location && <p className="mt-0.5 text-xs text-[#516f62]">{location}</p>}
          </div>
        );
      })}
      {showWarning && hasUnknownMeetings(course) && <p className="text-xs text-[#80590d]">Meeting times incomplete. Some conflicts cannot be checked.</p>}
    </div>
  );
}

type RemovalRequest =
  | { kind: "semester"; semesterKey: string; semesterLabel: string; courseCount: number }
  | { kind: "course"; semesterKey: string; semesterLabel: string; code: string };

function RemovalDialog({ request, onCancel, onConfirm }: { request: RemovalRequest; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isSemester = request.kind === "semester";
  const title = isSemester ? `Remove ${request.semesterLabel}?` : `Remove ${request.code}?`;
  const description = request.kind === "semester"
    ? request.courseCount === 0
      ? "This empty semester will be removed from your plan."
      : `This will remove the semester and all ${request.courseCount} planned ${request.courseCount === 1 ? "course" : "courses"} from your plan.`
    : `This course will be removed from your ${request.semesterLabel} plan.`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  function dismiss() {
    dialogRef.current?.close();
    onCancel();
  }

  function confirm() {
    dialogRef.current?.close();
    onConfirm();
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="removal-title" aria-describedby="removal-description" onCancel={(event) => { event.preventDefault(); dismiss(); }} className="fixed inset-0 m-auto max-h-[calc(100%_-_2rem)] w-[calc(100%_-_2rem)] max-w-[460px] overflow-y-auto rounded-[22px] border border-[#dce9df] bg-white p-0 text-[#102e25] shadow-[0_24px_80px_rgba(10,45,38,0.24)] backdrop:bg-[#0a2d26]/55">
      <div className="h-2 bg-[#0a2d26]" />
      <div className="p-6 sm:p-7">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#a33d3d]" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
          </svg>
        </div>
        <h2 id="removal-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        <p id="removal-description" className="mt-3 text-sm leading-relaxed text-[#516f62]">{description} You can undo this immediately after removal.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={dismiss} className="rounded-lg border border-[#b7cdbd] px-4 py-2.5 text-sm font-bold text-[#102e25] transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">Cancel</button>
          <button type="button" onClick={confirm} className="rounded-lg bg-[#a33d3d] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#852e2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33d3d]">{isSemester ? "Remove Semester" : "Remove Course"}</button>
        </div>
      </div>
    </dialog>
  );
}

type PlannerContentProps = {
  initialPlan?: SemesterPlan[];
  eligibilityResults?: EligibilityResults;
};

type SemesterCardProps = {
  semester: SemesterPlan;
  eligibilityResults?: EligibilityResults;
  onAddCourse: (course: PlannedCourse) => void;
  onRemoveCourse: (code: string) => void;
  onChangeColor: (code: string, colorIndex: number) => void;
  onRemoveSemester: () => void;
};

function SemesterCard({ semester, eligibilityResults, onAddCourse, onRemoveCourse, onRemoveSemester, onChangeColor }: SemesterCardProps) {
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState({ value: "", expand: false });
  const searchVersion = useRef(0);
  const [results, setResults] = useState<CourseResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [expandedPlannedCode, setExpandedPlannedCode] = useState<string | null>(null);
  const scrollToCourse = useRef<string | null>(null);
  const key = semesterKey(semester);

  const targetTerm = termCode(semester);
  const [publicationInfo, setPublicationInfo] = useState<PublicationInfo>(fallbackPublication);
  const [checking, setChecking] = useState(true);
  const [resultMode, setResultMode] = useState<"published" | "reference">("published");
  const [courseAvailability, setCourseAvailability] = useState<Record<string, "available" | "missing" | "unverified">>({});
  const provisionalCodes = semester.courses.filter((course) => course.status === "provisional").map((course) => course.code).sort().join("|");
  const hasProvisional = provisionalCodes.length > 0;
  const published = publicationInfo.terms.includes(targetTerm);
  const selectedCourse = semester.courses.find((course) => course.code === expandedPlannedCode);

  if (expandedPlannedCode !== null && !selectedCourse) {
    setExpandedPlannedCode(null);
  }

  function togglePlannedCourse(code: string, fromSchedule = false) {
    const nextCode = expandedPlannedCode === code ? null : code;
    scrollToCourse.current = fromSchedule ? nextCode : null;
    setExpandedPlannedCode(nextCode);
  }

  useEffect(() => {
    if (!expandedPlannedCode || scrollToCourse.current !== expandedPlannedCode) return;
    scrollToCourse.current = null;
    const details = document.getElementById(`${key}-${encodeURIComponent(expandedPlannedCode)}-planned-details`);
    details?.parentElement?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [expandedPlannedCode, key]);

  useEffect(() => {
    let active = true;
    void fetchPublishedTerms().then((info) => {
      if (!active) return;
      setPublicationInfo(info);
      setChecking(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!published || !provisionalCodes) return;
    let active = true;
    const codes = provisionalCodes.split("|");
    const subjects = [...new Set(codes.map((code) => code.split(" ")[0]))];
    void Promise.allSettled(subjects.map((subject) => fetchCourses(targetTerm, subject))).then((responses) => {
      if (!active) return;
      const statuses: Record<string, "available" | "missing" | "unverified"> = {};
      for (const code of codes) {
        const response = responses[subjects.indexOf(code.split(" ")[0])];
        statuses[code] = response.status === "fulfilled" ? response.value.some((course) => course.code === code) ? "available" : "missing" : "unverified";
      }
      setCourseAvailability(statuses);
    });
    return () => { active = false; };
  }, [targetTerm, published, provisionalCodes]);

  const referenceTerm = latestReferenceTerm(publicationInfo);

  function updateSearch(value: string, expand = false) {
    searchVersion.current += 1;
    setSearchInput({ value, expand });
    setResults([]);
    setExpandedCourses([]);
    setSearched(false);
    setError("");
    setLoading(parseSearch(value) !== null);
  }

  useEffect(() => {
    const match = parseSearch(searchInput.value);
    if (checking || !match) return;

    const version = searchVersion.current;
    let active = true;
    const isCurrent = () => active && version === searchVersion.current;
    const timer = window.setTimeout(async () => {
      if (!isCurrent()) return;
      setLoading(true);
      setError("");
      const { subject, number } = match;
      const mode = published ? "published" : "reference";
      const sourceTerm = published ? targetTerm : referenceTerm;
      try {
        const courses = await fetchCourses(sourceTerm, subject);
        if (!isCurrent()) return;
        const matching = courses.filter((course) => {
          if (!course.code.startsWith(`${subject} `)) return false;
          if (!number) return true;
          const code = `${subject} ${number}`;
          return searchInput.expand ? course.code === code : course.code.startsWith(code);
        });
        setResultMode(mode);
        setResults(matching);
        setSearched(true);
        if (searchInput.expand && number && mode === "published") {
          const code = `${subject} ${number}`;
          setCourseAvailability((current) => ({ ...current, [code]: matching.length ? "available" : "missing" }));
          if (matching.length) setExpandedCourses([code]);
        }
      } catch (error) {
        if (isCurrent()) setError(error instanceof Error ? error.message : "Unable to retrieve courses.");
      } finally {
        if (isCurrent()) setLoading(false);
      }
    }, searchInput.expand ? 0 : 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchInput, checking, published, targetTerm, referenceTerm]);

  function selectCourse(course: CourseResult) {
    if (!published || resultMode !== "published" || course.termCode !== targetTerm || course.credits === null) return;
    const candidate = { ...course, credits: course.credits };
    if (!courseCanBeSelected(semester.courses, candidate)) return;
    onAddCourse(candidate);
  }

  function selectProvisional(sections: CourseResult[]) {
    if (published || resultMode !== "reference") return;
    const first = sections[0];
    if (first.credits === null || !sections.every((section) => section.credits === first.credits)) return;
    const candidate: PlannedCourse = {
      status: "provisional", termCode: targetTerm, referenceTermCode: first.termCode,
      code: first.code, name: sections.find((section) => section.name)?.name || "Title unavailable",
      credits: first.credits, crn: null, section: null, instructors: [], meetings: [],
    };
    if (courseCanBeSelected(semester.courses, candidate)) onAddCourse(candidate);
  }

  function chooseSection(code: string) {
    if (published && !checking) updateSearch(code, true);
  }

  return (
    <div className={`grid min-w-0 items-start gap-6 ${published ? "lg:col-span-2 lg:grid-cols-2" : ""}`}>
    <section aria-labelledby={`${key}-title`} className="min-w-0 overflow-hidden rounded-[24px] border border-[#dce9df] bg-white shadow-[0_12px_30px_rgba(22,62,43,0.06)]">
      <div className={`h-2 ${hasProvisional || !published ? "bg-[#b9a16d]" : "bg-[#0a2d26]"}`} />
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`${key}-title`} className="text-2xl font-extrabold tracking-tight">{semester.term} {semester.year}</h2>
            <p className="mt-1 text-sm font-semibold text-[#516f62]">
              {semester.courses.length} {semester.courses.length === 1 ? "course" : "courses"} · {formatCredits(sumCredits(semester.courses))} {hasProvisional ? "estimated credits" : "credits"}
            </p>
          </div>
          <button type="button" className={removeButton} onClick={onRemoveSemester}>
            Remove semester
          </button>
        </div>
        <div className="mt-4 h-1 w-14 rounded-full bg-[#64b66a]" aria-hidden="true" />

        {(!published || hasProvisional) && (
          <div className="mt-4 rounded-xl border border-[#e5ddc9] bg-[#faf7ef] px-4 py-3 text-sm text-[#79663f]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{published ? "Choose your sections" : "Planning ahead"}</p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <p>{published ? "Schedule available" : "Schedule not confirmed yet"}</p>
              <details className="group">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-sm font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#79663f] [&::-webkit-details-marker]:hidden">
                  How it works
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <div className="mt-2 max-w-prose space-y-2 leading-relaxed">
                  <p>{published ? "Your planned courses are kept. Choose a section for each course when available to confirm credits and check for time conflicts." : "You can plan courses using the latest available information. Offerings and credits may change. When this semester's schedule is confirmed, you can choose sections and check for time conflicts."}</p>
                  {!checking && !publicationInfo.complete && <p>Schedule publication could not be fully verified. Using the last confirmed information.</p>}
                </div>
              </details>
            </div>
          </div>
        )}
        {semester.courses.length === 0 ? (
          <p className="mt-5 rounded-xl bg-[#f5faf5] px-4 py-5 text-sm text-[#516f62]">No courses planned for this semester yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#e5eee7]">
            {semester.courses.map((course) => {
              const expanded = expandedPlannedCode === course.code;
              const detailsId = `${key}-${encodeURIComponent(course.code)}-planned-details`;
              return (
                <li key={course.code} className="py-2">
                  <div className={`rounded-xl border p-2 ${expanded ? "border-[#dce9df] bg-[#f5faf5]" : "border-transparent"}`}>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                      <button type="button" aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? "Hide" : "Show"} planned information for ${course.code}`} onClick={() => togglePlannedCourse(course.code)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[#f5faf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 shrink-0 text-[#236a3c] transition-transform ${expanded ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                        <span className="min-w-0 break-words">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold">{course.code}</span>
                            <EligibilityIndicator result={eligibilityResults?.[targetTerm]?.[course.code]} />
                          </span>
                          {course.name && <span className="mt-0.5 block text-sm text-[#516f62]">{course.name}</span>}
                          {published && course.status === "provisional" && <span className="mt-1 block text-xs font-semibold text-[#79663f]">Section not selected</span>}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <CourseDetailsLink code={course.code} />
                        {published && course.status === "scheduled" && <CourseColorPicker code={course.code} colorIndex={getCourseColorIndex(course)} onChange={(colorIndex) => onChangeColor(course.code, colorIndex)} />}
                      </div>
                    </div>
                    <div id={detailsId} hidden={!expanded} className="mx-2 mt-2 border-t border-[#dce9df] px-2 pb-2 pt-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 break-words">
                          <p className="text-xs font-semibold text-[#516f62]">{formatCredits(course.credits)} {course.status === "provisional" ? "estimated credits" : course.credits === 1 ? "credit" : "credits"}</p>
                          {course.status === "scheduled" ? (
                            <>
                              <p className="mt-2 text-sm font-bold">{course.instructors.length > 0 ? course.instructors.join(", ") : "Instructor not listed"}</p>
                              <MeetingDetails course={course} />
                              <p className="mt-2 text-xs text-[#516f62]">CRN {course.crn}{course.section && ` · Section ${course.section}`}</p>
                            </>
                          ) : published ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-[#79663f]">{courseAvailability[course.code] === "available" ? "Sections available" : courseAvailability[course.code] === "missing" ? "No sections available yet" : "Section availability not confirmed"}</p>
                              <button type="button" disabled={checking} onClick={() => chooseSection(course.code)} className="text-sm font-bold text-[#236a3c] underline disabled:opacity-50">Select Section</button>
                            </div>
                          ) : null}
                        </div>
                        <button type="button" aria-label={`Remove ${course.code} from ${semester.term} ${semester.year}`} className={removeButton} onClick={() => onRemoveCourse(course.code)}>Remove</button>
                      </div>
                      <EligibilityDetails result={eligibilityResults?.[targetTerm]?.[course.code]} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 rounded-xl border border-[#e3ede6] bg-[#f9fcf9] p-4">
          <h3 className="mb-3 text-sm font-bold">Find a course</h3>
          <label className="block text-sm font-semibold text-[#516f62]">
            Subject or course code
            <input type="search" value={searchInput.value} onChange={(event) => updateSearch(event.target.value)} disabled={checking} placeholder="Search courses..." maxLength={40} className={`${inputClass} mt-1`} />
          </label>
          {(checking || loading) && <p role="status" className="mt-2 text-sm text-[#516f62]">{checking ? "Checking schedule..." : "Searching..."}</p>}
          {!checking && !loading && searchInput.value.trim().length >= 2 && !parseSearch(searchInput.value) && <p className="mt-2 text-xs text-[#516f62]">Enter a subject or course code, such as ICS or ICS 314.</p>}
          {error && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#a33d3d]"><p role="alert">{error}</p><button type="button" onClick={() => updateSearch(searchInput.value, searchInput.expand)} className="font-semibold underline underline-offset-2">Retry</button></div>}
          {searched && results.length === 0 && <p role="status" className="mt-3 text-sm text-[#516f62]">{resultMode === "reference" ? "No matching courses found in the reference schedule." : "No matching sections returned for this published semester."}</p>}
        </div>
        {results.length > 0 && (
          <div className="mt-4 max-h-[480px] space-y-3 overflow-y-auto rounded-xl" aria-label="Matching courses">
            {groupCourses(results).map(({ code, name, sections }) => {
              const existing = semester.courses.find((item) => item.code === code);
              const planned = Boolean(existing);
              const commonCredits = sections[0].credits;
              const sameCredits = sections.every((section) => section.credits === commonCredits);
              const creditSummary = sameCredits
                ? commonCredits === null ? "Credits unavailable" : `${formatCredits(commonCredits)} ${resultMode === "reference" ? "est. " : ""}${commonCredits === 1 ? "credit" : "credits"}`
                : resultMode === "reference" ? "Reference credits vary" : "Credits listed by section";
              const sectionList = (
                <div className="space-y-2">
                  {sections.map((course) => {
                    const duplicate = semester.courses.some((item) => (item.code === course.code && item.status === "scheduled") || item.crn === course.crn);
                    const overlapping = semester.courses.filter((item) => item.code !== course.code && conflicts(item, course));
                    const unknown = hasUnknownMeetings(course);
                    const unknownPlanned = semester.courses.filter((item) => item.code !== course.code && item.status === "scheduled" && hasUnknownMeetings(item));
                    const awaitingSections = semester.courses.filter((item) => item.code !== course.code && item.status === "provisional");
                    const hasFixedMeeting = course.meetings.some((meeting) => schedule(meeting) !== null);
                    const needsConflictCheck = unknown || hasFixedMeeting;
                    const blocked = duplicate || overlapping.length > 0 || course.credits === null;
                    return (
                      <div key={course.crn} className="rounded-lg border border-[#e3ede6] bg-[#f9fcf9] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-bold leading-snug">{course.instructors.length > 0 ? course.instructors.join(", ") : "Instructor not listed"}</p>
                            <MeetingDetails course={course} showWarning={false} />
                            <p className="mt-2 text-xs text-[#516f62]">{course.section ? `Section ${course.section} · ` : ""}CRN {course.crn}{!sameCredits && ` · ${course.credits === null ? "Credits unavailable" : `${formatCredits(course.credits)} cr.`}`}</p>
                          </div>
                          <button type="button" aria-label={`Add ${course.code}, CRN ${course.crn}`} disabled={blocked} onClick={() => selectCourse(course)} className={`${primaryButton} shrink-0 disabled:cursor-not-allowed disabled:opacity-40`}>{duplicate && semester.courses.some((item) => item.crn === course.crn) ? "Added" : existing?.status === "provisional" ? "Select Section" : "Add"}</button>
                        </div>
                        {existing?.status === "provisional" && course.credits !== null && existing.credits !== course.credits && <p className="mt-2 text-xs font-semibold text-[#80590d]">Credits changed from {formatCredits(existing.credits)} to {formatCredits(course.credits)}.</p>}
                        {overlapping.length > 0 && !duplicate && <p className="mt-2 text-sm font-semibold text-[#a33d3d]">Time conflict with {overlapping.map((item) => item.code).join(", ")}.</p>}
                        {course.credits === null && <p className="mt-2 text-sm text-[#a33d3d]">A single valid credit value is required before adding this section.</p>}
                        {unknown && !blocked && <p className="mt-2 text-xs text-[#80590d]">Meeting times for this section are incomplete. Some conflicts cannot be checked.</p>}
                        {needsConflictCheck && unknownPlanned.length > 0 && !blocked && <p className="mt-2 text-xs text-[#80590d]">Cannot fully check conflicts with {unknownPlanned.map((item) => item.code).join(", ")}: meeting times are incomplete.</p>}
                        {needsConflictCheck && awaitingSections.length > 0 && !blocked && <p className="mt-2 text-xs text-[#80590d]">Select sections for {awaitingSections.map((item) => item.code).join(", ")} to finish checking conflicts.</p>}
                      </div>
                    );
                  })}
                </div>
              );
              const heading = (
                <span className="block min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold">{code}</span>
                    <EligibilityIndicator result={eligibilityResults?.[targetTerm]?.[code]} />
                  </span>
                  <span className="block text-sm text-[#516f62]">{name}</span>
                  <span className="mt-1 block text-xs font-semibold text-[#516f62]">{creditSummary}{resultMode === "published" && sections.length === 1 && " · 1 section"}{planned && " · Already planned"}</span>
                </span>
              );
              const expanded = expandedCourses.includes(code);
              const multipleSections = sections.length > 1;
              const sectionsId = `${key}-${encodeURIComponent(code)}-sections`;
              if (resultMode === "reference") return (
                <article key={code} className="rounded-xl border border-[#dce9df] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-3">{heading}<CourseDetailsLink code={code} /></div>
                  <div className="mt-3 flex items-center justify-end gap-3 border-t border-[#e3ede6] pt-3">
                    {(!sameCredits || commonCredits === null) && <p className="mr-auto text-xs text-[#79663f]">Credits need confirmation.</p>}
                    <button type="button" disabled={planned || !sameCredits || commonCredits === null} onClick={() => selectProvisional(sections)} className={`${primaryButton} shrink-0 disabled:cursor-not-allowed disabled:opacity-40`}>{planned ? "Added" : "Add to plan"}</button>
                  </div>
                </article>
              );
              return (
                <article key={code} className="rounded-xl border border-[#dce9df] bg-white">
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    {heading}
                    <CourseDetailsLink code={code} />
                  </div>
                  {multipleSections && (
                    <button type="button" aria-expanded={expanded} aria-controls={sectionsId} aria-label={`${expanded ? "Hide" : "View"} ${sections.length} sections for ${code}`} onClick={() => setExpandedCourses((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])} className={`flex w-full items-center justify-between gap-3 border-t border-[#e3ede6] bg-[#f5faf5] px-4 py-3 text-left text-sm font-bold text-[#236a3c] transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#236a3c] ${expanded ? "" : "rounded-b-xl"}`}>
                      <span>{expanded ? "Hide" : "View"} {sections.length} sections</span>
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  )}
                  <div id={sectionsId} hidden={multipleSections && !expanded} className="border-t border-[#e3ede6] p-3">{sectionList}</div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
    {published && (
      <WeeklySchedule semester={semester} selectedCode={selectedCourse?.status === "scheduled" ? selectedCourse.code : null} onSelect={(code) => togglePlannedCourse(code, true)} />
    )}
    </div>
  );
}

export default function PlannerContent({ initialPlan = [], eligibilityResults }: PlannerContentProps) {
  const [semesters, setSemesters] = useState<SemesterPlan[]>(() => sortSemesters(initialPlan.map((semester) => ({ ...semester, courses: assignCourseColors(semester.courses) }))));
  const [undo, setUndo] = useState<{ plan: SemesterPlan[]; label: string } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<RemovalRequest | null>(null);
  const [term, setTerm] = useState<Term>("Spring");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const totalCourses = semesters.reduce((total, semester) => total + semester.courses.length, 0);
  const totalCredits = semesters.reduce((total, semester) => total + sumCredits(semester.courses), 0);
  const hasEstimates = semesters.some((semester) => semester.courses.some((course) => course.status === "provisional"));

  function addSemester(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedYear = Number(year);

    const validationError = validateSemesterYear(term, year);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (semesters.some((semester) => semester.term === term && semester.year === parsedYear)) {
      setError("This semester is already in your plan.");
      return;
    }

    setUndo(null);
    setSemesters((current) => sortSemesters([...current, { term, year: parsedYear, courses: [] }]));
    setError("");
  }

  function addCourse(key: string, course: PlannedCourse) {
    setUndo(null);
    setSemesters((current) => current.map((semester) => semesterKey(semester) === key && course.termCode === termCode(semester)
      ? { ...semester, courses: assignCourseColors(upsertCourse(semester.courses, course)) }
      : semester));
  }

  function changeCourseColor(key: string, code: string, colorIndex: number) {
    if (!isCourseColorIndex(colorIndex)) return;
    const update = (plan: SemesterPlan[]) => plan.map((semester) => semesterKey(semester) === key
      ? { ...semester, courses: semester.courses.map((course) => course.code === code && course.status === "scheduled" ? { ...course, colorIndex } : course) }
      : semester);
    setSemesters(update);
    setUndo((current) => current ? { ...current, plan: update(current.plan) } : null);
  }

  function removeCourse(key: string, code: string) {
    const course = semesters.find((semester) => semesterKey(semester) === key)?.courses.find((item) => item.code === code);
    if (!course) return;
    setUndo({ plan: semesters, label: `Removed ${course.code}.` });
    setSemesters((current) => current.map((semester) => semesterKey(semester) === key
      ? { ...semester, courses: semester.courses.filter((course) => course.code !== code) }
      : semester));
  }

  function removeSemester(key: string) {
    const semester = semesters.find((item) => semesterKey(item) === key);
    if (!semester) return;
    setUndo({ plan: semesters, label: `Removed ${semester.term} ${semester.year}.` });
    setSemesters((current) => current.filter((semester) => semesterKey(semester) !== key));
  }

  function confirmRemoval() {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === "semester") removeSemester(pendingRemoval.semesterKey);
    else removeCourse(pendingRemoval.semesterKey, pendingRemoval.code);
    setPendingRemoval(null);
  }

  const stats = [
    { label: "Planned Semesters", value: semesters.length },
    { label: "Planned Courses", value: totalCourses },
    { label: hasEstimates ? "Planned Credits (Estimated)" : "Planned Credits", value: formatCredits(totalCredits) },
  ];

  return (
    <main className="w-full flex-1 bg-[#f0f6f1] text-[#102e25]">
      <section className="border-b border-[#dce9df] bg-[#f9fcf9]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-8 sm:py-14 lg:px-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Course Planner</h1>
          <p className="mt-3 max-w-[720px] text-base leading-relaxed text-[#516f62] sm:text-lg">
            Organize your upcoming semesters and keep track of the courses you plan to take.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-10 sm:px-8 lg:px-16 lg:pb-24">
        <section aria-label="Plan summary" className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[20px] border border-[#dce9df] bg-white px-6 py-5 shadow-[0_10px_25px_rgba(22,62,43,0.05)]">
              <p className="text-3xl font-extrabold leading-none">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold text-[#516f62]">{stat.label}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="add-semester-title" className="mt-7 rounded-[24px] border border-[#dce9df] bg-white p-6 shadow-[0_12px_30px_rgba(22,62,43,0.06)] sm:p-8">
          <h2 id="add-semester-title" className="text-2xl font-extrabold tracking-tight">Add a Semester</h2>
          <div className="mt-3 h-1 w-14 rounded-full bg-[#64b66a]" aria-hidden="true" />
          <form noValidate onSubmit={addSemester} className="mt-5 flex flex-wrap items-end gap-4">
            <label className="min-w-[140px] flex-1 text-sm font-semibold text-[#516f62] sm:max-w-[240px]">
              Term
              <select value={term} onChange={(event) => { setTerm(event.target.value as Term); setError(""); }} className={`${inputClass} mt-1`}>
                {terms.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="min-w-[120px] flex-1 text-sm font-semibold text-[#516f62] sm:max-w-[160px]">
              Year
              <input value={year} onChange={(event) => { setYear(event.target.value); setError(""); }} inputMode="numeric" pattern="[0-9]{4}" placeholder="YYYY" required className={`${inputClass} mt-1`} />
            </label>
            <button type="submit" className={primaryButton}>+ Add Semester</button>
          </form>
          {error && (
            <div role="alert" className="mt-3">
              <button type="button" onClick={() => setError("")} aria-label={`Dismiss message: ${error}`} className="inline-flex max-w-full items-center gap-2 rounded-md pr-2 text-left text-sm text-[#a33d3d] transition hover:bg-[#fff0f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </span>
                <span>{error}</span>
              </button>
            </div>
          )}
        </section>

        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight">Your Plan</h2>
        </div>
        {undo && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-[#dce9df] bg-white p-4 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <DismissNotification onDismiss={() => setUndo(null)} label="Dismiss removal notification and undo option" />
              <span role="status">{undo.label}</span>
            </div>
            <button type="button" onClick={() => { setSemesters(undo.plan); setUndo(null); }} className="font-bold text-[#236a3c] underline">Undo</button>
          </div>
        )}
        {semesters.length === 0 ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-[#b7cdbd] bg-[#f9fcf9] px-6 py-12 text-center">
            <p className="text-lg font-bold">No semesters planned yet</p>
            <p className="mt-2 text-sm text-[#516f62]">Add a semester to start building your course plan.</p>
          </div>
        ) : (
          <div className="mt-4 grid items-start gap-6 lg:grid-cols-2">
            {semesters.map((semester) => {
              const key = semesterKey(semester);
              return (
                <SemesterCard
                  key={key}
                  semester={semester}
                  eligibilityResults={eligibilityResults}
                  onAddCourse={(course) => addCourse(key, course)}
                  onChangeColor={(code, colorIndex) => changeCourseColor(key, code, colorIndex)}
                  onRemoveCourse={(code) => {
                    const course = semester.courses.find((item) => item.code === code);
                    if (course) setPendingRemoval({ kind: "course", semesterKey: key, semesterLabel: `${semester.term} ${semester.year}`, code: course.code });
                  }}
                  onRemoveSemester={() => setPendingRemoval({ kind: "semester", semesterKey: key, semesterLabel: `${semester.term} ${semester.year}`, courseCount: semester.courses.length })}
                />
              );
            })}
          </div>
        )}
      </div>
      {pendingRemoval && <RemovalDialog request={pendingRemoval} onCancel={() => setPendingRemoval(null)} onConfirm={confirmRemoval} />}
    </main>
  );
}
