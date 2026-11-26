import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/sessions";
import UploadContent from "./UploadContent";

export const metadata: Metadata = {
  title: "Upload Transcript | Class Detective",
  description: "Preview your academic transcript in Class Detective.",
};

export default function UploadPage() {
  return (
    <Suspense fallback={<UploadLoading />}>
      <AuthenticatedUpload />
    </Suspense>
  );
}

function UploadLoading() {
  return (
    <main className="flex w-full flex-1 items-center justify-center bg-[#f0f6f1] px-6 py-24 text-[#516f62]">
      <p role="status">Loading transcript upload...</p>
    </main>
  );
}

async function AuthenticatedUpload() {
  const token = (await cookies()).get("class_detective_session")?.value ?? null;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return <UploadContent />;
}
