"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import ComparisonSchedule, { defaultScheduleColors, type ScheduleColorIndices } from "./ComparisonSchedule";
import { alignCourses, sameSection, type Course, type Owner, type Semester } from "./comparison";
import { comparisonSemesters, preferredSemester, sortedSemesters, type FriendPlanSnapshot } from "./friendPlanService";
import { createFriendPlanService } from "./friendPlanClient";

const panel = "rounded-2xl border border-[#d4e2d7] bg-white p-5 shadow-sm sm:p-7";
const primary = "rounded-xl bg-[#21833c] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#176c30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-xl border border-[#b7cdbd] px-4 py-3 text-sm font-bold text-[#215735] transition hover:bg-[#edf5ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c]";

function CourseList({ title, courses, other, published }: { title: string; courses: Course[]; other?: Course[]; published: boolean }) {
  return <section className={panel}><h2 className="text-lg font-bold">{title}</h2>{!courses.length ? <p className="mt-3 text-sm text-[#516f62]">No planned courses.</p> : <ul className="mt-4 divide-y divide-[#e0e9e2]">{courses.map((course, i) => {
    const exact = other?.some((c) => sameSection(course, c));
    const same = other?.some((c) => c.code === course.code);
    return <li key={`${course.code}-${i}`} className="py-1 first:pt-0 last:pb-0"><a href={`/courses/${encodeURIComponent(course.code.trim().replace(/\s+/g, "-"))}`} target="_blank" rel="noopener noreferrer" aria-label={`Course details for ${course.code} ${course.name} (opens in a new tab)`} title="View course details (opens in a new tab)" className="group flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 transition hover:bg-[#f0f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="font-bold group-hover:text-[#287344] group-hover:underline">{course.code}</p>{published && course.sectionId && course.section?.trim() && <span className="text-xs text-[#647c70]">Section {course.section.trim()}</span>}</div><p className="text-xs text-[#516f62]">{course.name}</p>{published && !course.meetings.length && <p className="mt-1 text-xs text-[#516f62]">No fixed meeting time</p>}</div>{exact ? <span className="rounded-full bg-[#eee3f8] px-2.5 py-1 text-xs font-semibold text-[#633f85]">Same section</span> : same ? <span className="rounded-full bg-[#e4f3e6] px-2.5 py-1 text-xs font-semibold text-[#215735]">Same course</span> : null}</a></li>;
  })}</ul>}</section>;
}

export default function FriendContent({ initialSnapshot }: { initialSnapshot: FriendPlanSnapshot }) {
  const { profile, ownPlans, sharedPlans } = initialSnapshot;
  const [service] = useState(() => createFriendPlanService(initialSnapshot));
  const terms = comparisonSemesters(initialSnapshot);
  const firstName = profile.name.split(" ")[0];
  const [semester, setSemester] = useState<Semester | "">(() => preferredSemester(terms));
  const [mode, setMode] = useState<Owner>("both");
  const [colorIndices, setColorIndices] = useState<ScheduleColorIndices>(defaultScheduleColors);
  const shareableSemesters = sortedSemesters(Object.keys(ownPlans));
  const [sharingSemester, setSharingSemester] = useState<Semester | "">(() => preferredSemester(shareableSemesters));
  const [shared, setShared] = useState<Semester[]>(initialSnapshot.sharingPermissions);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [sharingError, setSharingError] = useState("");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<{ semester: Semester; share: boolean } | null>(null);
  const mine = semester ? ownPlans[semester] : undefined;
  const theirs = semester ? sharedPlans[semester] : undefined;
  const sharingPlan = sharingSemester ? ownPlans[sharingSemester] : undefined;
  const outgoing = sharingSemester !== "" && shared.includes(sharingSemester);
  const effectiveMode = theirs ? mode : "mine";
  const ownCourses = mine?.courses ?? [];
  const friendCourses = theirs?.courses ?? [];
  const alignedCourses = alignCourses(ownCourses, friendCourses);
  function openSharing() {
    if (!sharingSemester || !sharingPlan || busyRef.current) return;
    setSharingError("");
    setMessage("");
    setPending({ semester: sharingSemester, share: !outgoing });
    dialog.current?.showModal();
  }
  async function confirmSharing() {
    if (!pending || busyRef.current) return;
    const action = pending;
    busyRef.current = true;
    setBusy(true);
    setSharingError("");
    try {
      const permissions = await (action.share ? service.sharePlan(profile.id, action.semester) : service.stopSharingPlan(profile.id, action.semester));
      setShared(permissions);
      setMessage(action.share ? `Your ${action.semester} plan is now shared with ${firstName}.` : `Sharing stopped for ${action.semester}.`);
      dialog.current?.close();
    } catch (error) {
      setSharingError(error instanceof Error ? error.message : "Unable to update sharing. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return <main className="w-full flex-1 bg-[#f0f6f1] text-[#102e25]"><div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
    <Link href="/friends" className="inline-flex items-center gap-2 text-sm font-bold text-[#287344] hover:underline focus-visible:outline-2 focus-visible:outline-[#21833c]">← Back to friends</Link>
    <div className="mt-6"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#287344]">Friend</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{profile.name}</h1><p className="mt-1 text-sm text-[#516f62]">{profile.major}</p></div>
    <div className="mt-4 h-1 w-16 rounded-full bg-[#64b66a]" />
    <p className="mt-4 max-w-2xl leading-relaxed text-[#516f62]">Compare semester plans, find classes you can take together, and manage which plans you share.</p>
    <section className={`${panel} mt-5`} aria-labelledby="plan-sharing-heading">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
        <div>
          <h2 id="plan-sharing-heading" className="text-xl font-bold">Plan sharing</h2>
          <p className="mt-1 text-sm text-[#516f62]">Choose a plan to share with {firstName}.</p>
          <p className="mt-2 text-xs leading-relaxed text-[#516f62]">Sharing applies only to the selected plan. Your other plans and academic history remain private.</p>
        </div>
        <div className="min-w-0">
          {shareableSemesters.length ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 basis-44">
                <label className="block text-sm font-semibold" htmlFor="sharing-semester">Your semester plan</label>
                <select id="sharing-semester" disabled={busy} value={sharingSemester} onChange={(event) => { setSharingSemester(event.target.value as Semester); setMessage(""); }} className="mt-2 w-full rounded-lg border border-[#bfcec5] bg-[#fbfdfb] px-3 py-3 text-sm focus:outline-2 focus:outline-[#21833c]">
                  {shareableSemesters.map((term) => <option key={term} value={term}>{term}{shared.includes(term) ? " — Shared" : " — Private"}</option>)}
                </select>
              </div>
              <button type="button" disabled={!sharingPlan || busy} onClick={openSharing} className={`shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${outgoing ? secondary : primary}`}>{outgoing ? "Stop sharing" : "Share plan"}</button>
            </div>
          ) : <p className="rounded-lg bg-[#f5faf5] p-3 text-sm text-[#516f62]">You don&apos;t have any plans to share yet.</p>}
          {message && <p role="status" className="mt-3 text-sm font-medium text-[#215735]">{message}</p>}
        </div>
      </div>
    </section>
    <div className="mt-5 min-w-0 space-y-5">
      <section aria-labelledby="weekly-schedule-heading" className="min-w-0 rounded-[24px] border border-[#dce9df] bg-white shadow-[0_12px_30px_rgba(22,62,43,0.06)]">
        <div className="h-2 rounded-t-[23px] bg-[#0a2d26]" />
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="weekly-schedule-heading" className="text-2xl font-extrabold tracking-tight">Weekly Schedule</h2>
              <p className="mt-1 text-sm text-[#516f62]">Choose a semester to compare your plans.</p>
              <div className="mt-4 h-1 w-14 rounded-full bg-[#64b66a]" />
            </div>
            <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">
              Semester
              <select disabled={!terms.length} value={semester} onChange={(event) => { setSemester(event.target.value as Semester); setMode("both"); }} className="rounded-lg border border-[#bfcec5] bg-[#fbfdfb] px-4 py-3 text-sm focus:outline-2 focus:outline-[#21833c]">
                {!terms.length && <option value="">No plans</option>}{terms.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Schedule display">
            {(["both", "mine", "friend"] as const).map((option) => <button key={option} type="button" disabled={!semester || (!theirs && option !== "mine")} aria-pressed={effectiveMode === option} onClick={() => setMode(option)} className={`rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#21833c] disabled:cursor-not-allowed disabled:opacity-40 ${effectiveMode === option ? "border-[#21833c] bg-[#e4f3e6] text-[#215735]" : "border-[#d4e2d7] text-[#516f62] hover:bg-[#f5faf5]"}`}>{option === "both" ? "Both schedules" : option === "mine" ? "Your schedule" : `${firstName}'s schedule`}</button>)}
          </div>
          {semester && !theirs && <p className="mt-4 rounded-xl bg-[#f5faf5] p-3 text-sm text-[#516f62]">{firstName} hasn&apos;t shared a plan for {semester} with you. You can still review your own plan.</p>}
          {!semester ? <p className="mt-4 rounded-xl bg-[#f5faf5] p-4 text-sm text-[#516f62]">No semester plans to compare yet.</p> : mine?.published || theirs?.published ? (
            <ComparisonSchedule mine={mine?.published ? ownCourses : []} friend={theirs?.published ? friendCourses : []} mode={effectiveMode} friendName={firstName} colorIndices={colorIndices} onColorChange={(category, index) => setColorIndices((previous) => ({ ...previous, [category]: index }))} />
          ) : <p className="mt-4 rounded-xl bg-[#f5faf5] p-4 text-sm text-[#516f62]">Meeting times aren&apos;t available for this semester yet. You can still compare planned courses below.</p>}
        </div>
      </section>
        <div className="grid gap-5 sm:grid-cols-2"><CourseList title="Your planned courses" courses={alignedCourses.mine} published={mine?.published === true} other={theirs ? friendCourses : undefined} />{theirs ? <CourseList title={`${firstName}'s planned courses`} courses={alignedCourses.friend} published={theirs.published} other={ownCourses} /> : <section className={panel}><h2 className="text-lg font-bold">{firstName}&apos;s planned courses</h2><p className="mt-3 text-sm text-[#516f62]">Not shared with you.</p></section>}</div>
    </div>
    <dialog ref={dialog} onClose={() => { setPending(null); setSharingError(""); }} onCancel={(e) => { if (busyRef.current) e.preventDefault(); }} onClick={(e) => { if (!busyRef.current && e.target === e.currentTarget) dialog.current?.close(); }} aria-labelledby="share-title" className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-[460px] overflow-hidden rounded-[22px] border border-[#dce9df] bg-white p-0 text-[#102e25] shadow-[0_24px_80px_rgba(10,45,38,0.24)] backdrop:bg-[#0a2d26]/55"><div className="h-2 bg-[#0a2d26]" /><div className="p-6 sm:p-8"><h2 id="share-title" className="text-xl font-extrabold">{pending?.share ? "Share your plan?" : "Stop sharing your plan?"}</h2><div className="mt-3 h-1 w-12 rounded-full bg-[#64b66a]" /><p className="mt-4 text-sm leading-relaxed text-[#516f62]">{pending?.share ? `Allow ${profile.name} to view your ${pending.semester} planned courses and meeting times, including future changes?` : `Remove ${profile.name}'s access to your ${pending?.semester} plan?`}</p>{sharingError && <p role="alert" className="mt-4 rounded-lg border border-[#f0caca] bg-[#fff0f0] p-3 text-sm text-[#991b1b]">{sharingError}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" autoFocus disabled={busy} onClick={() => dialog.current?.close()} className={`${secondary} disabled:cursor-not-allowed disabled:opacity-50`}>Cancel</button><button type="button" disabled={busy} onClick={confirmSharing} className={primary}>{busy ? "Updating..." : pending?.share ? "Share plan" : "Stop sharing"}</button></div></div></dialog>
  </div></main>;
}
