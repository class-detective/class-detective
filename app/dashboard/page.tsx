import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/sessions";
import DashboardContent from "./DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | Class Detective",
  description: "See your academic progress and account overview in Class Detective.",
};

export default async function DashboardPage() {
  const token = (await cookies()).get("class_detective_session")?.value ?? null;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return <DashboardContent />;
}
