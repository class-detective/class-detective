import { Suspense } from "react";
import CourseInfo from "@/components/CourseInfo";

// /courses/ICS-314
// The course code is only known when someone visits, so the page content
// sits inside <Suspense> (required with cacheComponents, or the build fails).
export default function CourseInfoPage({
  params,
}: {
  params: Promise<{ courseKey: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="w-full flex-1 bg-[#f0f6f1] px-5 py-10 text-[#557166] sm:px-8 lg:px-12 lg:py-14">
          <p className="mx-auto max-w-5xl">Loading course…</p>
        </main>
      }
    >
      <CourseInfo params={params} />
    </Suspense>
  );
}
