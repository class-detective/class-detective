"use client";

import type { SemesterPlan } from "./types";
import { buildSchedule, hourLabel } from "./scheduleData";

import { courseColors, getCourseColorIndex } from "./courseColors";

const pixelsPerMinute = 0.95;

type WeeklyScheduleProps = {
  semester: SemesterPlan;
  selectedCode: string | null;
  onSelect: (code: string) => void;
};

export default function WeeklySchedule({ semester, selectedCode, onSelect }: WeeklyScheduleProps) {
  const { columns, blocks, untimed, firstHour, lastHour } = buildSchedule(semester.courses);
  const hours = Array.from({ length: (lastHour - firstHour) / 60 + 1 }, (_, i) => firstHour + i * 60);
  const height = (lastHour - firstHour) * pixelsPerMinute;
  const hasCourses = blocks.length > 0 || untimed.length > 0;
  const sharedSlots = blocks.some((block) => block.lanes > 1);
  const titleId = `schedule-${semester.year}-${semester.term}`;
  return (
    <section aria-labelledby={titleId} className="min-w-0 overflow-hidden rounded-[24px] border border-[#dce9df] bg-white shadow-[0_12px_30px_rgba(22,62,43,0.06)]">
      <div className="h-2 bg-[#0a2d26]" />
      <div className="p-4 sm:p-6">
        <h2 id={titleId} className="text-2xl font-extrabold tracking-tight">Weekly Schedule</h2>
        <p className="mt-1 text-sm font-semibold text-[#516f62]">{semester.term} {semester.year}</p>
        <div className="mt-4 h-1 w-14 rounded-full bg-[#64b66a]" aria-hidden="true" />
        {!hasCourses && <p className="mt-4 rounded-lg bg-[#f5faf5] px-3 py-3 text-sm text-[#516f62]">Add a course to build your schedule.</p>}
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#dce9df]">
          <div style={{ minWidth: 52 + columns.length * 82, gridTemplateColumns: `52px repeat(${columns.length}, minmax(0, 1fr))` }} className="grid bg-[#f9fcf9]">
            <div aria-hidden="true" className="border-b border-[#dce9df] bg-[#f5faf5]" />
            {columns.map((day) => <div key={day.code} className="border-b border-l border-[#dce9df] bg-[#f5faf5] py-2 text-center text-xs font-bold text-[#102e25]">{day.label}</div>)}
            <div aria-hidden="true" style={{ height }} className="relative bg-white">
              {hours.slice(0, -1).map((hour) => <span key={hour} style={{ top: (hour - firstHour) * pixelsPerMinute + 3 }} className="absolute right-1.5 text-[10px] font-medium text-[#516f62]">{hourLabel(hour)}</span>)}
            </div>
            {columns.map((day) => (
              <div key={day.code} style={{ height }} className="relative border-l border-[#dce9df] bg-white">
                {hours.slice(0, -1).map((hour) => <div key={hour} aria-hidden="true" style={{ top: (hour - firstHour) * pixelsPerMinute }} className="pointer-events-none absolute inset-x-0 border-t border-[#e5eee7]" />)}
                {blocks.filter((block) => block.day === day.code).map((block) => {
                  const selected = selectedCode === block.course.code;
                  return (
                    <button key={block.key} type="button" aria-expanded={selected} aria-controls={`${semester.year}-${semester.term}-${encodeURIComponent(block.course.code)}-planned-details`} aria-label={`${block.course.code}, ${day.name}, ${block.meeting.startTime} to ${block.meeting.endTime}`} title={`${block.course.code} · ${block.meeting.startTime}–${block.meeting.endTime}`} onClick={() => onSelect(block.course.code)} style={{ top: (block.start - firstHour) * pixelsPerMinute, height: (block.end - block.start) * pixelsPerMinute, left: `calc(${block.lane / block.lanes * 100}% + 2px)`, width: `calc(${100 / block.lanes}% - 4px)` }} className={`absolute z-10 overflow-hidden rounded-md border p-1 text-left text-[10px] leading-tight transition hover:brightness-95 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#236a3c] ${courseColors[block.colorIndex].classes} ${selected ? "z-20 ring-2 ring-inset ring-[#236a3c]" : ""}`}>
                      <span className="block truncate text-[11px] font-extrabold">{block.course.code}</span>
                      {block.end - block.start >= 35 && <span className="mt-0.5 block truncate">{block.meeting.startTime}</span>}
                      {block.end - block.start >= 65 && (block.meeting.building || block.meeting.room) && <span className="mt-0.5 block truncate">{[block.meeting.building, block.meeting.room].filter(Boolean).join(" ")}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {sharedSlots && <p className="mt-2 text-xs text-[#516f62]">Some meetings share a weekly time slot. Check their meeting dates.</p>}
        {untimed.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-bold">Without a fixed time</h3>
            {untimed.map(({ course, reason }) => <button type="button" key={course.crn} onClick={() => onSelect(course.code)} aria-expanded={selectedCode === course.code} aria-controls={`${semester.year}-${semester.term}-${encodeURIComponent(course.code)}-planned-details`} className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-[#236a3c] ${selectedCode === course.code ? "border-[#236a3c] bg-[#eaf4ed]" : "border-[#dce9df] bg-[#f9fcf9] hover:bg-[#eaf4ed]"}`}><span className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ backgroundColor: courseColors[getCourseColorIndex(course)].swatch }} />{course.code}</span><span className="text-[#516f62]">{reason}</span></button>)}
          </div>
        )}
        {hasCourses && <p className="mt-3 text-xs text-[#516f62]">Select a class to expand its details in your plan.</p>}
      </div>
    </section>
  );
}
