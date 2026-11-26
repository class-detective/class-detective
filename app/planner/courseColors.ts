import type { PlannedCourse } from "./types";

export const courseColors = [
  { name: "Green", swatch: "#66a77b", classes: "border-[#8db99a] bg-[#deefe2] text-[#153e2b]" },
  { name: "Blue", swatch: "#749fc4", classes: "border-[#9bb9d1] bg-[#e2edf6] text-[#24465f]" },
  { name: "Gold", swatch: "#c49b53", classes: "border-[#c9ad79] bg-[#f5ecd9] text-[#61481f]" },
  { name: "Purple", swatch: "#a18bc5", classes: "border-[#b7a4cf] bg-[#eee6f7] text-[#513a68]" },
  { name: "Teal", swatch: "#65a5a8", classes: "border-[#94bfc0] bg-[#e0f0ef] text-[#245256]" },
  { name: "Red", swatch: "#cc8583", classes: "border-[#d4a5a3] bg-[#f8e7e5] text-[#783f3d]" },
  { name: "Orange", swatch: "#d48d56", classes: "border-[#d8a47d] bg-[#fce9da] text-[#79451e]" },
  { name: "Pink", swatch: "#cb82aa", classes: "border-[#d4a0bd] bg-[#f8e6f0] text-[#793b61]" },
];

export function isCourseColorIndex(value: number | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < courseColors.length;
}

export function getCourseColorIndex(course: Pick<PlannedCourse, "colorIndex">, fallback = 0) {
  return isCourseColorIndex(course.colorIndex) ? course.colorIndex : fallback % courseColors.length;
}

export function assignCourseColors(courses: PlannedCourse[]): PlannedCourse[] {
  const used = new Set(courses.filter((course) => course.status === "scheduled" && isCourseColorIndex(course.colorIndex)).map((course) => course.colorIndex));
  return courses.map((course, index) => {
    if (course.status !== "scheduled" || isCourseColorIndex(course.colorIndex)) return course;
    const available = courseColors.findIndex((_, colorIndex) => !used.has(colorIndex));
    const colorIndex = available === -1 ? index % courseColors.length : available;
    used.add(colorIndex);
    return { ...course, colorIndex };
  });
}
