"use client";

import { useEffect, useId, useRef, useState } from "react";
import { courseColors } from "./courseColors";

type CourseColorPickerProps = {
  code: string;
  colorIndex: number;
  onChange: (colorIndex: number) => void;
};

export default function CourseColorPicker({ code, colorIndex, onChange }: CourseColorPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const color = courseColors[colorIndex];

  useEffect(() => {
    if (!open) return;
    selectedRef.current?.focus();
    function handlePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={triggerRef} type="button" title={`Change schedule color (${color.name})`} aria-label={`Change schedule color for ${code}. Current color: ${color.name}`} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">
        <span aria-hidden="true" style={{ backgroundColor: color.swatch }} className="h-5 w-5 rounded-full border border-black/15" />
      </button>
      {open && (
        <div id={id} role="group" aria-label={`Schedule colors for ${code}`} className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-[#dce9df] bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-[#516f62]">Course color</p>
          <div className="grid grid-cols-4 gap-1">
            {courseColors.map((option, index) => (
              <button key={option.name} ref={index === colorIndex ? selectedRef : undefined} type="button" title={option.name} aria-label={option.name} aria-pressed={index === colorIndex} onClick={() => {
                onChange(index);
                setOpen(false);
                triggerRef.current?.focus();
              }} className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#236a3c] ${index === colorIndex ? "ring-2 ring-inset ring-[#236a3c]" : ""}`}>
                <span aria-hidden="true" style={{ backgroundColor: option.swatch }} className="flex h-6 w-6 items-center justify-center rounded-full border border-black/15">
                  {index === colorIndex && <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="m3 8 3 3 7-7" /></svg>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
