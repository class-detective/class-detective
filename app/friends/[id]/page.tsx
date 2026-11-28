import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/sessions";
import FriendContent from "./FriendContent";
import { loadFriendPlans } from "./friendPlanLoader";
import { friendRouteKey } from "./friendPlanService";

export const metadata: Metadata = { title: "Friend | Class Detective", description: "Compare semester plans with a friend." };

type Props = { params: Promise<{ id: string }> };

export default function FriendPage({ params }: Props) {
  return <Suspense fallback={<main className="flex w-full flex-1 items-center justify-center bg-[#f0f6f1] px-6 py-24 text-[#516f62]"><p role="status">Loading friend...</p></main>}><AuthenticatedFriend params={params} /></Suspense>;
}

async function AuthenticatedFriend({ params }: Props) {
  const token = (await cookies()).get("class_detective_session")?.value ?? null;
  const session = await verifySessionToken(token);
  if (!session) redirect("/login");
  const { id } = await params;
  const preview = await loadFriendPlans(String(session.userId), id);
  if (!preview) notFound();
  const slug = friendRouteKey(preview.profile);
  if (id !== slug) redirect(`/friends/${encodeURIComponent(slug)}`);
  return <FriendContent key={preview.profile.id} initialSnapshot={preview} />;
}
