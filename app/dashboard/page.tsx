import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/sessions";
import DashboardContent from "./DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | Class Detective",
  description: "See your academic progress and account overview in Class Detective.",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AuthenticatedDashboard />
    </Suspense>
  );
}

function DashboardLoading() {
  return (
    <main className="flex w-full flex-1 items-center justify-center bg-[#f0f6f1] px-6 py-24 text-[#516f62]">
      <p role="status">Loading your dashboard...</p>
    </main>
  );
}

async function AuthenticatedDashboard() {
  const token = (await cookies()).get("class_detective_session")?.value ?? null;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return <DashboardContent />;
}
