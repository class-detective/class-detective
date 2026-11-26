import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/sessions";
import PlannerContent from "./PlannerContent";

export const metadata: Metadata = {
  title: "Course Planner | Class Detective",
  description: "Organize your upcoming semesters and plan your courses.",
};

export default function PlannerPage() {
  return (
    <Suspense fallback={<PlannerLoading />}>
      <AuthenticatedPlanner />
    </Suspense>
  );
}

function PlannerLoading() {
  return (
    <main className="flex w-full flex-1 items-center justify-center bg-[#f0f6f1] px-6 py-24 text-[#516f62]">
      <p role="status">Loading your course planner...</p>
    </main>
  );
}

async function AuthenticatedPlanner() {
  const token = (await cookies()).get("class_detective_session")?.value ?? null;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return <PlannerContent />;
}
