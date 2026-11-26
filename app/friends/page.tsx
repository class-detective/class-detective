import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/sessions";
import FriendsContent from "./FriendsContent";

export const metadata: Metadata = {
  title: "Friends | Class Detective",
  description: "Connect with friends and manage your friend requests.",
};

export default function FriendsPage() {
  return (
    <Suspense fallback={<main className="flex w-full flex-1 items-center justify-center bg-[#f0f6f1] px-6 py-24 text-[#516f62]"><p role="status">Loading friends...</p></main>}>
      <AuthenticatedFriends />
    </Suspense>
  );
}

async function AuthenticatedFriends() {
  const token = (await cookies()).get("class_detective_session")?.value ?? null;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return <FriendsContent />;
}
