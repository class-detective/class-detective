"use client";

import { useEffect, useId, useRef, useState } from "react";
import { buildComparison, sharedGaps, timeLabel, type Block, type Course, type Owner } from "./comparison";

const scheduleColors = [
  { name: "Green", swatch: "#66a77b", classes: "border-[#8db99a] bg-[#deefe2] text-[#153e2b]" },
  { name: "Blue", swatch: "#749fc4", classes: "border-[#9bb9d1] bg-[#e2edf6] text-[#24465f]" },
  { name: "Gold", swatch: "#c49b53", classes: "border-[#c9ad79] bg-[#f5ecd9] text-[#61481f]" },
  { name: "Purple", swatch: "#a18bc5", classes: "border-[#b7a4cf] bg-[#eee6f7] text-[#513a68]" },
  { name: "Teal", swatch: "#65a5a8", classes: "border-[#94bfc0] bg-[#e0f0ef] text-[#245256]" },
  { name: "Red", swatch: "#cc8583", classes: "border-[#d4a5a3] bg-[#f8e7e5] text-[#783f3d]" },
  { name: "Orange", swatch: "#d48d56", classes: "border-[#d8a47d] bg-[#fce9da] text-[#79451e]" },
  { name: "Pink", swatch: "#cb82aa", classes: "border-[#d4a0bd] bg-[#f8e6f0] text-[#793b61]" },
];

export type ScheduleColorCategory = Owner | "downtime";
export type ScheduleColorIndices = Record<ScheduleColorCategory, number>;
export const defaultScheduleColors: ScheduleColorIndices = { mine: 0, friend: 1, both: 3, downtime: 2 };

function ScheduleColorLegend({ labels, categories, colorIndices, onColorChange }: { labels: Record<ScheduleColorCategory, string>; categories: ScheduleColorCategory[]; colorIndices: ScheduleColorIndices; onColorChange: (category: ScheduleColorCategory, index: number) => void }) {
  const [open, setOpen] = useState<ScheduleColorCategory | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<ScheduleColorCategory, HTMLButtonElement | null>>>({});
  const selectedRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const active = open && categories.includes(open) ? open : null;

  useEffect(() => {
    if (!active) return;
    selectedRef.current?.focus();
    function handlePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(null);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && active) {
        setOpen(null);
        triggerRefs.current[active]?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [active]);

  return (
    <div ref={rootRef} className="relative mt-3" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null);
    }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#516f62]">
        {categories.map((category) => {
          const color = scheduleColors[colorIndices[category]];
          return (
            <div key={category} className="flex items-center gap-1">
              <button ref={(element) => { triggerRefs.current[category] = element; }} type="button" title={`Change schedule color (${color.name})`} aria-label={`Change schedule color for ${labels[category]}. Current color: ${color.name}`} aria-expanded={active === category} aria-controls={active === category ? id : undefined} onClick={() => setOpen((previous) => previous === category ? null : category)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">
                <span aria-hidden="true" style={{ backgroundColor: color.swatch }} className="h-5 w-5 rounded-full border border-black/15" />
              </button>
              <span>{labels[category]}</span>
            </div>
          );
        })}
      </div>
      {active && (
        <div id={id} role="group" aria-label={`Schedule colors for ${labels[active]}`} className="absolute left-0 top-full z-30 mt-2 w-48 max-w-full rounded-xl border border-[#dce9df] bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-[#516f62]">{labels[active]} color</p>
          <div className="grid grid-cols-4 gap-1">
            {scheduleColors.map((option, index) => (
              <button key={option.name} ref={index === colorIndices[active] ? selectedRef : undefined} type="button" title={option.name} aria-label={option.name} aria-pressed={index === colorIndices[active]} onClick={() => {
                onColorChange(active, index);
                setOpen(null);
                triggerRefs.current[active]?.focus();
              }} className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#236a3c] ${index === colorIndices[active] ? "ring-2 ring-inset ring-[#236a3c]" : ""}`}>
                <span aria-hidden="true" style={{ backgroundColor: option.swatch }} className="flex h-6 w-6 items-center justify-center rounded-full border border-black/15">
                  {index === colorIndices[active] && <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m3 8 3 3 7-7" /></svg>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function timeRangeLabel(start: number, end: number) {
  const startLabel = timeLabel(start);
  const endLabel = timeLabel(end);
  const samePeriod = startLabel.slice(-2) === endLabel.slice(-2);
  return `${samePeriod ? startLabel.slice(0, -3) : startLabel}–${endLabel}`;
}

function positionBlocks(blocks: Block[], mode: Owner) {
  if (mode !== "both") {
    return blocks.map((block) => ({ block, left: block.lane / block.lanes * 100, width: 100 / block.lanes, key: block.key }));
  }

  const positioned: { block: Block; left: number; width: number; key: string }[] = [];
  const shared = blocks.filter((block) => block.owner === "both");
  const spansDay = (block: Block) => block.owner === "both" && !blocks.some((other) => other !== block && other.day === block.day && other.start < block.end && block.start < other.end);

  for (const block of shared.filter(spansDay)) {
    positioned.push({ block, left: 0, width: 100, key: block.key });
  }

  for (const owner of ["mine", "friend"] as const) {
    const offset = owner === "mine" ? 0 : 50;
    const owned = blocks.filter((block) => block.owner === owner || (block.owner === "both" && !spansDay(block)));
    for (const day of new Set(owned.map((block) => block.day))) {
      const ordered = owned.filter((block) => block.day === day).sort((a, b) => a.start - b.start || a.end - b.end);
      let group: { block: Block; lane: number }[] = [];
      let ends: number[] = [];
      let groupEnd = -1;
      const finish = () => {
        for (const { block, lane } of group) {
          positioned.push({ block, left: offset + lane / ends.length * 50, width: 50 / ends.length, key: `${block.key}-${owner}` });
        }
        group = [];
        ends = [];
        groupEnd = -1;
      };
      for (const block of ordered) {
        if (block.start >= groupEnd) finish();
        let lane = ends.findIndex((end) => end <= block.start);
        if (lane < 0) lane = ends.length;
        ends[lane] = block.end;
        group.push({ block, lane });
        groupEnd = Math.max(groupEnd, block.end);
      }
      finish();
    }
  }
  return positioned;
}

export default function ComparisonSchedule({ mine, friend, mode, friendName, colorIndices, onColorChange }: { mine: Course[]; friend: Course[]; mode: Owner; friendName: string; colorIndices: ScheduleColorIndices; onColorChange: (category: ScheduleColorCategory, index: number) => void }) {
  const { blocks, columns, firstHour, lastHour } = buildComparison(mine, friend, mode);
  const positioned = positionBlocks(blocks, mode);
  const gaps = mode === "both" ? sharedGaps(mine, friend) : [];
  const scale = 0.95;
  const hours = Array.from({ length: (lastHour - firstHour) / 60 }, (_, i) => firstHour + i * 60);
  const height = (lastHour - firstHour) * scale;
  const downtimeColor = `border-dashed ${scheduleColors[colorIndices.downtime].classes}`;
  const ownerLabel = { mine: "Your class", friend: `${friendName}'s class`, both: "Same section", downtime: "Shared downtime" };
  const categories: ScheduleColorCategory[] = mode === "both" ? ["mine", "friend", "both", "downtime"] : [mode];
  return <>
      <ScheduleColorLegend labels={ownerLabel} categories={categories} colorIndices={colorIndices} onColorChange={onColorChange} />
      {!blocks.length ? <p className="mt-5 rounded-xl bg-[#f5faf5] p-5 text-sm text-[#516f62]">No scheduled meetings to display.</p> : <div className="mt-4 overflow-x-auto rounded-xl border border-[#dce9df]"><div className="grid bg-[#f9fcf9]" style={{ minWidth: 52 + columns.length * (mode === "both" ? 192 : 100), gridTemplateColumns: `52px repeat(${columns.length}, minmax(0,1fr))` }}>
        <div className="border-b border-[#dce9df] bg-[#f5faf5]" />
        {columns.map((day) => <div key={day} className="border-b border-l border-[#dce9df] bg-[#f5faf5] py-2 text-center text-xs font-bold">{day}</div>)}
        <div className="relative bg-white" style={{ height }}>{hours.map((hour) => <span key={hour} className="absolute right-1.5 text-[10px] font-medium text-[#516f62]" style={{ top: (hour - firstHour) * scale + 3 }}>{timeLabel(hour).replace(":00", "")}</span>)}</div>
        {columns.map((day) => <div key={day} className="relative border-l border-[#dce9df] bg-white" style={{ height }}>
          {hours.map((hour) => <div key={hour} className="pointer-events-none absolute inset-x-0 border-t border-[#e5eee7]" style={{ top: (hour - firstHour) * scale }} />)}
          {mode === "both" && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-[#e5eee7]" />}
          {gaps.filter((gap) => gap.day === day).map((gap) => {
            const duration = gap.end - gap.start;
            const label = `Shared downtime · ${day} · ${timeLabel(gap.start)}–${timeLabel(gap.end)} (${duration} min)`;
            return <div key={`gap-${day}-${gap.start}`} title={label} role="img" aria-label={label} className={`absolute inset-x-[2px] overflow-hidden rounded-md border ${downtimeColor}`} style={{ top: (gap.start - firstHour) * scale, height: duration * scale }}>
              {duration >= 22 && <div className="p-1 text-[10px] leading-tight"><span className="block truncate font-bold">Shared downtime</span>{duration >= 36 && <span className="block truncate">{duration} min</span>}{duration >= 58 && <span className="block truncate">{timeLabel(gap.start)}–{timeLabel(gap.end)}</span>}</div>}
            </div>;
          })}
          {positioned.filter(({ block }) => block.day === day).map(({ block: b, left, width, key }) => <a key={key} href={`/courses/${encodeURIComponent(b.course.code.trim().replace(/\s+/g, "-"))}`} target="_blank" rel="noopener noreferrer" title={`${b.course.code} · ${ownerLabel[b.owner]} · ${timeLabel(b.start)}–${timeLabel(b.end)} · View course details (opens in a new tab)`} aria-label={`${b.course.code}, ${ownerLabel[b.owner]}, ${day}, ${timeLabel(b.start)} to ${timeLabel(b.end)}. View course details (opens in a new tab)`} className={`absolute block cursor-pointer overflow-hidden rounded-md border p-1 text-[10px] leading-tight transition hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#236a3c] ${scheduleColors[colorIndices[b.owner]].classes}`} style={{ top: (b.start - firstHour) * scale, height: (b.end - b.start) * scale, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}><span className="block truncate text-[11px] font-extrabold">{b.course.code}</span>{b.end-b.start>=35 && <span className="block text-[10px] leading-[11px]">{timeRangeLabel(b.start, b.end)}</span>}</a>)}
        </div>)}
      </div></div>}
  </>;
}
